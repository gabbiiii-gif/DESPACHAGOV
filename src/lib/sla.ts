// Domínio puro de SLA — base do faturamento por desempenho.
// Reaproveita horasEntre do domínio de chamados; sem React/Supabase.
import { horasEntre, type Urgencia } from "./chamados";

// Prazo de atendimento padrão por urgência (horas). Base contratual quando o
// chamado não traz sla_horas explícito.
export const PRAZO_PADRAO_HORAS: Record<Urgencia, number> = {
  critica: 4,
  alta: 24,
  media: 72,
  baixa: 168,
};

export interface ChamadoSla {
  urgencia: string | null;
  sla_horas: number | null;
  created_at: string;
  data_conclusao: string | null;
  status: string;
}

// Prazo previsto (horas): sla_horas do chamado, senão o padrão da urgência.
// Urgência nula (sem triagem) → null (prazo ainda indefinido).
export function prazoPrevistoHoras(c: ChamadoSla): number | null {
  if (c.sla_horas != null) return c.sla_horas;
  if (c.urgencia && c.urgencia in PRAZO_PADRAO_HORAS) {
    return PRAZO_PADRAO_HORAS[c.urgencia as Urgencia];
  }
  return null;
}

export interface AvaliacaoSla {
  previsto: number | null;
  real: number | null; // horas até a conclusão (null se não concluído)
  cumprido: boolean | null; // null se sem prazo ou ainda não concluído
}

export function avaliarSla(c: ChamadoSla): AvaliacaoSla {
  const previsto = prazoPrevistoHoras(c);
  const real = c.data_conclusao ? horasEntre(c.created_at, c.data_conclusao) : null;
  const cumprido = previsto != null && real != null ? real <= previsto : null;
  return { previsto, real, cumprido };
}

export interface PontoSlaMensal {
  mes: string; // AAAA-MM
  concluidos: number;
  no_prazo: number;
  taxa: number; // 0..1 (no_prazo / avaliáveis)
}

// Desempenho de SLA por mês de CONCLUSÃO (base de faturamento). Últimos N meses.
export function resumoSlaMensal(chamados: ChamadoSla[], nMeses = 6, hoje = new Date()): PontoSlaMensal[] {
  const meses: string[] = [];
  for (let i = nMeses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const idx = new Map<string, { mes: string; concluidos: number; no_prazo: number; avaliaveis: number }>(
    meses.map((m) => [m, { mes: m, concluidos: 0, no_prazo: 0, avaliaveis: 0 }]),
  );
  for (const c of chamados) {
    if (c.status !== "concluido" || !c.data_conclusao) continue;
    const ponto = idx.get(c.data_conclusao.slice(0, 7));
    if (!ponto) continue;
    ponto.concluidos++;
    const { cumprido } = avaliarSla(c);
    if (cumprido != null) {
      ponto.avaliaveis++;
      if (cumprido) ponto.no_prazo++;
    }
  }
  return meses.map((m) => {
    const p = idx.get(m) as { mes: string; concluidos: number; no_prazo: number; avaliaveis: number };
    return {
      mes: p.mes,
      concluidos: p.concluidos,
      no_prazo: p.no_prazo,
      taxa: p.avaliaveis ? p.no_prazo / p.avaliaveis : 0,
    };
  });
}

// Taxa de SLA agregada (todos os concluídos avaliáveis). 0..1.
export function taxaSlaGeral(chamados: ChamadoSla[]): number {
  let avaliaveis = 0;
  let noPrazo = 0;
  for (const c of chamados) {
    const { cumprido } = avaliarSla(c);
    if (cumprido != null) {
      avaliaveis++;
      if (cumprido) noPrazo++;
    }
  }
  return avaliaveis ? noPrazo / avaliaveis : 0;
}
