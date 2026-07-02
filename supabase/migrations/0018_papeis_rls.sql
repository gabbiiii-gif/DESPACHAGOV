-- ─── DespachaGov · Migration 0018 — RLS dos papéis novos ────────────────────
-- Expande as policies para os papéis criados em 0017. Comparações usam
-- current_app_role() (TEXT), então não dependem do enum. Conjuntos:
--   CADASTRO_WRITE     = admin_secretaria, engenheiro, arquiteto
--   CHAMADO_SEC        = admin_secretaria, gestor_secretaria, engenheiro, arquiteto
--   secretaria_semed   = só em SELECT (nunca escreve)
--   EMPRESA_ALL        = empresa_admin, tecnico_empresa + 4 papéis de empresa
--   EMPRESA_ADMIN_LIKE = empresa_admin + 4 papéis de empresa
-- users_admin_* NÃO muda (só admin_secretaria) — é o que separa Chefe de Eng/Arq.

-- ─── tenants: Chefe/Eng/Arq atualizam o próprio tenant ───────────────────────
drop policy if exists tenants_admin_update on public.tenants;
create policy tenants_admin_update on public.tenants
  for update to authenticated
  using (id = public.current_tenant_id()
         and public.current_app_role() in ('admin_secretaria','engenheiro','arquiteto'))
  with check (id = public.current_tenant_id());

-- ─── cadastros: escrita p/ CADASTRO_WRITE ────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['unidades','empresas','equipamentos','tecnicos','contratos']
  loop
    execute format('drop policy if exists %1$s_admin_all on public.%1$s;', t);
    execute format($f$
      create policy %1$s_admin_all on public.%1$s
        for all to authenticated
        using ((tenant_id = public.current_tenant_id()
                and public.current_app_role() in ('admin_secretaria','engenheiro','arquiteto'))
               or public.is_superadmin())
        with check ((tenant_id = public.current_tenant_id()
                and public.current_app_role() in ('admin_secretaria','engenheiro','arquiteto'))
               or public.is_superadmin());
    $f$, t);
  end loop;
end $$;

-- storage de contratos: insert/delete p/ CADASTRO_WRITE
drop policy if exists contratos_storage_insert on storage.objects;
create policy contratos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_app_role() in ('admin_secretaria','engenheiro','arquiteto')
  );

drop policy if exists contratos_storage_delete on storage.objects;
create policy contratos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_app_role() in ('admin_secretaria','engenheiro','arquiteto')
  );

-- ─── chamados ────────────────────────────────────────────────────────────────
drop policy if exists chamados_select on public.chamados;
create policy chamados_select on public.chamados
  for select to authenticated
  using (
    public.is_superadmin()
    or (tenant_id = public.current_tenant_id()
        and public.current_app_role() in
          ('admin_secretaria','gestor_secretaria','engenheiro','arquiteto','secretaria_semed'))
    or (empresa_id = public.current_empresa_id()
        and public.current_app_role() in
          ('empresa_admin','tecnico_empresa','manutencao_predial','manutencao_refrigeracao',
           'manutencao_ar_condicionado','instalacao_ar_condicionado'))
    or solicitante_id = auth.uid()
  );

drop policy if exists chamados_insert on public.chamados;
create policy chamados_insert on public.chamados
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and solicitante_id = auth.uid()
    and public.current_app_role() in
      ('responsavel_unidade','admin_secretaria','gestor_secretaria','engenheiro','arquiteto')
  );

drop policy if exists chamados_update_secretaria on public.chamados;
create policy chamados_update_secretaria on public.chamados
  for update to authenticated
  using (tenant_id = public.current_tenant_id()
         and public.current_app_role() in
           ('admin_secretaria','gestor_secretaria','engenheiro','arquiteto'))
  with check (tenant_id = public.current_tenant_id());

drop policy if exists chamados_update_empresa on public.chamados;
create policy chamados_update_empresa on public.chamados
  for update to authenticated
  using (empresa_id = public.current_empresa_id()
         and public.current_app_role() in
           ('empresa_admin','tecnico_empresa','manutencao_predial','manutencao_refrigeracao',
            'manutencao_ar_condicionado','instalacao_ar_condicionado'))
  with check (empresa_id = public.current_empresa_id());

