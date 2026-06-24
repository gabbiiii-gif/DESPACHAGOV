-- ─── DespachaGov · Migration 0011 — empresa_admin gerencia próprios técnicos ──
-- A macro de 0002 só dá write de tecnicos à secretaria. Aqui o empresa_admin
-- passa a fazer ALL nos técnicos da PRÓPRIA empresa (policy permissiva, OR).

create policy tecnicos_empresa_admin_all on public.tecnicos
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and empresa_id = public.current_empresa_id()
    and public.current_app_role() = 'empresa_admin'
  )
  with check (
    tenant_id = public.current_tenant_id()
    and empresa_id = public.current_empresa_id()
    and public.current_app_role() = 'empresa_admin'
  );
