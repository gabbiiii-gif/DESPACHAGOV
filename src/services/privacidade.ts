import { supabase } from "./supabase";
import { invokeSeguro } from "@/lib/safeInvoke";
import { CONFIRMACAO_EXCLUSAO, type ConsentimentoResumo, type ChamadoResumoExport } from "@/lib/privacidade";

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

// Exclusão de dados do titular (LGPD art. 18, VI). Toda a regra vive na Edge
// Function delete-account — daqui não dá para escolher o alvo: ela usa o `sub`
// do JWT. A mensagem de erro do backend é repassada crua porque ela é
// específica e acionável ("último administrador da secretaria não pode se
// autoexcluir" precisa chegar ao usuário assim, não virar um genérico).
export async function excluirMinhaConta(confirmacao: string): Promise<{ error: string | null }> {
  const { error } = await invokeSeguro<{ ok: boolean }>(
    "delete-account",
    { confirmacao },
    // Sem retry: a operação não é idempotente do ponto de vista do usuário —
    // a 2ª tentativa bateria em "conta já anonimizada" e viraria um erro
    // confuso depois de um sucesso real.
    { maxTentativas: 1, timeoutMs: 20_000 },
  );
  return { error: error?.message ?? null };
}

export { CONFIRMACAO_EXCLUSAO };
