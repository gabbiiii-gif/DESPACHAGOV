-- ─── DespachaGov · Migration 0010 — Urgência definida na triagem ─────────────
-- A diretora abre o chamado SEM urgência; a secretaria define ao triar.
-- urgencia passa a ser nullable (null = aguardando triagem). Check segue válido.

alter table public.chamados alter column urgencia drop not null;
alter table public.chamados alter column urgencia drop default;
