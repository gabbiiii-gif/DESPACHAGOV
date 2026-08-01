-- ─── DespachaGov · Migration 0021 — Exclusão de dados pelo titular (LGPD 18,VI) ─
-- Fecha a lacuna auditada em 2026-07-28: não existia forma de o titular exercer
-- o direito à eliminação. A tela "Meus dados" só oferecia portabilidade e dizia
-- para "solicitar ao administrador" — processo manual, fora do sistema, sem prazo
-- e sem prova de execução.
--
-- ── POR QUE ANONIMIZAR EM VEZ DE APAGAR ────────────────────────────────────────
-- Um hard delete em auth.users cascateia para public.users e lgpd_consents
-- (ambos ON DELETE CASCADE) e zera solicitante_id/ator_id nos chamados
-- (ON DELETE SET NULL). Isso destruiria:
--   a) a prova de que houve consentimento válido (accountability, art. 37); e
--   b) a autoria dos chamados de manutenção — que são registro de obra pública,
--      retido sob o art. 16, I (cumprimento de obrigação legal pelo controlador).
-- A anonimização corta o vínculo com a pessoa natural preservando o registro
-- público. O dado deixa de ser pessoal (art. 5º, III) e sai do escopo da Lei.
--
-- ── O NOME ESTAVA EM TRÊS LUGARES ──────────────────────────────────────────────
-- chamados.solicitante_nome e chamado_eventos.ator_nome são cópias
-- desnormalizadas do nome, gravadas no momento da abertura/transição
-- (src/services/chamados.ts:41-52). Anonimizar só public.users deixaria o nome
-- do titular visível em toda a listagem de chamados. Os três são tratados juntos.
--
-- ── O QUE É PRESERVADO E POR QUÊ ───────────────────────────────────────────────
-- - lgpd_consents: mantém versao_termo e aceito_em (prova de que houve base
--   legal), mas zera ip e user_agent (identificadores do titular).
-- - assinaturas: NÃO é tocada. O atesto de conclusão de serviço público é
--   documento com signatário próprio (signatario_nome é texto livre, sem FK a
--   users) e valor probatório autônomo — art. 16, I. Anonimizá-lo por
--   coincidência de nome seria incorreto e destruiria atesto de terceiros.

-- ─── Marca de anonimização ───────────────────────────────────────────────────
alter table public.users
  add column if not exists anonimizado_em timestamptz;

comment on column public.users.anonimizado_em is
  'Quando o titular exerceu o direito de eliminação (LGPD art. 18, VI). Não-nulo = conta anonimizada e inativa.';

-- ─── Trilha de auditoria da exclusão ─────────────────────────────────────────
-- Sem FK para users: o registro precisa sobreviver a uma remoção futura da
-- linha do titular. O user_id vira pseudônimo — não resolve mais para pessoa.
create table if not exists public.exclusao_dados_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id uuid,
  papel text not null,
  versoes_termo text[] not null default '{}',
  solicitado_em timestamptz not null default now()
);
create index if not exists exclusao_dados_log_tenant_idx
  on public.exclusao_dados_log (tenant_id, solicitado_em desc);

alter table public.exclusao_dados_log enable row level security;

