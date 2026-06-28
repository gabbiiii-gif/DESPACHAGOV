// Domínio puro dos relatórios: agrega chamados em dados prontos para render
// e exportação. Sem React/Supabase.
import { STATUS_META, URGENCIAS, URGENCIA_META, horasEntre, type Status, type Urgencia } from "./chamados";

export interface ChamadoRel {
  status: string;
  urgencia: string | null;
  created_at: string;
  data_atendimento: string | null;
  data_conclusao: string | null;
  unidade_id: string;
  descricao: string;
  numero_protocolo: string | null;
}

export interface LinhaUnidade { unidadeId: string; nome: string; total: number; concluidos: number; }
export interface LinhaDetalhe { rotulo: string; total: number; concluidos: number; }
export interface PontoDia { dia: string; total: number; }
export interface ChamadoLinha { data: string; protocolo: string; descricao: string; unidade: string; urgencia: string; status: string; }

export interface DadosRelatorio {
  total: number;
  concluidos: number;
  emAberto: number;
  taxaPct: number;
  tempoMedioHoras: number | null;
  porUnidade: LinhaUnidade[];
  porUrgencia: LinhaDetalhe[];
  porDia: PontoDia[];
  chamados: ChamadoLinha[];
}

function ehConcluido(c: ChamadoRel) { return c.status === "concluido"; }
function emAberto(c: ChamadoRel) { return c.status !== "concluido" && c.status !== "cancelado"; }

export function dataBR(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Filtra por intervalo [de, ate] (datas YYYY-MM-DD, inclusivas) e unidade.
export function filtrar(
  chamados: ChamadoRel[],
  opts: { de?: string; ate?: string; unidadeId?: string },
): ChamadoRel[] {
  const deMs = opts.de ? new Date(`${opts.de}T00:00:00`).getTime() : -Infinity;
  const ateMs = opts.ate ? new Date(`${opts.ate}T23:59:59`).getTime() : Infinity;
  return chamados.filter((c) => {
    if (opts.unidadeId && c.unidade_id !== opts.unidadeId) return false;
    const t = new Date(c.created_at).getTime();
    return t >= deMs && t <= ateMs;
  });
}

export function agregar(
  chamados: ChamadoRel[],
  nomeUnidade: (id: string) => string,
): DadosRelatorio {
  const total = chamados.length;
  const concluidos = chamados.filter(ehConcluido).length;
  const base = chamados.filter((c) => c.status !== "cancelado").length;
  const taxaPct = base === 0 ? 0 : Math.round((concluidos / base) * 100);

  const durs: number[] = [];
  for (const c of chamados) if (c.data_conclusao) durs.push(horasEntre(c.created_at, c.data_conclusao));
  const tempoMedioHoras = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null;

  // Por unidade (ordenado por total desc).
  const mapU = new Map<string, LinhaUnidade>();
  for (const c of chamados) {
    const l = mapU.get(c.unidade_id) ?? { unidadeId: c.unidade_id, nome: nomeUnidade(c.unidade_id), total: 0, concluidos: 0 };
    l.total++;
    if (ehConcluido(c)) l.concluidos++;
    mapU.set(c.unidade_id, l);
  }
  const porUnidade = [...mapU.values()].sort((a, b) => b.total - a.total);

  // Por urgência (+ sem triagem).
  const porUrgencia: LinhaDetalhe[] = URGENCIAS.map((u) => {
    const lista = chamados.filter((c) => c.urgencia === u);
    return { rotulo: URGENCIA_META[u as Urgencia].label, total: lista.length, concluidos: lista.filter(ehConcluido).length };
  });
  const semTriagem = chamados.filter((c) => !c.urgencia);
  if (semTriagem.length) porUrgencia.push({ rotulo: "Sem triagem", total: semTriagem.length, concluidos: semTriagem.filter(ehConcluido).length });

  // Volume por dia (ordenado por data).
  const mapD = new Map<string, number>();
  for (const c of chamados) {
    const dia = c.created_at.slice(0, 10);
    mapD.set(dia, (mapD.get(dia) ?? 0) + 1);
  }
  const porDia: PontoDia[] = [...mapD.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, n]) => ({ dia: `${dia.slice(8, 10)}/${dia.slice(5, 7)}`, total: n }));

  // Lista de chamados (mais recentes primeiro).
  const chamadosLin: ChamadoLinha[] = [...chamados]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({
      data: dataBR(c.created_at),
      protocolo: c.numero_protocolo ?? "—",
      descricao: c.descricao,
      unidade: nomeUnidade(c.unidade_id),
      urgencia: c.urgencia ? URGENCIA_META[c.urgencia as Urgencia].label : "—",
      status: STATUS_META[c.status as Status]?.label ?? c.status,
    }));

  return {
    total,
    concluidos,
    emAberto: chamados.filter(emAberto).length,
    taxaPct,
    tempoMedioHoras,
    porUnidade,
    porUrgencia,
    porDia,
    chamados: chamadosLin,
  };
}

export function fmtHoras(h: number | null): string {
  if (h == null) return "—";
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}
