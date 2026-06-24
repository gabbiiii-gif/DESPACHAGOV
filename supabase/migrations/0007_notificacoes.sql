-- ─── DespachaGov · Migration 0007 — Notificacoes (log de e-mail por evento) ───
-- Log/idempotência do e-mail transacional. Escrita só por service_role (Edge Fn).
-- Leitura para secretaria do tenant (auditoria) + superadmin.

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  evento_id uuid not null references public.chamado_eventos (id) on delete cascade,
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  canal text not null default 'email' check (canal in ('email')),
  destinatario text not null,
  assunto text,
  status text not null check (status in ('enviado','falha')),
  erro text,
  created_at timestamptz not null default now()
);

-- Idempotência: 1 registro por (evento, destinatário, canal).
create unique index notificacoes_dedupe_idx on public.notificacoes (evento_id, destinatario, canal);
create index notificacoes_tenant_idx on public.notificacoes (tenant_id);
create index notificacoes_chamado_idx on public.notificacoes (chamado_id);

alter table public.notificacoes enable row level security;

-- SELECT: secretaria do tenant + superadmin. Sem policy de INSERT/UPDATE:
-- service_role ignora RLS; nenhum papel de usuário escreve aqui.
create policy notificacoes_select on public.notificacoes
  for select to authenticated
  using (
    public.is_superadmin()
    or (tenant_id = public.current_tenant_id()
        and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
  );
