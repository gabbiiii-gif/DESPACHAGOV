// ─── Domínio puro: escolha de unidade na abertura de chamado ──────────────────
// Diretor (responsavel_unidade) é vinculado a N escolas via
// unidades.responsavel_user_id. Na abertura, decide se ele nem escolhe (1 escola),
// escolhe entre as dele (2+) ou cai no fallback com todas (0 vínculos = legado).
// Sem React, sem Supabase — testável isolado.

// Forma mínima exigida; aceita a Row completa de `unidades` via genérico.
type ComVinculo = { responsavel_user_id: string | null };

export type ResolucaoAbertura<T> =
  | { modo: "travado"; unidade: T }
  | { modo: "select"; unidades: T[] }
  | { modo: "fallback"; unidades: T[] };

export function resolverUnidadesAbertura<T extends ComVinculo>(
  unidades: T[],
  userId: string,
): ResolucaoAbertura<T> {
  const minhas = unidades.filter((u) => u.responsavel_user_id === userId);
  const [primeira] = minhas;
  if (minhas.length === 1 && primeira) return { modo: "travado", unidade: primeira };
  if (minhas.length >= 2) return { modo: "select", unidades: minhas };
  return { modo: "fallback", unidades };
}
