-- ─── DespachaGov · Migration 0017 — Papéis novos (enum) ─────────────────────
-- Adiciona os valores novos ao enum user_role. Estratégia: manter os valores
-- existentes (admin_secretaria = "Chefe de divisão"; responsavel_unidade =
-- "Gestor de unidade"), só o RÓTULO muda na UI. Aqui entram:
--   secretaria_semed  → SEMED, somente leitura
--   engenheiro        → como Chefe, sem cadastrar usuários
--   arquiteto         → idem engenheiro (papel à parte)
--   manutencao_predial / manutencao_refrigeracao /
--   manutencao_ar_condicionado / instalacao_ar_condicionado → papéis de empresa
--
-- MIGRAÇÃO ISOLADA de propósito: `alter type ... add value` não pode ter o valor
-- novo USADO como enum na mesma transação. As policies (0018) comparam contra
-- current_app_role() que é TEXT, então não precisam do enum — mas o INSERT em
-- users.role (coluna enum) precisa. Manter esta migração só com add value.

alter type public.user_role add value if not exists 'secretaria_semed';
alter type public.user_role add value if not exists 'engenheiro';
alter type public.user_role add value if not exists 'arquiteto';
alter type public.user_role add value if not exists 'manutencao_predial';
alter type public.user_role add value if not exists 'manutencao_refrigeracao';
alter type public.user_role add value if not exists 'manutencao_ar_condicionado';
alter type public.user_role add value if not exists 'instalacao_ar_condicionado';