-- ─── eventos ─────────────────────────────────────────────────────────────────
drop policy if exists eventos_select on public.chamado_eventos;
create policy eventos_select on public.chamado_eventos
  for select to authenticated
  using (
    public.is_superadmin()
    or exists (
      select 1 from public.chamados c
      where c.id = chamado_id
        and (
          (c.tenant_id = public.current_tenant_id()
           and public.current_app_role() in
             ('admin_secretaria','gestor_secretaria','engenheiro','arquiteto','secretaria_semed'))
          or (c.empresa_id = public.current_empresa_id())
          or c.solicitante_id = auth.uid()
        )
    )
  );

drop policy if exists eventos_insert on public.chamado_eventos;
create policy eventos_insert on public.chamado_eventos
  for insert to authenticated
  with check (
    ator_id = auth.uid()
    and exists (
      select 1 from public.chamados c
      where c.id = chamado_id
        and (
          (c.tenant_id = public.current_tenant_id()
           and public.current_app_role() in
             ('admin_secretaria','gestor_secretaria','engenheiro','arquiteto'))
          or (c.empresa_id = public.current_empresa_id())
          or c.solicitante_id = auth.uid()
        )
    )
  );

-- ─── anexos / assinaturas ────────────────────────────────────────────────────
-- pode_acessar_chamado porteia SELECT e INSERT: engenheiro/arquiteto entram aqui
-- (agem como secretaria). SEMED NÃO entra (senão poderia inserir) — lê por cláusula
-- extra só nas policies de SELECT abaixo.
create or replace function public.pode_acessar_chamado(p_chamado_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chamados c
    where c.id = p_chamado_id
      and (
        public.is_superadmin()
        or (c.tenant_id = public.current_tenant_id()
            and public.current_app_role() in
              ('admin_secretaria','gestor_secretaria','engenheiro','arquiteto'))
        or (c.empresa_id = public.current_empresa_id())
        or c.solicitante_id = auth.uid()
      )
  )
$$;
revoke execute on function public.pode_acessar_chamado(uuid) from anon;

drop policy if exists anexos_select on public.chamado_anexos;
create policy anexos_select on public.chamado_anexos
  for select to authenticated
  using (
    public.pode_acessar_chamado(chamado_id)
    or exists (
      select 1 from public.chamados c
      where c.id = chamado_id
        and c.tenant_id = public.current_tenant_id()
        and public.current_app_role() = 'secretaria_semed'
    )
  );

drop policy if exists assinaturas_select on public.assinaturas;
create policy assinaturas_select on public.assinaturas
  for select to authenticated
  using (
    public.pode_acessar_chamado(chamado_id)
    or exists (
      select 1 from public.chamados c
      where c.id = chamado_id
        and c.tenant_id = public.current_tenant_id()
        and public.current_app_role() = 'secretaria_semed'
    )
  );

-- ─── notificacoes (leitura de auditoria) ─────────────────────────────────────
drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes
  for select to authenticated
  using (
    public.is_superadmin()
    or (tenant_id = public.current_tenant_id()
        and public.current_app_role() in
          ('admin_secretaria','gestor_secretaria','engenheiro','arquiteto','secretaria_semed'))
  );

-- ─── tecnicos: gestão pela empresa (EMPRESA_ADMIN_LIKE) ──────────────────────
drop policy if exists tecnicos_empresa_admin_all on public.tecnicos;
create policy tecnicos_empresa_admin_all on public.tecnicos
  for all to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_app_role() in
      ('empresa_admin','manutencao_predial','manutencao_refrigeracao',
       'manutencao_ar_condicionado','instalacao_ar_condicionado')
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_app_role() in
      ('empresa_admin','manutencao_predial','manutencao_refrigeracao',
       'manutencao_ar_condicionado','instalacao_ar_condicionado')
  );
