-- ─── DespachaGov · Migration 0009 — Hardening do disparo de notificações ─────
-- A função de trigger é SECURITY DEFINER e, por padrão, ficou executável via
-- PostgREST RPC por anon/authenticated. Trigger não precisa de EXECUTE para
-- roles (dispara como owner da tabela) → revoga para fechar a superfície.

revoke execute on function public.tg_notify_chamado_evento() from public, anon, authenticated;
