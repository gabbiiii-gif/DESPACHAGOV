import { supabase } from "./supabase";
import type { Tenant } from "@/lib/auth";

export async function listarTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface NovoTenantInput {
  nome_secretaria: string;
  cnpj?: string | undefined;
  municipio?: string | undefined;
  estado?: string | undefined;
  subdomain: string;
  valor_mensal?: number | undefined;
  contrato_vigencia_inicio?: string | undefined;
  contrato_vigencia_fim?: string | undefined;
  admin_nome: string;
  admin_email: string;
}

// Criação de tenant + primeiro admin_secretaria roda na Edge Function
// (precisa de service_role p/ criar usuário no Auth e setar app_metadata).
export async function criarTenant(input: NovoTenantInput): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("create-tenant", { body: input });
  return { error: error?.message ?? null };
}
