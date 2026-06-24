-- ─── DespachaGov · Migration 0002 — Cadastros base ───────────────────────────
-- unidades, equipamentos, empresas, tecnicos, contratos. Todas com tenant_id.
-- RLS: leitura por membros do tenant; escrita por admin_secretaria (+ superadmin).
-- Bucket privado `contratos` para PDFs, escopado por tenant_id na 1ª pasta.

-- unidades
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  codigo_inep text,
  endereco text,
  bairro text,
  zona text check (zona is null or zona in ('urbana','rural')),
  lat double precision,
  lng double precision,
  responsavel text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index unidades_tenant_idx on public.unidades (tenant_id);
create trigger unidades_set_updated_at before update on public.unidades
  for each row execute function public.set_updated_at();

-- empresas prestadoras
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  razao_social text not null,
  cnpj text,
  telefone text,
  email text,
  especialidades text[] not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index empresas_tenant_idx on public.empresas (tenant_id);
create trigger empresas_set_updated_at before update on public.empresas
  for each row execute function public.set_updated_at();

-- equipamentos (vinculados a uma unidade)
create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  unidade_id uuid not null references public.unidades (id) on delete cascade,
  tipo text not null,
  marca text,
  modelo text,
  numero_serie text,
  btu integer,
  qr_code_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index equipamentos_tenant_idx on public.equipamentos (tenant_id);
create index equipamentos_unidade_idx on public.equipamentos (unidade_id);
create trigger equipamentos_set_updated_at before update on public.equipamentos
  for each row execute function public.set_updated_at();

-- tecnicos (vinculados a uma empresa; tenant_id denormalizado p/ RLS)
create table public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  cpf text,
  telefone text,
  email text,
  especialidade text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tecnicos_tenant_idx on public.tecnicos (tenant_id);
create index tecnicos_empresa_idx on public.tecnicos (empresa_id);
create trigger tecnicos_set_updated_at before update on public.tecnicos
  for each row execute function public.set_updated_at();

-- contratos (com empresa, vínculo de PDF no storage)
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid references public.empresas (id) on delete set null,
  numero_processo text,
  objeto text,
  vigencia_inicio date,
  vigencia_fim date,
  valor numeric(14,2),
  pdf_url text,
  status text not null default 'vigente' check (status in ('vigente','encerrado','suspenso')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contratos_tenant_idx on public.contratos (tenant_id);
create trigger contratos_set_updated_at before update on public.contratos
  for each row execute function public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.unidades enable row level security;
alter table public.empresas enable row level security;
alter table public.equipamentos enable row level security;
alter table public.tecnicos enable row level security;
alter table public.contratos enable row level security;

-- Macro de políticas: SELECT p/ membros do tenant; ALL p/ admin_secretaria.
do $$
declare t text;
begin
  foreach t in array array['unidades','empresas','equipamentos','tecnicos','contratos']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select to authenticated
        using (tenant_id = public.current_tenant_id() or public.is_superadmin());
    $f$, t);
    execute format($f$
      create policy %1$s_admin_all on public.%1$s
        for all to authenticated
        using ((tenant_id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria') or public.is_superadmin())
        with check ((tenant_id = public.current_tenant_id() and public.current_app_role() = 'admin_secretaria') or public.is_superadmin());
    $f$, t);
  end loop;
end $$;

-- ─── Storage: bucket privado de contratos ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

create policy contratos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'contratos' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy contratos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_app_role() = 'admin_secretaria'
  );

create policy contratos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_app_role() = 'admin_secretaria'
  );
