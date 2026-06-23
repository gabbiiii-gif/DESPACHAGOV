-- ─── DespachaGov · Migration 0001 — Fundação Auth + Multi-tenant ─────────────
-- Tabelas: tenants, users, lgpd_consents.
-- Claims do JWT vêm de auth.users.app_metadata { role, tenant_id } (setado
-- server-side por Edge Function com service_role). RLS lê via helpers abaixo.
-- Nota: prompt pediu auth.tenant_id(); usamos public.current_tenant_id() para
-- não tocar no schema auth (boa prática Supabase).

-- ─── Helpers de claim (lêem o JWT, sem acessar tabelas) ──────────────────────
create or replace function public.current_tenant_id()
returns uuid language sql stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid
$$;

create or replace function public.current_app_role()
returns text language sql stable
set search_path = ''
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'superadmin'
$$;

-- ─── Enum de papéis ──────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum (
    'superadmin',
    'admin_secretaria',
    'gestor_secretaria',
    'responsavel_unidade',
    'tecnico_secretaria',
    'empresa_admin',
    'tecnico_empresa'
  );
exception when duplicate_object then null; end $$;

-- ─── Trigger updated_at ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── tenants ─────────────────────────────────────────────────────────────────
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome_secretaria text not null,
  cnpj text,
  municipio text,
  estado text check (estado is null or char_length(estado) = 2),
  subdomain text not null unique,
  status text not null default 'ativo' check (status in ('ativo','suspenso','cancelado')),
  contrato_vigencia_inicio date,
  contrato_vigencia_fim date,
  valor_mensal numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_subdomain_idx on public.tenants (subdomain);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- ─── users (perfil de aplicação, 1:1 com auth.users) ─────────────────────────
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade, -- null p/ superadmin
  role public.user_role not null,
  nome text not null,
  cpf text,
  email text not null,
  telefone text,
  cargo text,
  matricula text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_tenant_id_idx on public.users (tenant_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ─── lgpd_consents (aceite de termos no onboarding) ──────────────────────────
create table public.lgpd_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  versao_termo text not null,
  aceito_em timestamptz not null default now(),
  ip text,
  user_agent text
);
create index lgpd_consents_user_idx on public.lgpd_consents (user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.lgpd_consents enable row level security;

-- tenants: superadmin gerencia tudo; membros veem só o próprio tenant.
create policy tenants_superadmin_all on public.tenants
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy tenants_member_select on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- admin_secretaria pode atualizar dados do próprio tenant (não criar/deletar).
create policy tenants_admin_update on public.tenants
  for update to authenticated
  using (id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria')
  with check (id = public.current_tenant_id());

-- users: superadmin tudo; membros veem o próprio tenant; cada um vê a si.
create policy users_superadmin_all on public.users
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy users_same_tenant_select on public.users
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or id = auth.uid());

-- admin_secretaria gerencia usuários do próprio tenant.
create policy users_admin_insert on public.users
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria');

create policy users_admin_update on public.users
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria')
  with check (tenant_id = public.current_tenant_id());

create policy users_admin_delete on public.users
  for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria');

-- self-update de campos básicos (nome/telefone) — sem trocar role/tenant via RLS
-- (troca de role/tenant só via service_role nas Edge Functions).
create policy users_self_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and tenant_id is not distinct from public.current_tenant_id());

-- lgpd_consents: usuário registra e lê o próprio aceite; gestores do tenant leem.
create policy lgpd_self_insert on public.lgpd_consents
  for insert to authenticated
  with check (user_id = auth.uid());

create policy lgpd_self_select on public.lgpd_consents
  for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin()
         or (tenant_id = public.current_tenant_id()
             and public.current_app_role() in ('admin_secretaria','gestor_secretaria')));
