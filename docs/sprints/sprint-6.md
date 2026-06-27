# Sprint 6 — Painel da Secretaria (KPIs + gráficos + relatórios)

Status: **concluído** (local; falta smoke manual com dados reais + deploy).

## Objetivo
Substituir o placeholder por um painel com indicadores, gráficos e exportação de relatórios
para a Secretaria acompanhar a operação.

## Dependência nova
- `recharts@3` (compatível com React 19). Isolado em chunk `vendor-recharts` no `vite.config.ts`.

## Domínio puro (testado, vitest)
- `src/lib/kpis.ts` — `contarPorStatus`, `contarPorUrgencia` (nula → `sem_triagem`),
  `taxaConclusao` (exclui cancelados da base), `tempoMedioAtendimentoHoras`/`tempoMedioConclusaoHoras`
  (reusam `horasEntre`), `serieMensal` (últimos N meses por mês de abertura).
- `src/lib/relatorios.ts` — `linhasRelatorio` (achata chamado → linha de planilha, resolve nomes de
  unidade/empresa), `nomeArquivoRelatorio` (carimba data).

## Geração de arquivo (I/O, não testado — como `comprovante.ts`)
- `src/lib/relatorioPdf.ts` — `gerarRelatorioPdf` (resumo em PDF via `html2pdf.js`, identidade azul/laranja).
- CSV via `papaparse` (`Papa.unparse`) + download por Blob, na própria página.

## Frontend
- `src/pages/secretaria/PainelPage.tsx` — cards (Total, Em andamento, Concluídos %, Tempo médio),
  BarChart "por status" (cor por barra via `STATUS_META`), BarChart "volume mensal" (abertos vs concluídos),
  botões Exportar CSV / PDF. Empty state quando não há chamados.
- Rota `/secretaria/painel` (vira o index de `/secretaria`) + item "Painel" no `SecretariaShell`.

## Notas
- Empresa: o nome vem de `empresas.razao_social` (não há coluna `nome`).
- Cores dos gráficos reusam os tokens `--color-*` (`STATUS_META.cor`) — `fill="var(--color-…)"`.
- Painel é só `/secretaria` (RLS escopa ao tenant). Modo superadmin de chamados segue fora de escopo.

## Verificação
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ (vendor-recharts ~384 kB / 112 kB gzip) |
| `eslint .` | exit 0 |
| `vitest run` | 48 passed (10 files) |

Falta: smoke com dados reais (abrir/triar/concluir alguns chamados e conferir números + exportações) e deploy.

## Próximo (Sprint 7)
Agente IA (Edge Function `ai-agent`, Claude Sonnet) — campos `ai_urgencia_sugerida`/`ai_categoria` já existem no schema.
