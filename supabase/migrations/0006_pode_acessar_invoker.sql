-- ─── DespachaGov · Migration 0006 — pode_acessar_chamado vira SECURITY INVOKER ─
-- RECONSTRUÍDA EM 2026-07-28. Aplicada em produção em 2026-06-24
-- (version 20260624044751) mas o arquivo nunca foi versionado. É a migration
-- citada em 0018_papeis_rls.sql:142 ("mantém SECURITY INVOKER — 0006 endureceu
-- isto"), o que prova que existiu e que seu efeito é carregado até hoje.
--
-- Conteúdo derivado do estado real do banco:
--   select prosecdef from pg_proc where proname = 'pode_acessar_chamado';
--   → false (INVOKER), enquanto 0005_execucao_campo.sql:39 a criou como
--     `security definer`. Esta é exatamente a diferença que 0006 introduziu.
--
-- POR QUE IMPORTA (a razão de ser desta migration):
-- A função é usada nas policies de chamado_anexos e assinaturas. Como
-- SECURITY DEFINER ela executava com os privilégios do owner, ignorando a RLS
-- de public.chamados no select interno. Efeito: qualquer authenticated podia
-- provar acesso a um chamado de OUTRO tenant se adivinhasse o UUID, porque o
-- `select 1 from public.chamados` de dentro da função não era filtrado.
-- Como SECURITY INVOKER a leitura passa a respeitar a RLS de quem chamou, e o
-- isolamento multi-tenant volta a valer dentro da função.
--
-- O corpo abaixo é o de 0005 (papéis da época: admin_secretaria/gestor_secretaria).
-- 0018_papeis_rls.sql depois amplia a lista com engenheiro/arquiteto — por isso
-- o estado atual em produção difere deste. Manter o corpo histórico aqui é o
-- correto: cada migration registra o que fez no seu momento.

create or replace function public.pode_acessar_chamado(p_chamado_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.chamados c
    where c.id = p_chamado_id
      and (
        public.is_superadmin()
        or (c.tenant_id = public.current_tenant_id() and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
        or (c.empresa_id = public.current_empresa_id())
        or c.solicitante_id = auth.uid()
      )
  )
$$;
revoke execute on function public.pode_acessar_chamado(uuid) from anon;
