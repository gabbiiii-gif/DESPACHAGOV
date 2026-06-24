# Sprint 3 — Chamados (núcleo)

Status: **concluído** (núcleo online). PWA offline + realtime ficam p/ sprints 4–5.

## Banco (migration `0003_chamados`)
- `chamados` — protocolo sequencial global (`AAAA-000123` via sequence + default), urgência (`baixa/media/alta/critica`), status (`aberto→atribuido→em_campo→concluido` + `cancelado`), vínculos a unidade/equipamento/contrato/empresa/técnico, datas de SLA, campos `ai_*` (Sprint 7).
- `chamado_eventos` — timeline (evento, ator, payload).
- `users.empresa_id` / `users.unidade_id` (escopo de papéis). Helper `current_empresa_id()` (claim).
- **RLS por papel**: secretaria vê tudo do tenant; empresa vê só seus chamados; responsável vê os que abriu. Insert por responsável/secretaria; update por secretaria (atribui/encerra) e empresa (seus chamados).

## Frontend
- **Unidade** (`/unidade`, responsavel_unidade): abrir chamado em **3 passos numa tela** (unidade → urgência em botões → descrição), lista “meus chamados” em cards, detalhe com **timeline**.
- **Secretaria** (`/secretaria/chamados`): inbox com filtro por status, detalhe em modal com **atribuição de empresa + técnico**, **transições de status** (apenas as válidas, do domínio), timeline.
- Componentes: `StatusBadge`, `UrgenciaBadge`, `Timeline`. Reaproveitam `STATUS_META`/`URGENCIA_META` do domínio.
- Protocolo numerado exibido em todas as telas.

## Domínio / serviços
- `src/lib/chamados.ts` (já existia) — máquina de estados + urgências reusadas no UI.
- `src/services/chamados.ts` — abrir, atribuir, transicionar (carimba datas + grava evento), listar, timeline.

## Verificação
| Check | Resultado |
|-------|-----------|
| `vitest run` | 23 passed |
| `npm run build` | ✓ |
| `eslint .` | OK |

## Pendências / próximos
- **Empresa/técnico**: papéis com escopo já prontos no RLS, mas falta fluxo de criação desses usuários (estender `invite-user` com `empresa_id`). Inbox da empresa usa o mesmo modelo.
- **PWA offline** na abertura (fila local) — Sprint 4/5.
- **Realtime** (Supabase channels) + push/email por evento — Sprint 5.
- Sprint 4: execução em campo (fotos antes/depois, assinatura, comprovante PDF).
