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
  empresa_id?: string | null;
  descricao: string;
  numero_protocolo: string | null;
}

// SLA convencionado por urgência (usado no relatório de SLA e para
// distinguir "dentro do prazo" vs "atrasado"). Ajustável no futuro para
// vir do contrato/tenant.
export const SLA_HORAS_POR_URGENCIA: Record<Urgencia, number> = {
  critica: 4,
  alta: 24,
  media: 72,
  baixa: 168,
};

export interface LinhaUnidade { unidadeId: string; nome: string; total: number; concluidos: number; }
export interface LinhaDetalhe { rotulo: string; total: number; concluidos: number; }
// Detalhamento por chamado, agrupado por escola (exclui cancelados).
export interface LinhaEscola { unidadeId: string; nome: string; emAndamento: number; concluidos: number; pct: number; }
export interface LinhaEmpresa { empresaId: string; nome: string; total: number; concluidos: number; emAberto: number; tempoMedioHoras: number | null; taxaPct: number; }
export interface LinhaSla { urgencia: string; slaHoras: number; total: number; concluidos: number; dentroSla: number; foraSla: number; pctDentro: number; tempoMedioHoras: number | null; }
export interface PontoDia { dia: string; total: number; }
export interface PontoMes { mes: string; rotulo: string; total: number; concluidos: number; taxaPct: number; }
export interface ChamadoLinha { data: string; protocolo: string; descricao: string; unidade: string; urgencia: string; status: string; }

export interface DadosRelatorio {
  total: number;
  concluidos: number;
  emAberto: number;
  taxaPct: number;
  tempoMedioHoras: number | null;
  porUnidade: LinhaUnidade[];
  porUrgencia: LinhaDetalhe[];
  porEscola: LinhaEscola[];
  porEmpresa: LinhaEmpresa[];
  porSla: LinhaSla[];
  porDia: PontoDia[];
  porMes: PontoMes[];
  chamados: ChamadoLinha[];
}

function ehConcluido(c: ChamadoRel) { return c.status === "concluido"; }
function emAberto(c: ChamadoRel) { return c.status !== "concluido" && c.status !== "cancelado"; }

