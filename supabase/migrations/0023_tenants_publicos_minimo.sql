-- ─── DespachaGov · Migration 0023 — Reduz a superfície pública de tenants ────
-- Achado da auditoria de 2026-07-28: listar_tenants_publicos() é SECURITY
-- DEFINER com `grant execute ... to anon`, ou seja, qualquer pessoa não
-- autenticada podia listar TODAS as secretarias ativas com id, nome oficial e
-- subdomínio. Não é vazamento de dado pessoal, mas entrega a carteira de
-- clientes pronta a um concorrente, e expõe UUIDs internos.
--
-- POR QUE DÁ PARA CORTAR SEM DISCUTIR PRODUTO
-- A tela de login (src/pages/LoginPage.tsx) usa exclusivamente `subdomain` —
-- como value E como rótulo do <option>. O `id` servia só de key do React e
-- `nome_secretaria` era buscado e nunca renderizado. Os dois campos sensíveis
-- eram trafegados para ninguém. Removê-los é redução pura de exposição, com
-- zero mudança de experiência: o seletor continua idêntico.
--
-- O nome da secretaria continua disponível para quem tem sessão, via select
-- normal em public.tenants sob RLS (é o que as telas de superadmin já fazem).
--
-- DROP antes de CREATE porque `create or replace` não muda o tipo de retorno
-- de uma função (erro 42P13).

drop function if exists public.listar_tenants_publicos();

-- search_path = '' (e não `public`, como em 0019): com o path vazio, nenhum
-- objeto resolve por nome curto, então um schema malicioso no path do chamador
-- não consegue sequestrar a referência dentro de uma função SECURITY DEFINER.
-- O corpo já qualifica public.tenants, então nada muda de comportamento. É o
-- padrão que as demais funções do projeto usam (0001, 0005, 0012).
create or replace function public.listar_tenants_publicos()
returns table (subdomain text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.subdomain
    from public.tenants t
   where t.status = 'ativo'
   order by t.subdomain asc;
$$;

revoke all on function public.listar_tenants_publicos() from public;
grant execute on function public.listar_tenants_publicos() to anon, authenticated;
