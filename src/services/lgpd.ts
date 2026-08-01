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

  const base = {
    user_id: userId,
    tenant_id: tenantId,
    versao_termo: TERMO_VERSAO,
    user_agent: navigator.userAgent,
  };

  const { error } = await supabase.from("lgpd_consents").insert({ ...base, texto_hash: textoHash });
  if (!error) return { error: null };

  // Segunda tentativa sem texto_hash: cobre a janela em que o frontend já
  // subiu (deploy automático da Vercel no push) mas a migration 0022 ainda não
  // foi aplicada — a coluna não existe e o PostgREST rejeita o insert inteiro.
  //
  // Sem isto, essa janela trancaria TODOS os usuários fora do app: a versão do
  // termo mudou para 2026-07-v2, então todo mundo passa pelo gate, e um gate
  // que não consegue gravar o aceite não deixa ninguém entrar. Perder o hash
  // de alguns aceites é um custo pequeno perto de derrubar a operação inteira.
  const { error: erroSemHash } = await supabase.from("lgpd_consents").insert(base);
  return { error: erroSemHash?.message ?? null };
}
