import { supabase } from "./supabase";
import { TERMO_LGPD_VERSAO } from "@/lib/auth";

// Verifica se o usuário já aceitou a versão vigente do termo.
export async function consentiuVersaoVigente(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("lgpd_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("versao_termo", TERMO_LGPD_VERSAO)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// Registra o aceite. tenant_id pode ser null (superadmin).
export async function registrarConsentimento(userId: string, tenantId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from("lgpd_consents").insert({
    user_id: userId,
    tenant_id: tenantId,
    versao_termo: TERMO_LGPD_VERSAO,
    user_agent: navigator.userAgent,
  });
  return { error: error?.message ?? null };
}
