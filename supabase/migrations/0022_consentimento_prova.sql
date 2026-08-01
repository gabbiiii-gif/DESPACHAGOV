-- ─── DespachaGov · Migration 0022 — Prova do consentimento ───────────────────
-- Fecha a lacuna probatória apontada na auditoria de 2026-07-28.
--
-- O QUE ESTAVA ERRADO
-- lgpd_consents guardava versao_termo ("2026-06-v1") mas não o TEXTO aceito. O
-- texto vivia embutido no JSX de LgpdGate.tsx: qualquer edição no parágrafo sem
-- bump da constante de versão fazia todos os aceites antigos apontarem para um
-- documento que já não existia. A prova de consentimento quebrava em silêncio,
-- sem nenhum sinal no banco ou no código.
--
-- Agora o texto vive em src/lib/termo.ts (TERMO_SECOES), é serializado de forma
-- determinística por textoCanonicoTermo() e o SHA-256 disso é gravado aqui. Dá
-- para provar, anos depois, exatamente qual documento a pessoa leu — basta
-- recalcular o hash da versão correspondente no histórico do git.
--
-- A coluna ip já existia desde 0001 e NUNCA foi preenchida: o insert vinha do
-- browser (services/lgpd.ts), que não conhece o próprio IP. Passa a ser gravada
-- pela Edge Function record-consent, que lê o cabeçalho da requisição.

alter table public.lgpd_consents
  add column if not exists texto_hash text;

comment on column public.lgpd_consents.texto_hash is
  'SHA-256 hex do texto canônico do termo aceito (src/lib/termo.ts → textoCanonicoTermo). Prova qual documento foi exibido, independente da string de versão.';

comment on column public.lgpd_consents.ip is
  'IP de origem do aceite. Preenchido pela Edge Function record-consent; nulo em registros anteriores a 0022 e no fallback client-side.';

-- Índice para a consulta que o gate faz a cada carregamento de rota protegida
-- (usuário + versão vigente). Antes só havia índice por user_id, então a
-- filtragem por versão era feita em memória sobre todos os aceites do usuário.
create index if not exists lgpd_consents_user_versao_idx
  on public.lgpd_consents (user_id, versao_termo);
