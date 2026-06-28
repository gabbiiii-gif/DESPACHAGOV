-- ─── DespachaGov · Migration 0015 — Log de erros (observabilidade) ───────────
-- Captura erros do front (e futuramente das Edge Functions) p/ o superadmin
-- monitorar e o agente IA analisar padrões + apontar riscos.

create table public.error_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  fonte text not null,                    -- 'front', 'ai-agent', etc.
  nivel text not null default 'error' check (nivel in ('error', 'warn', 'info')),
  mensagem text not null,
  contexto jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index error_log_created_idx on public.error_log (created_at desc);

alter table public.error_log enable row level security;

-- Só superadmin lê. Escrita exclusiva via service_role (Edge Functions); nenhum
-- papel de usuário insere direto (ignora RLS via service_role).
create policy error_log_superadmin_select on public.error_log
  for select to authenticated
  using (public.is_superadmin());
