-- ─── DespachaGov · Migration 0004 — Realtime em chamados ────────────────────
-- RECONSTRUÍDA EM 2026-07-28. Esta migration foi aplicada em produção em
-- 2026-06-24 (version 20260624042632) mas o arquivo nunca foi versionado.
-- O conteúdo abaixo foi derivado do estado real do banco:
--   select * from pg_publication_tables where pubname = 'supabase_realtime';
--   → única tabela publicada: public.chamados
--   replica identity de chamados = 'd' (default/PK), ou seja, nunca foi alterada.
--
-- Consumidores no frontend (justificam a publicação):
--   src/components/chamados/MapaChamados.tsx      → canal "mapa-chamados"
--   src/pages/empresa/EmpresaChamadosPage.tsx     → canal "empresa-chamados"
-- Ambos escutam postgres_changes em public.chamados.
--
-- IMPORTANTE: o Realtime respeita RLS do assinante — só chegam as linhas que o
-- usuário já poderia ler via select. Publicar a tabela não amplia visibilidade.
--
-- Idempotente: em produção a tabela já está publicada; o guard evita o erro
-- 42710 (duplicate_object) ao rodar as migrations do zero.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'chamados'
  ) then
    alter publication supabase_realtime add table public.chamados;
  end if;
end
$$;
