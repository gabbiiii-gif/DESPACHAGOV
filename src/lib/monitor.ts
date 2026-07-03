// Domínio puro do monitoramento de erros + análise por IA.
// Importado pelo front (vitest) e pela Edge Function ai-monitor (Deno).

export interface ErroRegistro {
  fonte: string;
  nivel: string;
  mensagem: string;
  created_at: string;
}

export interface GrupoErro {
  mensagem: string;
  fonte: string;
  ocorrencias: number;
  ultima: string;
}

// Agrupa por (fonte, mensagem), conta e guarda a ocorrência mais recente.
export function agruparErros(erros: ErroRegistro[]): GrupoErro[] {
  const mapa = new Map<string, GrupoErro>();
  for (const e of erros) {
    const chave = `${e.fonte}::${e.mensagem}`;
    const g = mapa.get(chave);
    if (g) {
      g.ocorrencias++;
      if (e.created_at > g.ultima) g.ultima = e.created_at;
    } else {
      mapa.set(chave, { mensagem: e.mensagem, fonte: e.fonte, ocorrencias: 1, ultima: e.created_at });
    }
  }
  return [...mapa.values()].sort((a, b) => b.ocorrencias - a.ocorrencias);
}

// Throttle/dedupe puro: evita reportar a mesma mensagem em rajada.
export function deveReportar(
  mensagem: string,
  agora: number,
  ultimos: Map<string, number>,
  silencioMs = 30_000,
): boolean {
  const ult = ultimos.get(mensagem);
  if (ult != null && agora - ult < silencioMs) return false;
  ultimos.set(mensagem, agora);
  return true;
}

// ── Análise por IA ───────────────────────────────────────────────────────────
export const PROMPT_MONITOR =
  "Você é um engenheiro de confiabilidade (SRE) sênior analisando a saúde do DespachaGov, " +
  "um SaaS de chamados de manutenção pública (React + Supabase/Postgres + Edge Functions Deno). " +
  "Recebe erros agrupados (mensagem, fonte, nº de ocorrências, data da última). Analise a fundo e seja específico e técnico, evitando generalidades:\n" +
  "- resumo: diagnóstico executivo curto — o que está acontecendo e a CAUSA-RAIZ mais provável dos clusters relevantes.\n" +
  "- riscos: problemas FUTUROS/latentes prováveis se nada for feito (efeitos em cascata, perda de dados, segurança/RLS, indisponibilidade), do mais provável ao menos.\n" +
  "- recomendacoes: correções CONCRETAS e acionáveis (o que mudar e onde) priorizadas, incluindo melhorias preventivas para evitar reincidência.\n" +
  "Responda apenas com o JSON do schema, em português.";

export const ANALISE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumo: { type: "string" },
    riscos: { type: "array", items: { type: "string" } },
    recomendacoes: { type: "array", items: { type: "string" } },
  },
  required: ["resumo", "riscos", "recomendacoes"],
} as const;

export interface AnaliseErros {
  resumo: string;
  riscos: string[];
  recomendacoes: string[];
}

export function promptErros(grupos: GrupoErro[]): string {
  if (grupos.length === 0) return "Nenhum erro registrado no período.";
  const linhas = grupos
    .slice(0, 50)
    .map((g) => `- [${g.ocorrencias}x] (${g.fonte}) ${g.mensagem} — última: ${g.ultima}`);
  return `Erros agrupados (mais frequentes primeiro):\n${linhas.join("\n")}`;
}

export function validarAnalise(raw: unknown): AnaliseErros | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.resumo !== "string") return null;
  const lista = (v: unknown): string[] => (Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : []);
  return { resumo: o.resumo, riscos: lista(o.riscos), recomendacoes: lista(o.recomendacoes) };
}
