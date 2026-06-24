-- ─── DespachaGov · Migration 0005 — Execução em campo ───────────────────────
-- chamado_anexos (fotos antes/depois, ofício, comprovante) + assinaturas.
-- Bucket privado `chamado-anexos` escopado por tenant_id.

create table public.chamado_anexos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  tipo text not null check (tipo in ('foto_antes','foto_depois','oficio','comprovante')),
  descricao text,
  storage_path text not null,
  mime_type text,
  tamanho_bytes integer,
  ator_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index chamado_anexos_chamado_idx on public.chamado_anexos (chamado_id);

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  signatario_nome text not null,
  signatario_cpf text,
  signatario_cargo text,
  assinatura_dataurl text not null,
  ip text,
  geo text,
  created_at timestamptz not null default now()
);
create index assinaturas_chamado_idx on public.assinaturas (chamado_id);

alter table public.chamado_anexos enable row level security;
alter table public.assinaturas enable row level security;

-- Quem pode agir sobre o chamado pode anexar/assinar (secretaria do tenant,
-- empresa do chamado, ou o solicitante).
create or replace function public.pode_acessar_chamado(p_chamado_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
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

create policy anexos_select on public.chamado_anexos
  for select to authenticated using (public.pode_acessar_chamado(chamado_id));
create policy anexos_insert on public.chamado_anexos
  for insert to authenticated with check (ator_id = auth.uid() and public.pode_acessar_chamado(chamado_id));

create policy assinaturas_select on public.assinaturas
  for select to authenticated using (public.pode_acessar_chamado(chamado_id));
create policy assinaturas_insert on public.assinaturas
  for insert to authenticated with check (public.pode_acessar_chamado(chamado_id));

-- Bucket privado de anexos de chamado.
insert into storage.buckets (id, name, public)
values ('chamado-anexos', 'chamado-anexos', false)
on conflict (id) do nothing;

create policy chamado_anexos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'chamado-anexos' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy chamado_anexos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chamado-anexos' and (storage.foldername(name))[1] = public.current_tenant_id()::text);
