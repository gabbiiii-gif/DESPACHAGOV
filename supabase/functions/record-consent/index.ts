// Edge Function: record-consent
// Registra o aceite do termo com o IP de origem — que o browser não conhece e
// por isso nunca era gravado, apesar da coluna existir desde a migration 0001.
//
// O usuário só registra o PRÓPRIO aceite: o user_id vem do `sub` do JWT, nunca
// do corpo. tenant_id também é lido do app_metadata em vez de aceito do
// cliente, senão daria para carimbar o consentimento no tenant de outro órgão.
//
// versao e texto_hash vêm do cliente. Não há como o servidor recalcular o hash:
// o texto do termo é conteúdo do frontend (src/lib/termo.ts) e não existe neste
// runtime. Isso é aceitável — o titular não é adversário do próprio
// consentimento, e forjar o registro do próprio aceite não beneficia ninguém.
// O que importa juridicamente é o par (versão, hash) ficar imutável no banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura } from "../_shared/erros.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

// SHA-256 em hex tem exatamente 64 caracteres. Validar aqui evita gravar lixo
// numa coluna cujo propósito inteiro é servir de prova.
const HASH_VALIDO = /^[0-9a-f]{64}$/;

// Cabeçalhos que os proxies do Supabase/Cloudflare preenchem. x-forwarded-for
// pode vir como "cliente, proxy1, proxy2" — o primeiro é o cliente real.
function ipDaRequisicao(req: Request): string | null {
  const encadeado = req.headers.get("x-forwarded-for");
  if (encadeado) {
    const primeiro = encadeado.split(",")[0]?.trim();
    if (primeiro) return primeiro;
  }
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
}

Deno.serve(comCaptura("record-consent", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }

  const versao = String(body.versao ?? "").trim();
  const textoHash = String(body.texto_hash ?? "").trim().toLowerCase();
  if (!versao) return json({ error: "versao obrigatória" }, 400);
  if (!HASH_VALIDO.test(textoHash)) return json({ error: "texto_hash inválido" }, 400);

  const meta = u.user.app_metadata as { tenant_id?: string | null } | undefined;

  const { error } = await admin.from("lgpd_consents").insert({
    user_id: u.user.id,
    tenant_id: meta?.tenant_id ?? null,
    versao_termo: versao,
    texto_hash: textoHash,
    ip: ipDaRequisicao(req),
    user_agent: req.headers.get("user-agent"),
  });
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
}));
