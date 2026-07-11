// Redaction de dados sensiveis antes de logar erros no error_log (LGPD).
// Rejeicoes cruas do PostgREST costumam trazer payload com CPF/email/etc.
// no `details`/`hint`; sem esta camada, o log agregado vira violacao.
//
// Estrategia: substituicao por token do tipo [CPF], [EMAIL], mantendo o
// SHAPE da mensagem para o operador entender o contexto sem ver o valor.

// Lookbehind/lookahead (?<!\d) / (?!\d) evitam sobreposicao entre CPF
// (11 digitos) e telefone/CEP quando aparecem sem formatacao. Ordem:
// mais especifico → menos especifico.
const REGRAS: Array<{ nome: string; re: RegExp; token: string }> = [
  // CNPJ: 00.000.000/0000-00 ou 14 digitos.
  { nome: "cnpj", re: /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g, token: "[CNPJ]" },
  // Telefone BR formatado: (00) 90000-0000 / 00 90000-0000 / +55...
  { nome: "telefone-fmt", re: /(?:\+?55\s?)?\(\d{2}\)\s?9?\d{4}[-\s.]?\d{4}(?!\d)|(?<!\d)\d{2}\s9?\d{4}[-\s.]?\d{4}(?!\d)|(?<!\d)9\d{4}-\d{4}(?!\d)/g, token: "[TELEFONE]" },
  // CPF: 000.000.000-00 (formatado) ou 11 digitos crus.
  { nome: "cpf", re: /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, token: "[CPF]" },
  // Email.
  { nome: "email", re: /\b[\w.+-]+@[\w-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?\b/g, token: "[EMAIL]" },
  // CEP: 00000-000 (formato) — 8 digitos crus ficam ambiguos com CPF/telefone.
  { nome: "cep", re: /(?<!\d)\d{5}-\d{3}(?!\d)/g, token: "[CEP]" },
];

// Chaves de objeto cujo VALOR inteiro é sensivel — redigidas sem tentar
// aplicar regex (evita vazar por formato inesperado).
const CHAVES_SENSIVEIS = new Set([
  "cpf", "cnpj", "email", "telefone", "phone", "senha", "password", "token",
  "access_token", "refresh_token", "authorization", "descricao", "endereco",
  "rua", "logradouro", "solicitante_nome", "diretora_nome", "diretora_telefone",
  "secretaria_nome", "secretaria_telefone", "coordenadora_nome",
  "coordenadora_telefone", "signatario_nome",
]);

export function redigirTexto(s: string): string {
  let out = s;
  for (const r of REGRAS) out = out.replace(r.re, r.token);
  return out;
}

export function redigirValor(v: unknown, chave?: string): unknown {
  if (v == null) return v;
  if (typeof v === "string") {
    if (chave && CHAVES_SENSIVEIS.has(chave.toLowerCase())) return "[REDACTED]";
    return redigirTexto(v);
  }
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => redigirValor(x));
  if (typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      o[k] = redigirValor(val, k);
    }
    return o;
  }
  return v;
}
