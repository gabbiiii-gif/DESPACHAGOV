-- ─── DespachaGov · Migration 0014 — Detalhes da unidade ─────────────────────
-- Contatos da escola (diretora/secretária/coordenadora + telefones), e-mail
-- institucional e endereço ESTRUTURADO (tipo de logradouro, nº, CEP, cidade)
-- para geocodificação mais precisa. RLS já cobre unidades (sem mudança).

alter table public.unidades
  add column email text,
  add column diretora_nome text,
  add column diretora_telefone text,
  add column secretaria_nome text,
  add column secretaria_telefone text,
  add column coordenadora_nome text,
  add column coordenadora_telefone text,
  add column logradouro_tipo text,
  add column logradouro text,
  add column numero text,
  add column cep text,
  add column cidade text;
