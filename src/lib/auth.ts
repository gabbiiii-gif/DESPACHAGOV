// Tipos e helpers puros de auth/sessão. Sem React, sem efeitos.
import type { Role } from "./permissions";
import type { Tables } from "@/types/database.types";

export type UserProfile = Tables<"users">;
export type Tenant = Tables<"tenants">;

// Claims que esperamos no app_metadata do JWT (setados server-side).
export interface AppClaims {
  role?: Role;
  tenant_id?: string | null;
}

// Destino de rota por papel — usado no roteamento pós-login.
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "superadmin":
      return "/superadmin";
    case "admin_secretaria":
    case "gestor_secretaria":
      return "/secretaria";
    case "responsavel_unidade":
      return "/unidade";
    case "empresa_admin":
      return "/empresa";
    case "tecnico_secretaria":
    case "tecnico_empresa":
      return "/tecnico";
    default:
      return "/";
  }
}

export const TERMO_LGPD_VERSAO = "2026-06-v1";
