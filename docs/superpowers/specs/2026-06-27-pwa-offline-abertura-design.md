# Spec — PWA offline na abertura de chamado (Sprint 5, peça 2)

> Data: 2026-06-27. Status: aprovado pelo owner ("PWA offline na abertura").
> Contexto: `docs/HANDOFF.md` + `docs/sprints/sprint-5.md`.

## Objetivo
A diretora (responsavel_unidade) consegue **abrir chamado sem rede**: o app guarda o
chamado + anexos localmente e **sincroniza sozinho ao reconectar**. Sem perder o ofício/foto
obrigatório nem a descrição. Escopo: só a abertura (`/unidade`). Demais telas seguem online.

## Por que IndexedDB (e não localStorage)
A abertura exige 1–3 anexos (`png/jpg/pdf`, ≤10 MB). `localStorage` é string-only e ~5 MB.
IndexedDB guarda `Blob`/`File` via structured clone e tem espaço de sobra → é a fila (outbox).

## Arquitetura
```
onAbrir()
  ├─ online  → fluxo atual: abrirChamado + anexarArquivo[]  (se cair em erro de REDE → enfileira)
  └─ offline → criarJobAbertura → enfileira no IndexedDB (store "aberturas")

evento window 'online'  ─┐
mount da página         ─┼─→ sincronizarPendentes()  (replay best-effort, idempotente)
botão "enviar agora"    ─┘
```

### Replay idempotente
Cada job tem `id` (uuid local), `chamado_id_criado: string|null` e `anexos[].enviado: bool`.
- Cria o chamado **uma vez** (persiste `chamado_id_criado` antes de subir anexos) → re-rodar não duplica.
- Sobe cada anexo pendente, marca `enviado=true` e persiste após cada um.
- Só remove o job quando chamado criado **e** todos os anexos enviados.
- Falha de rede no meio do lote → `break` (mantém o progresso), tenta de novo no próximo gatilho.

O evento `aberto` (e o e-mail transacional) dispara naturalmente quando `abrirChamado` roda no replay — nada extra.

## Código
- `src/lib/outbox.ts` — **puro**: tipos `ChamadoPendente`/`AnexoPendente`, `criarJobAbertura`,
  `rotuloPendentes`, `ehErroDeRede`. Vitest (`outbox.test.ts`).
- `src/services/outbox.ts` — IndexedDB (`enfileirar`, `listarPendentes`, `contarPendentes`,
  `sincronizarPendentes`) + evento `outbox-mudou`. Reusa `abrirChamado`/`anexarArquivo`.
- `src/hooks/useOutbox.ts` — `{ online, pendentes, sincronizando, sincronizarAgora }`.
  Auto-sync no `online` e no mount.
- `src/pages/unidade/UnidadeChamadosPage.tsx` — enfileira offline / fallback de rede + banner de
  pendências + aviso "salvo no aparelho".
- Cache das **unidades** em `localStorage` (lista pequena) → o select da abertura funciona offline.

## Shell offline
`vite-plugin-pwa` (generateSW, `registerType:autoUpdate`) já faz precache do shell + `navigateFallback`
= `index.html`. O JS/CSS da SPA carrega offline; o que faltava era a camada de dados (outbox).

## Tratamento de erro
- Distinguir **erro de rede** (enfileira p/ retry) de **erro de regra/validação** (mostra ao usuário,
  não enfileira) via `ehErroDeRede`.
- Sync é best-effort: falha parcial mantém o job; índice de progresso evita duplicar.

## Testes
- Vitest puro: `criarJobAbertura` (shape, ids únicos, anexos não enviados), `rotuloPendentes`
  (singular/plural/zero), `ehErroDeRede`.
- IndexedDB/replay = verificação manual (DevTools → throttling Offline): abrir sem rede → ver
  banner de pendência → voltar online → chamado aparece + e-mail dispara.
- `npm run build` + `eslint .` verdes.

## Fora de escopo (YAGNI)
- Edição/cancelamento de job na fila pela UI (só "enviar agora").
- Offline em outras telas (execução em campo, triagem).
- Resolução de conflito (improvável: protocolo é gerado no server no replay).
- Background Sync API (gatilho por evento `online` + mount cobre o caso real).
</content>
