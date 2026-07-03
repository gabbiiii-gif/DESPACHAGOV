// ─── Especialidades de empresa (guiam a atribuição de serviços) ──────────────
// Os 4 termos canônicos usados no cadastro da empresa e na triagem. Guardados
// como texto no array unidades... digo, empresas.especialidades. Sem React.

export const ESPECIALIDADES = [
  "Manutenção predial",
  "Manutenção de refrigeração",
  "Manutenção de ar-condicionado",
  "Instalação de ar-condicionado",
] as const;
export type Especialidade = (typeof ESPECIALIDADES)[number];

// Filtra empresas que atendem a especialidade dada; string vazia = todas.
export function filtrarEmpresasPorEspecialidade<T extends { especialidades: string[] }>(
  empresas: T[],
  esp: string,
): T[] {
  if (!esp) return empresas;
  return empresas.filter((e) => e.especialidades.includes(esp));
}
