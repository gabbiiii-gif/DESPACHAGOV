import { supabase } from "./supabase";
import { invokeSeguro } from "@/lib/safeInvoke";
import { TERMO_VERSAO, hashTermo, textoCanonicoTermo } from "@/lib/termo";

// Verifica se o usuário já aceitou a versão vigente do termo.
export async function consentiuVersaoVigente(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("lgpd_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("versao_termo", TERMO_VERSAO)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// Registra o aceite. Caminho preferido: Edge Function record-consent, que grava
// o IP de origem — o browser não conhece o próprio IP, e é por isso que a coluna
// existia desde a migration 0001 e nunca foi preenchida.
//
// FALLBACK DELIBERADO: se a função falhar por qualquer motivo — ainda não
// publicada, cold start estourando o timeout, indisponibilidade momentânea —,
// cai no insert direto via RLS (policy lgpd_self_insert), sem IP.
//
// A alternativa seria propagar o erro, e o custo dela é desproporcional: o
// LgpdGate bloqueia TODA a aplicação até o aceite ser gravado. Sem fallback,
// uma função indisponível tranca todos os usuários para fora de um sistema de
// secretaria em produção. Registro de consentimento sem IP é prova mais fraca;
// nenhum registro e ninguém trabalhando é incidente.
//
// tenant_id pode ser null (superadmin).
export async function registrarConsentimento(
  userId: string,
  tenantId: string | null,
): Promise<{ error: string | null }> {
  const textoHash = await hashTermo(textoCanonicoTermo());

  const { error: erroFuncao } = await invokeSeguro<{ ok: boolean }>(
    "record-consent",
    { versao: TERMO_VERSAO, texto_hash: textoHash },
  );
  if (!erroFuncao) return { error: null };

  const { error } = await supabase.from("lgpd_consents").insert({
    user_id: userId,
    tenant_id: tenantId,
    versao_termo: TERMO_VERSAO,
    texto_hash: textoHash,
    user_agent: navigator.userAgent,
  });
  return { error: error?.message ?? null };
}
