-- Adiciona 'indigena' como opcao valida para unidades.zona.
-- Antes: urbana|rural. Motivacao: escolas indigenas na regiao de Altamira
-- precisam ser categorizadas separadamente (contexto Xingu/Assurini/Kuruaya).

alter table public.unidades drop constraint if exists unidades_zona_check;
alter table public.unidades
  add constraint unidades_zona_check
  check (zona is null or zona in ('urbana', 'rural', 'indigena'));
