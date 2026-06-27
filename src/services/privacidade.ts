import { supabase } from "./supabase";
import type { ConsentimentoResumo, ChamadoResumoExport } from "@/lib/privacidade";

// Aceites de termo do titular (RLS: o usuário lê os próprios).
export async function obterConsentimentos(userId: string): Promise<ConsentimentoResumo[]> {
  const { data } = await supabase
    .from("lgpd_consents")
    .select("versao_termo, aceito_em")
    .eq("user_id", userId)
    .order("aceito_em", { ascending: false });
  return (data ?? []) as ConsentimentoResumo[];
}

// Chamados abertos pelo titular (solicitante).
export async function obterMeusChamados(userId: string): Promise<ChamadoResumoExport[]> {
  const { data } = await supabase
    .from("chamados")
    .select("numero_protocolo, status, created_at")
    .eq("solicitante_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ChamadoResumoExport[];
}
