# Sprint 7 — Agente IA (triagem) + exclusão de Secretaria

Status: **código pronto (local)**. Falta deploy de infra (migration + Edge Functions) — ver abaixo.

## Agente de triagem por IA
Sugere **urgência + categoria** de um chamado a partir da descrição, para a secretaria triar mais rápido. Grava em `chamados.ai_urgencia_sugerida` / `ai_categoria` (campos já existentes).

- `src/lib/aiTriagem.ts` — **puro/testado**: `CATEGORIAS` + `CATEGORIA_META`, `SUGESTAO_SCHEMA` (structured outputs), `PROMPT_SISTEMA`, `promptUsuario`, `validarSugestao` (estreita ao domínio). `aiTriagem.test.ts` (7 casos).
- `supabase/functions/ai-agent/index.ts` — Edge Function (verify_jwt=true). Autoriza secretaria do tenant, aplica **rate limit 500/tenant/mês** (RPC atômico), chama a **Messages API da Anthropic** (modelo `claude-sonnet-4-6` — decisão do owner; classificação simples/alto volume) via HTTP direto com `output_config.format` (JSON schema) + `thinking: disabled`. Valida a saída e grava os campos `ai_*`. CORS habilitado.
- `supabase/migrations/0012_ai_rate_limit.sql` — tabela `ai_usage` (`tenant_id`,`ano_mes`,`contador`) + RPC `ai_consumir_credito(tenant, limite)` (SECURITY DEFINER, incremento atômico com teto) + RLS de leitura p/ secretaria/superadmin.
- Front: `sugerirTriagem(chamadoId)` em `services/chamados.ts`; botão **"Sugerir com IA"** no modal de triagem (`ChamadosPage`) → pré-preenche a urgência + mostra categoria/justificativa.

> Modelo: o default da skill claude-api seria `claude-opus-4-8`; usamos `claude-sonnet-4-6` por ser a escolha documentada no HANDOFF (custo/volume). Haiku 4.5 seria ainda mais barato se quiser baixar custo.

## Exclusão de Secretaria (superadmin)
- `supabase/functions/delete-tenant/index.ts` — Edge Function (verify_jwt=true, superadmin). `DELETE` em `public.tenants` → cascade nos dados públicos; remove os usuários do **Auth** (não cascateiam de `public.users`). Storage (buckets) **não** é coberto pelo cascade → limpeza futura.
- `deletarTenant(id)` em `services/tenants.ts`; `TenantsPage` ganha botão **"Excluir"** + modal de confirmação **por digitação do subdomínio** (irreversível).

## Verificação (local)
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ |
| `eslint .` | exit 0 |
| `vitest run` | 55 passed (11 files) |

## Pendências de infra (deploy — não feito)
1. `apply_migration` **0012_ai_rate_limit**.
2. `supabase functions deploy ai-agent` (verify_jwt=true). Secret `ANTHROPIC_API_KEY` já existe no projeto (HANDOFF).
3. `supabase functions deploy delete-tenant` (verify_jwt=true).
4. Smoke: triar um chamado real (botão IA → urgência preenchida; `ai_usage` incrementa) e excluir um tenant de teste.

## Fora de escopo
- Auto-sugestão no momento da abertura (hoje é on-demand na triagem).
- Limpeza de Storage na exclusão de tenant.
- Painel de consumo de IA por tenant.
