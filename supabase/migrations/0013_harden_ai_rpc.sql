-- ─── DespachaGov · Migration 0013 — Hardening do RPC de rate-limit da IA ─────
-- 0012 revogou EXECUTE de anon/authenticated, mas funções nascem com EXECUTE
-- para PUBLIC por padrão — o que mantinha ai_consumir_credito chamável via
-- PostgREST RPC. Revoga de PUBLIC para fechar a superfície (só service_role
-- da Edge Function chama; service_role ignora GRANTs).
revoke all on function public.ai_consumir_credito(uuid, int) from public;
