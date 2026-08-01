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
    case "secretaria_semed":
    case "engenheiro":
    case "arquiteto":
      return "/secretaria";
    case "responsavel_unidade":
      return "/unidade";
    case "empresa_admin":
    case "manutencao_predial":
    case "manutencao_refrigeracao":
    case "manutencao_ar_condicionado":
    case "instalacao_ar_condicionado":
      return "/empresa";
    // Técnicos (interno e de empresa) não são usuários do app — apenas registros
    // cadastrados pela empresa. Se logarem, caem na tela de "sem acesso".
    case "tecnico_empresa":
    case "tecnico_secretaria":
      return "/sem-acesso";
    default:
      return "/";
  }
}

// A versão do termo mudou de casa: vive em src/lib/termo.ts, junto do texto que
// ela versiona. Mantê-la aqui, longe do conteúdo, era o que permitia editar o
// termo sem lembrar de subir a versão.