export function dataBR(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Filtra por intervalo [de, ate] (datas YYYY-MM-DD, inclusivas), unidade,
// empresa, urgência e status. Todos opcionais e combinaveis.
export function filtrar(
  chamados: ChamadoRel[],
  opts: {
    de?: string; ate?: string; unidadeId?: string;
    empresaId?: string; urgencia?: string; status?: string;
  },
): ChamadoRel[] {
  const deMs = opts.de ? new Date(`${opts.de}T00:00:00`).getTime() : -Infinity;
  const ateMs = opts.ate ? new Date(`${opts.ate}T23:59:59`).getTime() : Infinity;
  return chamados.filter((c) => {
    if (opts.unidadeId && c.unidade_id !== opts.unidadeId) return false;
    if (opts.empresaId && c.empresa_id !== opts.empresaId) return false;
    if (opts.urgencia && c.urgencia !== opts.urgencia) return false;
    if (opts.status && c.status !== opts.status) return false;
    const t = new Date(c.created_at).getTime();
    return t >= deMs && t <= ateMs;
  });
}

export function agregar(
  chamados: ChamadoRel[],
  nomeUnidade: (id: string) => string,
  nomeEmpresa?: (id: string) => string,
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

  // Detalhamento por chamado, agrupado por escola (exclui cancelados).
  const mapE = new Map<string, LinhaEscola>();
  for (const c of chamados) {
    if (c.status === "cancelado") continue;
    const l = mapE.get(c.unidade_id) ?? { unidadeId: c.unidade_id, nome: nomeUnidade(c.unidade_id), emAndamento: 0, concluidos: 0, pct: 0 };
    if (ehConcluido(c)) l.concluidos++; else l.emAndamento++;
    mapE.set(c.unidade_id, l);
  }
  const porEscola = [...mapE.values()]
    .map((l) => {
      const base = l.emAndamento + l.concluidos;
      return { ...l, pct: base ? Math.round((l.concluidos / base) * 100) : 0 };
    })
    .sort((a, b) => (b.emAndamento + b.concluidos) - (a.emAndamento + a.concluidos));

  // Volume por dia (ordenado por data).
  const mapD = new Map<string, number>();
  for (const c of chamados) {
    const dia = c.created_at.slice(0, 10);
    mapD.set(dia, (mapD.get(dia) ?? 0) + 1);
  }
  const porDia: PontoDia[] = [...mapD.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, n]) => ({ dia: `${dia.slice(8, 10)}/${dia.slice(5, 7)}`, total: n }));

  // Por empresa (só chamados atribuídos, com empresa_id).
  const mapEmp = new Map<string, { total: number; concluidos: number; horas: number[] }>();
  const nomeEmpresaFn = nomeEmpresa ?? ((id: string) => id);
  for (const c of chamados) {
    if (!c.empresa_id) continue;
    const l = mapEmp.get(c.empresa_id) ?? { total: 0, concluidos: 0, horas: [] };
    l.total++;
    if (ehConcluido(c)) {
      l.concluidos++;
      if (c.data_conclusao) l.horas.push(horasEntre(c.created_at, c.data_conclusao));
    }
    mapEmp.set(c.empresa_id, l);
  }
  const porEmpresa: LinhaEmpresa[] = [...mapEmp.entries()].map(([id, l]) => ({
    empresaId: id,
    nome: nomeEmpresaFn(id),
    total: l.total,
    concluidos: l.concluidos,
    emAberto: l.total - l.concluidos,
    tempoMedioHoras: l.horas.length ? l.horas.reduce((a, b) => a + b, 0) / l.horas.length : null,
    taxaPct: l.total ? Math.round((l.concluidos / l.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  // SLA por urgência: usa SLA_HORAS_POR_URGENCIA como referência.
  const porSla: LinhaSla[] = URGENCIAS.map((u) => {
    const lista = chamados.filter((c) => c.urgencia === u);
    const concluidosLista = lista.filter(ehConcluido);
    const slaH = SLA_HORAS_POR_URGENCIA[u as Urgencia];
    let dentro = 0, fora = 0;
    const horas: number[] = [];
    for (const c of concluidosLista) {
      if (!c.data_conclusao) continue;
      const h = horasEntre(c.created_at, c.data_conclusao);
      horas.push(h);
      if (h <= slaH) dentro++; else fora++;
    }
    return {
      urgencia: URGENCIA_META[u as Urgencia].label,
      slaHoras: slaH,
      total: lista.length,
      concluidos: concluidosLista.length,
      dentroSla: dentro,
      foraSla: fora,
      pctDentro: concluidosLista.length ? Math.round((dentro / concluidosLista.length) * 100) : 0,
      tempoMedioHoras: horas.length ? horas.reduce((a, b) => a + b, 0) / horas.length : null,
    };
  });

  // Comparativo dos últimos 12 meses (por created_at). Mostra volume e
  // taxa de conclusão mês a mês — útil pra tendência.
  const mapM = new Map<string, { total: number; concluidos: number }>();
  for (const c of chamados) {
    const mes = c.created_at.slice(0, 7); // YYYY-MM
    const l = mapM.get(mes) ?? { total: 0, concluidos: 0 };
    l.total++;
    if (ehConcluido(c)) l.concluidos++;
    mapM.set(mes, l);
  }
  const porMes: PontoMes[] = [...mapM.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, l]) => {
      const [a, m] = mes.split("-");
      const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      return {
        mes,
        rotulo: `${nomes[Number(m) - 1]}/${a?.slice(2)}`,
        total: l.total,
        concluidos: l.concluidos,
        taxaPct: l.total ? Math.round((l.concluidos / l.total) * 100) : 0,
      };
    });

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
    porEscola,
    porEmpresa,
    porSla,
    porDia,
    porMes,
    chamados: chamadosLin,
  };
}

export function fmtHoras(h: number | null): string {
  if (h == null) return "—";
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}
