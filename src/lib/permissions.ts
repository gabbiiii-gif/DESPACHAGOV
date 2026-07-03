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
  // Papéis novos (rótulos na UI; ver ROLE_LABEL em UsuariosPage).
  "secretaria_semed", // SEMED — só leitura
  "engenheiro", // = Chefe de divisão, sem cadastrar usuários
  "arquiteto", // idem engenheiro
  "manutencao_predial", // empresas (agem como empresa_admin)
  "manutencao_refrigeracao",
  "manutencao_ar_condicionado",
  "instalacao_ar_condicionado",
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

  // SEMED: só visualiza o fluxo — nenhuma ação de escrita.
  secretaria_semed: {
    chamado: ["read"], unidade: ["read"], equipamento: ["read"],
    empresa: ["read"], contrato: ["read"], relatorio: ["read"],
  },
  // Engenheiro/Arquiteto: como o Chefe de divisão, porém SEM gerir usuários.
  engenheiro: {
    unidade: ALL, equipamento: ALL, empresa: ALL,
    contrato: ALL, chamado: ALL, relatorio: ["read", "create"],
  },
  arquiteto: {
    unidade: ALL, equipamento: ALL, empresa: ALL,
    contrato: ALL, chamado: ALL, relatorio: ["read", "create"],
  },
  // Empresas por especialidade: agem como empresa_admin.
  manutencao_predial: { chamado: ["read", "assign"], contrato: ["read"], relatorio: ["read"] },
  manutencao_refrigeracao: { chamado: ["read", "assign"], contrato: ["read"], relatorio: ["read"] },
  manutencao_ar_condicionado: { chamado: ["read", "assign"], contrato: ["read"], relatorio: ["read"] },
  instalacao_ar_condicionado: { chamado: ["read", "assign"], contrato: ["read"], relatorio: ["read"] },
};

export function hasPermission(role: Role, action: Action, resource: Resource): boolean {
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}
