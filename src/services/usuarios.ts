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
  // Matrícula = "nome de usuário" para login alternativo (opcional, único no tenant).
  matricula?: string | null;
  // Escolas do diretor (obrigatório ≥1 quando role = responsavel_unidade).
  unidade_ids?: string[];
  // Superadmin informa o tenant alvo; admin_secretaria usa o próprio (ignorado pela função).
  tenant_id?: string | null;
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

// Redefine o conjunto de escolas de um diretor (unidades.responsavel_user_id).
// admin_secretaria escreve em unidades do próprio tenant via RLS. Limpa os
// vínculos antigos e aplica os novos. Passar tenantId garante o escopo.
export async function definirEscolasDoResponsavel(
  userId: string,
  unidadeIds: string[],
  tenantId: string,
): Promise<{ error: string | null }> {
  // 1. Desvincula tudo que hoje aponta p/ este diretor.
  const { error: limparErr } = await supabase
    .from("unidades")
    .update({ responsavel_user_id: null })
    .eq("tenant_id", tenantId)
    .eq("responsavel_user_id", userId);
  if (limparErr) return { error: limparErr.message };
  // 2. Vincula as escolas selecionadas (reatribui se já tinham outro dono).
  if (unidadeIds.length) {
    const { error: setErr } = await supabase
      .from("unidades")
      .update({ responsavel_user_id: userId })
      .eq("tenant_id", tenantId)
      .in("id", unidadeIds);
    if (setErr) return { error: setErr.message };
  }
  return { error: null };
}