-- Ninguém escreve pelo PostgREST: só a função SECURITY DEFINER abaixo, chamada
-- pela Edge Function com service_role (que ignora RLS).
drop policy if exists exclusao_log_select on public.exclusao_dados_log;
create policy exclusao_log_select on public.exclusao_dados_log
  for select to authenticated
  using (
    public.is_superadmin()
    or (tenant_id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria')
  );

-- ─── Anonimização atômica ────────────────────────────────────────────────────
-- SECURITY DEFINER pelo mesmo motivo de 0012_ai_rate_limit: precisa escrever em
-- tabelas de outros tenants (o titular pode ser de qualquer um) sem depender das
-- claims do chamador. O grant é revogado de anon/authenticated logo abaixo —
-- só service_role executa, e a Edge Function já validou que o chamador é o
-- próprio titular antes de chegar aqui.
create or replace function public.anonimizar_titular(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       public.users%rowtype;
  v_versoes    text[];
  v_chamados   integer;
  v_eventos    integer;
begin
  -- Defesa em profundidade. O grant é revogado de anon/authenticated no fim
  -- deste arquivo e a Edge Function já valida o chamador, mas SECURITY DEFINER
  -- em `public` é um endpoint público por padrão: o Postgres concede EXECUTE a
  -- PUBLIC no momento da criação, e anon/authenticated herdam de PUBLIC. Se um
  -- grant futuro reabrir a função — ou se o revoke for esquecido num rebuild —,
  -- sem esta checagem qualquer usuário autenticado poderia anonimizar QUALQUER
  -- outro passando um p_user_id arbitrário.
  --
  -- service_role chama sem JWT de usuário, então auth.uid() é null e a condição
  -- não dispara. Usuário autenticado só passa se o alvo for ele mesmo.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'apenas o próprio titular pode excluir seus dados'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_user from public.users where id = p_user_id;
  if not found then
    raise exception 'titular não encontrado' using errcode = 'no_data_found';
  end if;

  if v_user.anonimizado_em is not null then
    raise exception 'conta já anonimizada' using errcode = 'invalid_parameter_value';
  end if;

  -- Superadmin não se auto-exclui: é a única conta capaz de administrar tenants
  -- e recuperar o sistema. Perder a última derruba a operação inteira.
  if v_user.role = 'superadmin' then
    raise exception 'superadmin não pode se autoexcluir' using errcode = 'insufficient_privilege';
  end if;

  -- Último admin_secretaria em pé deixaria a Secretaria sem quem cadastre
  -- usuários, unidades e empresas — tenant órfão, sem caminho de volta pela UI.
  if v_user.role = 'admin_secretaria' and exists (
    select 1 from public.tenants t where t.id = v_user.tenant_id
  ) then
    if (
      select count(*) from public.users u
       where u.tenant_id = v_user.tenant_id
         and u.role = 'admin_secretaria'
         and u.ativo = true
         and u.anonimizado_em is null
    ) <= 1 then
      raise exception 'último administrador da secretaria não pode se autoexcluir'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Versões aceitas, preservadas na trilha antes de mexer no consentimento.
  select coalesce(array_agg(distinct c.versao_termo), '{}')
    into v_versoes
    from public.lgpd_consents c
   where c.user_id = p_user_id;

  -- 1) Identidade do titular.
  update public.users
     set nome           = 'Titular removido',
         email          = 'anonimizado+' || p_user_id::text || '@removido.invalid',
         cpf            = null,
         telefone       = null,
         cargo          = null,
         matricula      = null,
         ativo          = false,
         anonimizado_em = now()
   where id = p_user_id;

  -- 2) Cópias desnormalizadas do nome.
  update public.chamados
     set solicitante_nome = 'Titular removido'
   where solicitante_id = p_user_id;
  get diagnostics v_chamados = row_count;

  update public.chamado_eventos
     set ator_nome = 'Titular removido'
   where ator_id = p_user_id;
  get diagnostics v_eventos = row_count;

  -- 3) Consentimento: preserva a prova, remove os identificadores.
  update public.lgpd_consents
     set ip = null, user_agent = null
   where user_id = p_user_id;

  -- 4) Vínculo de responsável por unidade.
  update public.unidades
     set responsavel_user_id = null
   where responsavel_user_id = p_user_id;

  insert into public.exclusao_dados_log (user_id, tenant_id, papel, versoes_termo)
  values (p_user_id, v_user.tenant_id, v_user.role::text, v_versoes);

  return jsonb_build_object(
    'ok', true,
    'chamados_anonimizados', v_chamados,
    'eventos_anonimizados', v_eventos,
    'versoes_termo', v_versoes
  );
end;
$$;

revoke all on function public.anonimizar_titular(uuid) from public, anon, authenticated;
