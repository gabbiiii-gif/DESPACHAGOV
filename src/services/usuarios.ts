import { supabase } from "./supabase";
import type { Tables } from "@/types/database.types";
import type { Role } from "@/lib/permissions";

export type Usuario = Tables<"users">;

export async function listarUsuariosTenant(tenantId?: string): Promise<Usuario[]> {
  let q = supabase.from("users").select("*").order("created_at", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ConvidarUsuarioInput {
  nome: string;
  email: string;
  role: Role;
  empresa_id?: string | null;
}

export interface ResultadoConvite {
  error: string | null;
  emailSent: boolean;
  actionLink: string | null;
}

// Convite roda na Edge Function invite-user (cria no Auth + perfil + e-mail).
export async function convidarUsuario(input: ConvidarUsuarioInput): Promise<ResultadoConvite> {
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    email_sent: boolean;
    action_link: string | null;
  }>("invite-user", { body: input });
  if (error) return { error: error.message, emailSent: false, actionLink: null };
  return { error: null, emailSent: data?.email_sent ?? false, actionLink: data?.action_link ?? null };
}
