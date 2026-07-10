-- ─── DespachaGov · Migration 0019 — RPC pública de tenants para o login ─────
-- Expor a lista de secretarias ativas na tela de login (sem exigir sessão)
-- para o usuário selecionar sua Secretaria ao entrar por matrícula, em vez
-- de digitar o subdomínio. Retorna apenas colunas não-sensíveis
-- (id, nome_secretaria, subdomain) e filtra por status='ativo'.
--
-- Usa SECURITY DEFINER para ignorar RLS sem afetar as policies existentes
-- em public.tenants. Grant específico p/ anon (login) e authenticated.

create or replace function public.listar_tenants_publicos()
returns table (
  id uuid,
  nome_secretaria text,
  subdomain text
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.nome_secretaria, t.subdomain
    from public.tenants t
   where t.status = 'ativo'
   order by t.nome_secretaria asc;
$$;

revoke all on function public.listar_tenants_publicos() from public;
grant execute on function public.listar_tenants_publicos() to anon, authenticated;
