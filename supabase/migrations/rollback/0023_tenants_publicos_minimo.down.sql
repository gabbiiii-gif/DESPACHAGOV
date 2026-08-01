-- ─── ROLLBACK de 0023_tenants_publicos_minimo ───────────────────────────────
--
-- Restaura a assinatura de 0019, com id e nome_secretaria expostos a anon.
-- Não há perda de dado: a função só lê.
--
-- ⚠️ ORDEM IMPORTA NA VOLTA. O frontend de 0023 em diante espera apenas
-- { subdomain }. Reverter só o banco é seguro (campos extras são ignorados pelo
-- cliente), mas reverter só o frontend NÃO é: a versão antiga usa `t.id` como
-- key do React e receberia undefined. Se for reverter os dois, suba o banco
-- primeiro.
--
-- Reverter reabre a enumeração da carteira de clientes por usuário anônimo.
-- Só faça isso se alguma integração externa depender dos campos extras.

begin;

drop function if exists public.listar_tenants_publicos();

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

commit;
