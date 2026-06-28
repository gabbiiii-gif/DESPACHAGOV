// Schemas Zod + helpers puros dos cadastros base (Sprint 2).
import { z } from "zod";

export const LOGRADOURO_TIPOS = [
  "Rua", "Avenida", "Travessa", "Alameda", "Rodovia", "Estrada", "Praça", "Quadra", "Outro",
] as const;

export const unidadeSchema = z.object({
  nome: z.string().min(2, "Nome da escola obrigatório"),
  codigo_inep: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  // Contatos da escola
  diretora_nome: z.string().optional(),
  diretora_telefone: z.string().optional(),
  secretaria_nome: z.string().optional(),
  secretaria_telefone: z.string().optional(),
  coordenadora_nome: z.string().optional(),
  coordenadora_telefone: z.string().optional(),
  // Endereço estruturado (geocodificação precisa)
  logradouro_tipo: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  cidade: z.string().optional(),
  zona: z.enum(["urbana", "rural"]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type UnidadeForm = z.infer<typeof unidadeSchema>;

// Monta o endereço de busca p/ geocoding a partir dos campos estruturados.
export interface EnderecoUnidade {
  logradouro_tipo?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  nome?: string | null;
}
export function enderecoParaGeocode(u: EnderecoUnidade): string {
  const rua = [u.logradouro_tipo, u.logradouro].map((p) => (p ?? "").trim()).filter(Boolean).join(" ");
  const linha1 = [rua, (u.numero ?? "").trim()].filter(Boolean).join(", ");
  const partes = [linha1, u.bairro, u.cidade, u.cep].map((p) => (p ?? "").trim()).filter(Boolean);
  const base = partes.join(", ");
  return base ? `${base}, Brasil` : (u.nome ?? "").trim();
}

export const empresaSchema = z.object({
  razao_social: z.string().min(2, "Razão social obrigatória"),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  especialidades: z.string().optional(), // CSV no form → array no service
});
export type EmpresaForm = z.infer<typeof empresaSchema>;

export const equipamentoSchema = z.object({
  unidade_id: z.string().uuid("Selecione a unidade"),
  tipo: z.string().min(2, "Tipo obrigatório"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numero_serie: z.string().optional(),
  btu: z.coerce.number().int().positive().optional(),
});
export type EquipamentoForm = z.infer<typeof equipamentoSchema>;

export const contratoSchema = z.object({
  empresa_id: z.string().uuid().optional().or(z.literal("")),
  numero_processo: z.string().optional(),
  objeto: z.string().optional(),
  vigencia_inicio: z.string().optional(),
  vigencia_fim: z.string().optional(),
  valor: z.coerce.number().nonnegative().optional(),
  status: z.enum(["vigente", "encerrado", "suspenso"]).default("vigente"),
});
export type ContratoForm = z.infer<typeof contratoSchema>;

export const tecnicoSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  especialidade: z.string().optional(),
});
export type TecnicoForm = z.infer<typeof tecnicoSchema>;

// ─── CSV de unidades (import em massa) ───────────────────────────────────────
export interface LinhaUnidadeCsv {
  nome: string;
  codigo_inep?: string;
  endereco?: string;
  bairro?: string;
  zona?: "urbana" | "rural";
  lat?: number;
  lng?: number;
  responsavel?: string;
}

// Normaliza uma linha do CSV (objeto col→valor) numa unidade válida ou erro.
export function normalizarLinhaUnidade(
  row: Record<string, string>,
): { ok: true; data: LinhaUnidadeCsv } | { ok: false; motivo: string } {
  const get = (k: string) => (row[k] ?? row[k.toLowerCase()] ?? "").trim();
  const nome = get("nome");
  if (!nome) return { ok: false, motivo: "nome vazio" };

  const zonaRaw = get("zona").toLowerCase();
  const zona = zonaRaw === "urbana" || zonaRaw === "rural" ? (zonaRaw as "urbana" | "rural") : undefined;
  const latN = Number(get("lat").replace(",", "."));
  const lngN = Number(get("lng").replace(",", "."));

  const data: LinhaUnidadeCsv = { nome };
  const inep = get("codigo_inep") || get("inep");
  if (inep) data.codigo_inep = inep;
  if (get("endereco")) data.endereco = get("endereco");
  if (get("bairro")) data.bairro = get("bairro");
  if (zona) data.zona = zona;
  if (get("lat") && !Number.isNaN(latN)) data.lat = latN;
  if (get("lng") && !Number.isNaN(lngN)) data.lng = lngN;
  if (get("responsavel")) data.responsavel = get("responsavel");
  return { ok: true, data };
}
