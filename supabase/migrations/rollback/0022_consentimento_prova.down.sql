-- ─── ROLLBACK de 0022_consentimento_prova ───────────────────────────────────
--
-- ⚠️ Descartar texto_hash apaga a prova de QUAL texto cada pessoa aceitou. A
-- coluna versao_termo sobrevive, mas ela sozinha é exatamente a fragilidade que
-- 0022 veio corrigir: aponta para um documento que pode ter mudado.
--
-- Exporte antes, se já houver aceites com hash:
--
--   \copy (select user_id, versao_termo, texto_hash, aceito_em, ip
--            from public.lgpd_consents where texto_hash is not null)
--     to 'consentimentos.csv' csv header
--
-- O frontend tolera a ausência da coluna: services/lgpd.ts tenta o insert com
-- texto_hash e, se falhar, repete sem ele. Reverter não trava o aceite.

begin;

drop index if exists public.lgpd_consents_user_versao_idx;

alter table public.lgpd_consents drop column if exists texto_hash;

commit;
