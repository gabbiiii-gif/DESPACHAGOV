-- ─── DespachaGov · Migration 0003 — Chamados (núcleo) ───────────────────────
-- chamados + chamado_eventos (timeline). Protocolo sequencial. RLS por papel.
-- Vínculo de usuários a empresa/unidade (p/ escopo de empresa_admin/responsável).

-- Claim de empresa (p/ empresa_admin / tecnico_empresa). Lido do app_metadata.
create or replace function public.current_empresa_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
$$;

-- Vínculos opcionais no perfil (escopo de papéis).
alter table public.users add column if not exists empresa_id uuid references public.empresas (id) on delete set null;
alter table public.users add column if not exists unidade_id uuid references public.unidades (id) on delete set null;

-- Protocolo global sequencial: AAAA-000123.
create sequence if not exists public.chamado_protocolo_seq;

create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  unidade_id uuid not null references public.unidades (id) on delete restrict,
  equipamento_id uuid references public.equipamentos (id) on delete set null,
  contrato_id uuid references public.contratos (id) on delete set null,
  empresa_id uuid references public.empresas (id) on delete set null,
  tecnico_id uuid references public.tecnicos (id) on delete set null,
  numero_protocolo text not null unique
    default to_char(now(), 'YYYY') || '-' || lpad(nextval('public.chamado_protocolo_seq')::text, 6, '0'),
  urgencia text not null default 'media' check (urgencia in ('baixa','media','alta','critica')),
  categoria text,
  status text not null default 'aberto' check (status in ('aberto','atribuido','em_campo','concluido','cancelado')),
  descricao text not null,
  solicitante_id uuid references auth.users (id) on delete set null,
  solicitante_nome text,
  data_solicitacao timestamptz not null default now(),
  data_atribuicao timestamptz,
  data_atendimento timestamptz,
  data_conclusao timestamptz,
  sla_horas integer,
  ai_urgencia_sugerida text,
  ai_categoria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chamados_tenant_idx on public.chamados (tenant_id);
create index chamados_unidade_idx on public.chamados (unidade_id);
create index chamados_empresa_idx on public.chamados (empresa_id);
create index chamados_status_idx on public.chamados (tenant_id, status);
create trigger chamados_set_updated_at before update on public.chamados
  for each row execute function public.set_updated_at();

create table public.chamado_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  evento text not null,
  ator_id uuid references auth.users (id) on delete set null,
  ator_nome text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index chamado_eventos_chamado_idx on public.chamado_eventos (chamado_id, created_at);

alter table public.chamados enable row level security;
alter table public.chamado_eventos enable row level security;

-- ─── RLS chamados ────────────────────────────────────────────────────────────
-- Leitura: superadmin tudo; secretaria (admin/gestor) tudo do tenant;
-- empresa (admin/tecnico) só da sua empresa; responsável/técnico interno só os seus.
create policy chamados_select on public.chamados
  for select to authenticated
  using (
    public.is_superadmin()
    or (tenant_id = public.current_tenant_id() and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
    or (empresa_id = public.current_empresa_id() and public.current_app_role() in ('empresa_admin','tecnico_empresa'))
    or solicitante_id = auth.uid()
  );

-- Abertura: responsável da unidade (ou secretaria) cria no próprio tenant.
create policy chamados_insert on public.chamados
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and solicitante_id = auth.uid()
    and public.current_app_role() in ('responsavel_unidade','admin_secretaria','gestor_secretaria')
  );

-- Atualização: secretaria (atribui/encerra) no tenant; empresa nos seus chamados.
create policy chamados_update_secretaria on public.chamados
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
  with check (tenant_id = public.current_tenant_id());

create policy chamados_update_empresa on public.chamados
  for update to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_app_role() in ('empresa_admin','tecnico_empresa'))
  with check (empresa_id = public.current_empresa_id());

-- ─── RLS eventos ─────────────────────────────────────────────────────────────
create policy eventos_select on public.chamado_eventos
  for select to authenticated
  using (
    public.is_superadmin()
    or exists (
      select 1 from public.chamados c
      where c.id = chamado_id
        and (
          (c.tenant_id = public.current_tenant_id() and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
          or (c.empresa_id = public.current_empresa_id())
          or c.solicitante_id = auth.uid()
        )
    )
  );

create policy eventos_insert on public.chamado_eventos
  for insert to authenticated
  with check (
    ator_id = auth.uid()
    and exists (
      select 1 from public.chamados c
      where c.id = chamado_id
        and (
          (c.tenant_id = public.current_tenant_id() and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
          or (c.empresa_id = public.current_empresa_id())
          or c.solicitante_id = auth.uid()
        )
    )
  );
