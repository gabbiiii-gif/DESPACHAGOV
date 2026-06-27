// Domínio puro do agente de triagem por IA. Sem rede: categorias, schema de
// saída estruturada, prompt e validação. Importado pelo front (vitest) e pela
// Edge Function ai-agent (Deno) via cross-import.
import { URGENCIAS, type Urgencia } from "./chamados";

export const CATEGORIAS = [
  "eletrica",
  "hidraulica",
  "estrutural",
  "climatizacao",
  "mobiliario",
  "equipamento",
  "limpeza",
  "outros",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_META: Record<Categoria, string> = {
  eletrica: "Elétrica",
  hidraulica: "Hidráulica",
  estrutural: "Estrutural",
  climatizacao: "Climatização",
  mobiliario: "Mobiliário",
  equipamento: "Equipamento",
  limpeza: "Limpeza",
  outros: "Outros",
};

export interface SugestaoTriagem {
  urgencia: Urgencia;
  categoria: Categoria;
  justificativa: string;
}

// JSON schema p/ structured outputs (output_config.format) da Messages API.
export const SUGESTAO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    urgencia: { type: "string", enum: [...URGENCIAS] },
    categoria: { type: "string", enum: [...CATEGORIAS] },
    justificativa: { type: "string" },
  },
  required: ["urgencia", "categoria", "justificativa"],
} as const;

export const PROMPT_SISTEMA =
  "Você é um agente de triagem de chamados de manutenção predial de órgãos públicos. " +
  "Classifique a urgência e a categoria a partir da descrição do solicitante. " +
  "Urgência: baixa (estético/não atrapalha o uso), media (atrapalha mas há alternativa), " +
  "alta (compromete o uso do espaço), critica (risco à segurança/saúde ou interrupção total). " +
  "Responda apenas com o JSON do schema; a justificativa deve ter uma frase curta em português.";

export function promptUsuario(descricao: string): string {
  return `Descrição do chamado:\n"""${descricao.trim()}"""`;
}

// Valida e estreita a saída do modelo ao domínio. Retorna null se inválida.
export function validarSugestao(raw: unknown): SugestaoTriagem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!(URGENCIAS as readonly unknown[]).includes(o.urgencia)) return null;
  if (!(CATEGORIAS as readonly unknown[]).includes(o.categoria)) return null;
  return {
    urgencia: o.urgencia as Urgencia,
    categoria: o.categoria as Categoria,
    justificativa: typeof o.justificativa === "string" ? o.justificativa : "",
  };
}
