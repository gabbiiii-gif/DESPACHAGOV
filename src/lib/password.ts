// Regras de senha (puras, testáveis). Espelhadas no UI (checklist ao vivo).
// Requisitos: >=8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial.

export interface RegrasSenha {
  tamanho: boolean; // >= 8
  maiuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  especial: boolean;
}

export const REGRAS_SENHA_LABEL: Record<keyof RegrasSenha, string> = {
  tamanho: "Mínimo 8 caracteres",
  maiuscula: "1 letra maiúscula",
  minuscula: "1 letra minúscula",
  numero: "1 número",
  especial: "1 caractere especial (ex: ! ? @ #)",
};

export function checarSenha(senha: string): RegrasSenha {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /[0-9]/.test(senha),
    especial: /[^A-Za-z0-9]/.test(senha),
  };
}

export function senhaValida(senha: string): boolean {
  return Object.values(checarSenha(senha)).every(Boolean);
}
