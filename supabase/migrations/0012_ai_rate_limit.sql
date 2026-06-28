-- ─── DespachaGov · Migration 0012 — Rate limit do agente IA ──────────────────
-- Teto de 500 sugestões de IA por tenant/mês (risco do briefing, Sprint 0).
-- Contador atômico server-side; escrita só pela Edge Function (service_role).

create table public.ai_usage (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ano_mes text not null, -- 'AAAA-MM'
  contador int not null default 0,
  primary key (tenant_id, ano_mes)
);

alter table public.ai_usage enable row level security;

-- SELECT: secretaria do tenant (auditoria de consumo) + superadmin. Sem INSERT/UPDATE
-- por papel de usuário — a função abaixo escreve como owner (service_role ignora RLS).
create policy ai_usage_select on public.ai_usage
  for select to authenticated
  using (public.is_superadmin() or tenant_id = public.current_tenant_id());

-- Incremento atômico com teto. Retorna true se dentro do limite (e já incrementou),
-- false se estourou. SECURITY DEFINER: só a Edge Function (service_role) chama.
create or replace function public.ai_consumir_credito(p_tenant uuid, p_limite int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes text := to_char(now(), 'YYYY-MM');
  v_atual int;
begin
  insert into public.ai_usage (tenant_id, ano_mes, contador)
  values (p_tenant, v_mes, 0)
  on conflict (tenant_id, ano_mes) do nothing;

  update public.ai_usage
    set contador = contador + 1
    where tenant_id = p_tenant and ano_mes = v_mes and contador < p_limite
    returning contador into v_atual;

  return v_atual is not null;
end;
$$;

-- Trigger dispara como owner; ninguém precisa de EXECUTE via PostgREST RPC.
revoke all on function public.ai_consumir_credito(uuid, int) from anon, authenticated;
