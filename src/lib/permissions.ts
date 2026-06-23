// ─── Domínio puro: papéis e permissões ───────────────────────────────────────
// Espelha a tabela de roles do prompt. hasPermission é replicado no backend
// (Edge Function) — aqui serve para esconder UI. Servidor é a fonte de verdade.

export const ROLES = [
  "superadmin",
  "admin_secretaria",
  "gestor_secretaria",
  "responsavel_unidade",
  "tecnico_secretaria",
  "empresa_admin",
  "tecnico_empresa",
] as const;
export type Role = (typeof ROLES)[number];

// Ações de alto nível por recurso. Expandido conforme sprints avançam.
export type Action = "create" | "read" | "update" | "delete" | "assign" | "execute" | "sign";
export type Resource =
  | "tenant"
  | "user"
  | "unidade"
  | "equipamento"
  | "empresa"
  | "contrato"
  | "chamado"
  | "relatorio";

type Matrix = Partial<Record<Role, Partial<Record<Resource, readonly Action[]>>>>;

// "*" = todas as ações. Definição mínima do Sprint 0; refinada por sprint.
const ALL: readonly Action[] = ["create", "read", "update", "delete", "assign", "execute", "sign"];

const MATRIX: Matrix = {
  superadmin: { tenant: ALL, contrato: ALL, relatorio: ["read"] },
  admin_secretaria: {
    user: ALL, unidade: ALL, equipamento: ALL, empresa: ALL,
    contrato: ALL, chamado: ALL, relatorio: ["read", "create"],
  },
  gestor_secretaria: {
    unidade: ["read"], equipamento: ["read"], chamado: ["read", "update", "assign"],
    relatorio: ["read", "create"],
  },
  responsavel_unidade: { chamado: ["create", "read", "sign"], unidade: ["read"] },
  tecnico_secretaria: { chamado: ["read", "execute", "sign"] },
  empresa_admin: { chamado: ["read", "assign"], contrato: ["read"], relatorio: ["read"] },
  tecnico_empresa: { chamado: ["read", "execute", "sign"] },
};

export function hasPermission(role: Role, action: Action, resource: Resource): boolean {
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}
