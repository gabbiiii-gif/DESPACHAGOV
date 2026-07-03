-- ─── DespachaGov · Migration 0016 — Responsável (diretor) da unidade ─────────
-- Liga o diretor (users.role = 'responsavel_unidade') às escolas que ele responde.
-- Cardinalidade: 1 escola → no máx. 1 diretor; 1 diretor → N escolas (ex.: anexa).
-- FK no lado "muitos" (unidades). ON DELETE SET NULL: apagar o usuário só desfaz o
-- vínculo, não remove a escola. RLS de unidades já cobre (admin escreve, membro lê).
-- users.unidade_id (single, sem uso) fica deprecado — não é removido aqui.

alter table public.unidades
  add column if not exists responsavel_user_id uuid
  references public.users (id) on delete set null;

create index if not exists unidades_responsavel_idx
  on public.unidades (responsavel_user_id);
