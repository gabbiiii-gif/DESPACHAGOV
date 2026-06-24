# Spec — E-mail transacional por evento (Sprint 5, peça 1)

> Data: 2026-06-24. Status: aprovado, pronto p/ plano de implementação.
> Contexto: ver `docs/HANDOFF.md` e `docs/sprints/sprint-4.md`.

## Objetivo

Notificar por e-mail os atores relevantes a cada mudança de estado de um chamado,
reusando os eventos já gravados em `chamado_eventos`. Sem alterar o código cliente.

Sprint 5 foi fatiado em 3 peças independentes (specs separadas):
1. **E-mail transacional por evento** ← este spec.
2. PWA offline na abertura — spec futura.
3. Push nativo (Capacitor/FCM) — **excluído por enquanto** (decisão do owner).

## Matriz evento → destinatário (fechada)

| Evento (`chamado_eventos.evento`) | Destinatário | Motivo |
|-----------------------------------|--------------|--------|
| `aberto` | admin_secretaria do tenant | novo chamado p/ triar/atribuir |
| `atribuido` | empresa designada | tem serviço novo |
| `tecnico_designado` | técnico | foi escalado |
| `em_campo` | responsável (solicitante) | atendimento começou |
| `concluido` | responsável + admin_secretaria | encerrado, comprovante disponível |
| `cancelado` | responsável + empresa (se já atribuída) | cancelamento |

O e-mail do **próprio ator** (`chamado_eventos.ator_id`) é excluído da lista — não auto-notifica.
A matriz pode mudar no futuro; está isolada em código puro (`destinatariosDe`) p/ facilitar.

## Arquitetura (abordagem A — Database Webhook)

```
chamado_eventos INSERT
   └─> Supabase Database Webhook (trigger interno)
        └─> POST  Edge Function `notify-event`  (service_role, verify_jwt=false)
             ├─ valida header secreto
             ├─ carrega chamado + resolve destinatários
             ├─ dedupe via tabela `notificacoes`
             └─ envia via Resend  +  loga resultado
```

Por que A: cliente intocado, event-sourced, desacoplado. Resolução de destinatários
**precisa** de service_role (um papel não enxerga e-mail de outro por RLS).
Rejeitadas: B (trigger pg_net escrito à mão — segredos no banco, debug ruim) e
C (cliente chama após cada transição — frágil, cliente não vê e-mails de outros papéis).

## Resolução de destinatários (fontes no schema atual)

| Papel | Fonte do e-mail |
|-------|-----------------|
| empresa | `empresas.email` (coluna direta) |
| técnico | `tecnicos.email` (coluna direta) |
| responsável (solicitante) | `auth.users.email` via `chamados.solicitante_id` |
| admin_secretaria | `public.users` (role) ⋈ `auth.users.email`, filtrado por `tenant_id` |

## Banco — migration `0007_notificacoes`

Tabela `notificacoes`:
- `id uuid pk`
- `tenant_id uuid not null` (fk tenants)
- `evento_id uuid not null` (fk chamado_eventos)
- `chamado_id uuid not null` (fk chamados)
- `canal text not null default 'email'`
- `destinatario text not null`
- `assunto text`
- `status text not null check (status in ('enviado','falha'))`
- `erro text`
- `created_at timestamptz not null default now()`

Idempotência: índice **único** `(evento_id, destinatario, canal)`. Webhook pode reenviar;
a função checa antes de mandar e o índice é a rede de segurança.

RLS: SELECT p/ `admin_secretaria`/`gestor_secretaria` do tenant (auditoria) + superadmin;
escrita exclusiva do service_role (Edge Function ignora RLS).

## Código

- `supabase/functions/notify-event/index.ts` — orquestra (validação, load, dedupe, envio, log).
- `supabase/functions/_shared/destinatarios.ts` — **puro**: `destinatariosDe(evento): Papel[]`
  mapeia evento → papéis a notificar. Testável sem rede.
- `supabase/functions/_shared/email.ts` — add `emailEvento(evento, ctx)` → `{ subject, html }`
  por evento, identidade azul/laranja (#2456A6 / #F97316), com protocolo + unidade + link.
- Espelho testável das puras no front (`src/lib/`) **ou** vitest direto sobre o módulo `_shared`
  (decidir no plano; projeto não tem runner Deno hoje — testar a lógica pura via vitest).

### Link por papel no e-mail
Deep link best-effort pro app conforme destinatário:
- responsável → `https://www.despachagov.com/unidade`
- empresa → `/empresa`
- secretaria → `/secretaria/chamados`
- técnico → `/empresa` (ou tela do técnico quando existir)

## Tratamento de erro

Best-effort **por destinatário**: falha de um não derruba os outros; cada falha vira linha
`status='falha'` em `notificacoes` com a mensagem. O webhook recebe **200** sempre que a
função processou (mesmo com falha parcial já logada) → evita tempestade de retry.
401 só quando o header secreto não confere.

## Infra (automatizável — Supabase Pro + MCP/CLI no projeto `evdjijvxllhrlkkhrcdi`)

Em vez de configurar no painel à mão, aplicar via MCP/CLI:
1. `apply_migration` — `0007_notificacoes`.
2. `deploy_edge_function` — `notify-event` (config `verify_jwt = false`).
3. `supabase secrets set NOTIFY_WEBHOOK_SECRET=…` (valor forte, novo).
4. Criar Database Webhook em `chamado_eventos` (INSERT) apontando p/ a função, com header
   `x-notify-secret: <NOTIFY_WEBHOOK_SECRET>`. Pode ser via SQL (trigger `supabase_functions`)
   numa migration ou via painel — decidir no plano.

## Testes

- vitest sobre as funções **puras** (`destinatariosDe`, builder de template `emailEvento`).
- I/O da Edge Function = verificação de integração manual (abrir/transicionar chamado real e
  conferir linha em `notificacoes` + recebimento). Sem runner Deno no projeto hoje.
- `npm run build` + `eslint .` verdes.

## Achado fora de escopo (a confirmar antes do go-live)

`supabase/functions/_shared/email.ts:16` usa remetente `@despachagov.com.br`, mas o HANDOFF
diz que o domínio verificado no Resend é `despachagov.com`. Divergência pode derrubar o envio.
Confirmar o domínio correto e alinhar o remetente. **Não bloqueia este design.**

## Fora de escopo (YAGNI por ora)

- Preferências de opt-out por usuário / canal.
- Push e SMS.
- Digest/agrupamento de notificações.
- Retentativa automática de falhas (a linha `falha` fica registrada p/ inspeção).
