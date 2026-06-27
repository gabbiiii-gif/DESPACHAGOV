# Sprint 8 — SLA + painel "Meu Contrato" (base de faturamento)

Status: **concluído (local)**. Frontend-only — sem migration/infra nova.

## Objetivo
Dar à empresa prestadora visão do cumprimento de prazos (SLA), que é a base do
faturamento por desempenho.

## Domínio puro (testado)
- `src/lib/sla.ts` — `PRAZO_PADRAO_HORAS` por urgência (critica 4h, alta 24h, media 72h, baixa 168h),
  `prazoPrevistoHoras` (usa `sla_horas` do chamado, senão o padrão da urgência), `avaliarSla`
  (previsto vs real vs cumprido), `resumoSlaMensal` (por mês de conclusão), `taxaSlaGeral`.
  Reaproveita `horasEntre` do domínio de chamados. `sla.test.ts` (8 casos).

## Frontend
- `src/pages/empresa/ContratoPage.tsx` (`/empresa/contrato`) — KPIs (recebidos, concluídos,
  % SLA cumprido, tempo médio), BarChart "% no prazo" por mês (recharts), tabela mensal,
  export **CSV** do SLA mensal (papaparse). Escopo via RLS (empresa só vê seus chamados).
- Item "Meu contrato" no `EmpresaShell` + rota em `router.tsx`.

## Verificação
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ |
| `eslint .` | exit 0 |
| `vitest run` | 63 passed (13 files) |

## Decisões / fora de escopo (transparência)
- **Sem tabela `sla_log` persistida**: o SLA é calculado on-the-fly a partir de `chamados`
  (`created_at`, `data_conclusao`, `urgencia`/`sla_horas`). Suficiente p/ relatório. Para
  faturamento auditável (snapshot imutável por mês), um `sla_log` persistido é melhoria futura.
- Relatório do lado da Secretaria já existe no painel do Sprint 6; aqui é a visão da empresa.
- Export PDF não incluído nesta página (só CSV) — reaproveitar `relatorioPdf` é trivial se pedido.

## Próximo (Sprint 9)
LGPD/segurança · depois Sprint 10 (Beta SEMED Altamira).
