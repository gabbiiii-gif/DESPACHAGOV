// Domínio puro dos indicadores do painel da Secretaria.
// Sem React/Supabase: agrega uma lista de chamados em métricas testáveis.
import { STATUS, URGENCIAS, horasEntre, type Status, type Urgencia } from "./chamados";

export interface ChamadoKpi {
  status: string;
  urgencia: string | null;
  created_at: string;
  data_atendimento: string | null;
  data_conclusao: string | null;
}

// Contagem por status (todos os status presentes, zerados quando ausentes).
export function contarPorStatus(chamados: ChamadoKpi[]): Record<Status, number> {
  const acc = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;
  for (const c of chamados) {
    if ((STATUS as readonly string[]).includes(c.status)) acc[c.status as Status]++;
  }
  return acc;
}

export type UrgenciaBucket = Urgencia | "sem_triagem";

// Contagem por urgência; urgência nula (aguardando triagem) cai em "sem_triagem".
export function contarPorUrgencia(chamados: ChamadoKpi[]): Record<UrgenciaBucket, number> {
  const acc = {
    ...Object.fromEntries(URGENCIAS.map((u) => [u, 0])),
    sem_triagem: 0,
  } as Record<UrgenciaBucket, number>;
  for (const c of chamados) {
    if (c.urgencia && (URGENCIAS as readonly string[]).includes(c.urgencia)) acc[c.urgencia as Urgencia]++;
    else acc.sem_triagem++;
  }
  return acc;
}

// Concluídos / (total − cancelados). Faixa 0..1. Zero quando não há base.
export function taxaConclusao(chamados: ChamadoKpi[]): number {
  const base = chamados.filter((c) => c.status !== "cancelado").length;
  if (base === 0) return 0;
  const ok = chamados.filter((c) => c.status === "concluido").length;
  return ok / base;
}

// Média de horas entre abertura e um marco, só dos que têm o marco. null se nenhum.
function tempoMedio(chamados: ChamadoKpi[], marco: (c: ChamadoKpi) => string | null): number | null {
  const durs: number[] = [];
  for (const c of chamados) {
    const fim = marco(c);
    if (fim) durs.push(horasEntre(c.created_at, fim));
  }
  if (durs.length === 0) return null;
  return durs.reduce((a, b) => a + b, 0) / durs.length;
}

export function tempoMedioAtendimentoHoras(chamados: ChamadoKpi[]): number | null {
  return tempoMedio(chamados, (c) => c.data_atendimento);
}

export function tempoMedioConclusaoHoras(chamados: ChamadoKpi[]): number | null {
  return tempoMedio(chamados, (c) => c.data_conclusao);
}

export interface PontoMensal {
  mes: string; // AAAA-MM
  total: number;
  concluidos: number;
}

// Série dos últimos N meses por mês de abertura: total aberto e quantos concluídos.
export function serieMensal(chamados: ChamadoKpi[], nMeses = 6, hoje = new Date()): PontoMensal[] {
  const meses: string[] = [];
  for (let i = nMeses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const idx = new Map<string, PontoMensal>(meses.map((m) => [m, { mes: m, total: 0, concluidos: 0 }]));
  for (const c of chamados) {
    const m = c.created_at.slice(0, 7); // AAAA-MM
    const ponto = idx.get(m);
    if (!ponto) continue;
    ponto.total++;
    if (c.status === "concluido") ponto.concluidos++;
  }
  return meses.map((m) => idx.get(m) as PontoMensal);
}
