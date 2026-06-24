// Regras puras dos anexos da abertura de chamado (ofício/foto/pdf).
// Sem dependência do File DOM: aceita o shape mínimo { name, type, size }.

export const ANEXO_TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "application/pdf"] as const;
export const ANEXO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const ANEXO_MAX_QTD = 3;

export interface ArquivoMeta {
  name: string;
  type: string;
  size: number;
}

// Valida quantidade (1..3), tipo (png/jpg/pdf) e tamanho (≤10 MB) dos anexos.
export function validarAnexosAbertura(files: ArquivoMeta[]): { ok: boolean; erro?: string } {
  if (files.length < 1) return { ok: false, erro: "Anexe ao menos 1 arquivo (ofício, foto ou PDF)." };
  if (files.length > ANEXO_MAX_QTD) return { ok: false, erro: `Máximo de ${ANEXO_MAX_QTD} arquivos.` };
  const tipos: readonly string[] = ANEXO_TIPOS_PERMITIDOS;
  for (const f of files) {
    if (!tipos.includes(f.type)) {
      return { ok: false, erro: `Tipo não permitido em "${f.name}". Use PNG, JPG ou PDF.` };
    }
    if (f.size > ANEXO_MAX_BYTES) {
      return { ok: false, erro: `"${f.name}" é maior que 10 MB.` };
    }
  }
  return { ok: true };
}
