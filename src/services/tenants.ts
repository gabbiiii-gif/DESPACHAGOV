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

export interface ResultadoCriarTenant {
  error: string | null;
  emailSent: boolean;
  actionLink: string | null;
}

// Criação de tenant + primeiro admin_secretaria roda na Edge Function
// (precisa de service_role p/ criar usuário no Auth e setar app_metadata).
// Se o e-mail não for enviado (Resend não configurado), devolve o link de
// convite para o superadmin repassar manualmente.
export async function criarTenant(input: NovoTenantInput): Promise<ResultadoCriarTenant> {
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    email_sent: boolean;
    action_link: string | null;
  }>("create-tenant", { body: input });
  if (error) return { error: error.message, emailSent: false, actionLink: null };
  return { error: null, emailSent: data?.email_sent ?? false, actionLink: data?.action_link ?? null };
}
