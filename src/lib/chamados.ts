// ─── Domínio puro: Chamados ──────────────────────────────────────────────────
// Portado de escola-export/lib/escola.js → TypeScript estrito.
// Sem React, sem Supabase. Lógica de urgência, máquina de estados e transições.
// Persistência (Postgres/RLS) fica nos services; aqui só regra de negócio testável.
//
// Mudanças vs. escola.js:
//   - Vocabulário de urgência TRAVADO: baixa/media/alta/critica (decisão Sprint 0).
//   - Estados expandidos p/ fluxo B2G (atribuição de empresa/técnico + execução em campo).

export const URGENCIAS = ["baixa", "media", "alta", "critica"] as const;
export type Urgencia = (typeof URGENCIAS)[number];

export const URGENCIA_META: Record<Urgencia, { label: string; rank: number; cor: string }> = {
  baixa: { label: "Baixa", rank: 0, cor: "var(--color-cinza-secundario)" },
  media: { label: "Média", rank: 1, cor: "var(--color-azul-info)" },
  alta: { label: "Alta", rank: 2, cor: "var(--color-laranja-acento)" },
  critica: { label: "Crítica", rank: 3, cor: "var(--color-vermelho-critico)" },
};

export function isUrgencia(v: unknown): v is Urgencia {
  return typeof v === "string" && (URGENCIAS as readonly string[]).includes(v);
}

// ─── Máquina de estados do chamado ───────────────────────────────────────────
// aberto → atribuido → em_campo → concluido. Cancelado a partir de qualquer
// estado não-terminal. Concluido/cancelado são terminais (reabertura só via admin).
export const STATUS = [
  "aberto",
  "atribuido",
  "em_campo",
  "concluido",
  "cancelado",
] as const;
export type Status = (typeof STATUS)[number];

export const STATUS_META: Record<Status, { label: string; cor: string }> = {
  aberto: { label: "Aberto", cor: "var(--color-amarelo-atencao)" },
  atribuido: { label: "Atribuído", cor: "var(--color-azul-info)" },
  em_campo: { label: "Em campo", cor: "var(--color-azul-principal)" },
  concluido: { label: "Concluído", cor: "var(--color-verde-sucesso)" },
  cancelado: { label: "Cancelado", cor: "var(--color-cinza-desabilitado)" },
};

const TRANSICOES: Record<Status, readonly Status[]> = {
  aberto: ["atribuido", "cancelado"],
  atribuido: ["em_campo", "aberto", "cancelado"], // pode devolver à fila
  em_campo: ["concluido", "atribuido", "cancelado"],
  concluido: [], // terminal
  cancelado: ["aberto"], // admin reabre
};

export function podeTransicionar(de: Status, para: Status): boolean {
  return TRANSICOES[de].includes(para);
}

export function proximosEstados(de: Status): readonly Status[] {
  return TRANSICOES[de];
}

// ─── Validação de anexo (ofício/foto) ────────────────────────────────────────
export const ANEXO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export type ResultadoValidacao = { ok: true } | { ok: false; motivo: string };

export function validarAnexo(file: { type?: string; size: number } | null | undefined): ResultadoValidacao {
  if (!file) return { ok: false, motivo: "Arquivo inválido" };
  const tipo = file.type ?? "";
  const tipoOk = tipo === "application/pdf" || tipo.startsWith("image/");
  if (!tipoOk) return { ok: false, motivo: "Apenas PDF ou imagem" };
  if (file.size > ANEXO_MAX_BYTES) return { ok: false, motivo: "Máximo 10 MB por arquivo" };
  return { ok: true };
}

// ─── SLA ──────────────────────────────────────────────────────────────────────
// Horas decorridas entre dois ISO timestamps (sempre positiva).
export function horasEntre(isoInicio: string, isoFim: string): number {
  const ms = Math.abs(new Date(isoFim).getTime() - new Date(isoInicio).getTime());
  return ms / (1000 * 60 * 60);
}

// SLA cumprido se atendimento ≤ prazo definido. Base do sla_log (modelo comercial).
export function slaCumprido(slaDefinidoHoras: number, slaRealHoras: number): boolean {
  return slaRealHoras <= slaDefinidoHoras;
}
