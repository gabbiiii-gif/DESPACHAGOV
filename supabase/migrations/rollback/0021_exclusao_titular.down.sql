-- ─── ROLLBACK de 0021_exclusao_titular ──────────────────────────────────────
--
-- ⚠️ DESTRUTIVO E PARCIALMENTE IRREVERSÍVEL. LEIA ANTES DE RODAR.
--
-- Este script desfaz a ESTRUTURA, não os EFEITOS. Os titulares já anonimizados
-- continuam anonimizados: nome, e-mail, CPF, telefone, cargo e matrícula foram
-- sobrescritos no lugar e não existe cópia. Nenhum rollback traz esses dados de
-- volta — só uma restauração de backup anterior à anonimização (docs/RESTORE.md).
--
-- Além disso, remover exclusao_dados_log APAGA a trilha de auditoria das
-- exclusões já feitas, que é justamente a prova de que o direito do titular foi
-- atendido. Exporte a tabela antes:
--
--   \copy (select * from public.exclusao_dados_log) to 'exclusoes.csv' csv header
--
-- Rode isto apenas se a migration 0021 precisar ser revertida logo após subir,
-- antes de qualquer exclusão real ter acontecido. Confira primeiro:
--
--   select count(*) from public.exclusao_dados_log;   -- precisa ser 0
--   select count(*) from public.users where anonimizado_em is not null;  -- 0

begin;

drop function if exists public.anonimizar_titular(uuid);

drop policy if exists exclusao_log_select on public.exclusao_dados_log;
drop table if exists public.exclusao_dados_log;

alter table public.users drop column if exists anonimizado_em;

commit;
