# Sprint 5 — Notificações por e-mail + PWA offline + ajustes de fluxo

Status: **concluído**. Peça 1 (e-mail transacional) e Peça 2 (PWA offline na abertura) **concluídas**. Push nativo **excluído** (decisão do owner).

Junto da peça 1, entraram 3 ajustes ao fluxo central (specs próprias em `docs/superpowers/specs/`).

## Peça 1 — E-mail transacional por evento (concluída)
Spec: `2026-06-24-email-transacional-eventos-design.md` · Plano: `docs/superpowers/plans/2026-06-24-email-transacional-eventos.md`.

- `INSERT` em `chamado_eventos` → Database Webhook (trigger `pg_net`, migration `0008`) → Edge Function `notify-event` (service_role, `verify_jwt=false`).
- Função resolve destinatários pela matriz evento→papel, deduplica via tabela `notificacoes` e envia via Resend. Exclui o próprio ator.
- Lógica de domínio pura em `src/lib/notificacoes.ts` (`destinatariosDe`, `linkPara`, `emailEvento`) + `notificacoes.test.ts`.
- Remetente alinhado ao domínio verificado `@despachagov.com`.

Migrations: `0007_notificacoes` (tabela + dedupe único `(evento_id, destinatario, canal)` + RLS de leitura p/ secretaria/superadmin), `0008_notify_webhook` (trigger de disparo, secret no banco), `0009_harden_notify` (revoga EXECUTE da função de trigger via PostgREST).

## Ajuste — Abertura sem urgência + anexo obrigatório + triagem (concluído)
Spec: `2026-06-24-abertura-triagem-design.md`. Migration `0010_urgencia_nullable`.

- Diretora abre chamado **sem urgência** (null = aguardando triagem), com **anexo obrigatório** (1–3 arquivos `png/jpg/jpeg/pdf`, ≤10 MB, `tipo='oficio'`). Validação pura `validarAnexosAbertura` em `src/lib/anexos.ts`.
- Secretaria define **urgência + empresa** ao triar (não define técnico). `atribuirChamado` passa urgência, sem técnico.
- Secretaria **perde** transições `em_campo`/`concluido` (donos = empresa); mantém atribuir + cancelar.
- `UrgenciaBadge` trata null → chip "Aguardando triagem".

## Ajuste — Empresa cadastra próprios técnicos (concluído)
Spec: `2026-06-24-empresa-cadastra-tecnicos-design.md`. Migration `0011_tecnicos_empresa_rls`.

- Policy permissiva: `empresa_admin` faz ALL nos técnicos da própria empresa.
- `EmpresaShell` (nav Chamados · Técnicos, aba só p/ empresa_admin) + `TecnicosPage` (CRUD + inativar soft). Serviços `criarTecnico/atualizarTecnico/inativarTecnico`, schema `tecnicoSchema`.

## Ajuste — Superadmin gere cadastros dentro de um tenant (concluído)
Spec: `2026-06-25-superadmin-cadastros-tenant-design.md`.

- `AuthProvider` ganha `focoTenantId`/`setFocoTenant`; `tenantId` = `profile.tenant_id ?? focoTenantId`.
- `listar*` aceitam `tenantId?` opcional. `SuperadminSecretariaShell` + `SuperadminTenantScope` reusam as páginas da secretaria escopadas a `/superadmin/secretaria/:tenantId/...`.
- `invite-user` estendido p/ aceitar `superadmin` (informa `tenant_id` no body). Redeploy v5.

## Peça 2 — PWA offline na abertura (concluída)
Spec: `2026-06-27-pwa-offline-abertura-design.md`.

- Fila offline (outbox) em **IndexedDB** (Blobs dos anexos não cabem em localStorage).
- `src/lib/outbox.ts` — puro: `criarJobAbertura`, `rotuloPendentes`, `ehErroDeRede` (+ teste).
- `src/services/outbox.ts` — store IndexedDB + `sincronizarPendentes()` (replay best-effort idempotente: cria chamado 1x via `chamado_id_criado`, sobe anexos pendentes via flag `enviado`, só remove o job quando tudo subiu). Evento `outbox-mudou`.
- `src/hooks/useOutbox.ts` — `{ online, pendentes, sincronizando, sincronizarAgora }`. Auto-sync no evento `online` e no mount.
- `UnidadeChamadosPage` — offline/erro-de-rede → enfileira; banner de pendências + "Enviar agora"; aviso "salvo no aparelho". Unidades cacheadas em `localStorage` p/ o select funcionar offline.
- Shell offline já coberto pelo `vite-plugin-pwa` (precache + `navigateFallback`).

## Verificação
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ |
| `eslint .` | exit 0 |
| `vitest run` | 39 passed (8 files) |

Replay/IndexedDB = verificação manual (DevTools → Offline): abrir sem rede → banner de pendência → reconectar → chamado sobe + e-mail dispara.
</content>
</invoke>
