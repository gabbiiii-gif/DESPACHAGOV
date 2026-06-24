# Spec — Abertura sem urgência + anexos + triagem da secretaria

> Data: 2026-06-24. Status: aprovado. Ajuste ao fluxo central de chamados.

## Objetivo

Alinhar abertura e triagem ao fluxo real:
- Diretora (responsavel_unidade) abre chamado **sem urgência**, com **anexo obrigatório** (ofício/foto/pdf).
- Secretaria define **urgência + empresa** ao triar (não define técnico).
- Empresa designa técnico e move `em_campo`/`concluido` (já existe); secretaria só acompanha.

## Decisões

- Urgência **nullable** (`null` = aguardando triagem).
- Anexo na abertura **obrigatório ≥1**, até **3** arquivos, tipos `png/jpg/jpeg/pdf`, ~**10 MB** cada, `tipo='oficio'`.
- Triagem secretaria = urgência + empresa (sem técnico).
- Secretaria **perde** os botões de transição `em_campo`/`concluido` (donos = empresa); mantém atribuição + cancelar.

## Banco — migration `0010_urgencia_nullable`

```sql
alter table public.chamados alter column urgencia drop not null;
alter table public.chamados alter column urgencia drop default;
```
Check constraint segue (aceita null). RLS sem mudança — `anexos_insert`/`pode_acessar_chamado` já cobrem o solicitante no próprio chamado; storage por tenant ok.

## Serviços (`src/services/chamados.ts`)

- `AbrirChamadoInput`: remover `urgencia`. `abrirChamado` insere `urgencia: null`. Evento `aberto` segue disparando e-mail (feature de hoje).
- `atribuirChamado(c, empresaId, urgencia, ator)`: **remove** `tecnicoId`; **add** `urgencia`. Update `urgencia + empresa_id + status='atribuido' + data_atribuicao`. Evento `atribuido`.

## Validação pura (`src/lib/anexos.ts` + teste)

`validarAnexosAbertura(files): { ok: boolean; erro?: string }` — pura, testável (vitest via esbuild+node, runner quebrado na máquina; ver memória). Regras: 1–3 arquivos; cada um `png/jpg/jpeg/pdf`; ≤10 MB.

## Abertura — `src/pages/unidade/UnidadeChamadosPage.tsx`

- Remove botões de urgência (e estado `urgencia`).
- Add `<input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" capture>` (até 3) + lista/preview + validação via `validarAnexosAbertura`. Botão abrir bloqueado se inválido.
- Submit: `abrirChamado` → para cada arquivo `anexarArquivo({ tipo:'oficio', chamadoId, ... })`. Falha de upload = mensagem + retry (chamado já criado; obrigatoriedade é gate de UI).

## Triagem — `src/pages/secretaria/...ChamadosPage`

- Modal de atribuição: **remove** seletor de técnico; **add** seletor de urgência (obrigatório). Chama `atribuirChamado(c, empresaId, urgencia, ator)`.
- **Remove** ações de transição `em_campo`/`concluido` do lado da secretaria; mantém **cancelar**.

## UI urgência null

- `UrgenciaBadge` (`src/components/chamados/Badges`): `urgencia == null` → chip "Aguardando triagem" (cinza).
- Auditar usos de `.urgencia` (mapa/cores, inbox, detalhe) p/ tratar null sem quebrar — via cavecrew-investigator.

## Verificação

- Pura: `validarAnexosAbertura` via esbuild+node.
- `npm run build` + `eslint .` verdes.
- Smoke manual: abrir (sem arquivo → bloqueia; com arquivo → cria + anexa), triar (urgência+empresa), ver badge "Aguardando triagem" antes da triagem.

## Fora de escopo

- #3 empresa cadastra próprios técnicos. #4 superadmin gere cadastros dentro da secretaria. Specs próprias.
