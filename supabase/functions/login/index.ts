// Edge Function: login (verify_jwt=false)
// Permite entrar com e-mail OU matrícula. Se for matrícula, resolve o e-mail
// via service_role e autentica server-side (não expõe e-mails: erro genérico
// para 0 ou múltiplas matrículas). Retorna tokens p/ o cliente setSession.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(comCaptura("login", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let body: { identificador?: string; senha?: string; subdomain?: string | null };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const id = String(body.identificador ?? "").trim();
  const senha = String(body.senha ?? "");
  if (!id || !senha) return json({ error: "Informe usuário e senha." }, 400);

  let email = id;
  if (!id.includes("@")) {
    // Matrícula → e-mail, ESCOPADA por tenant (subdomínio) p/ evitar colisão
    // entre secretarias. Erro genérico se não houver exatamente 1 correspondência.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const sub = String(body.subdomain ?? "").trim().toLowerCase();
    let query = admin.from("users").select("email").eq("matricula", id);
    if (sub) {
      const { data: t } = await admin.from("tenants").select("id").eq("subdomain", sub).maybeSingle();
      if (!t) return json({ error: "Credenciais inválidas." }, 401);
      query = query.eq("tenant_id", t.id);
    }
    const { data } = await query.limit(2);
    if (!data || data.length !== 1) return json({ error: "Credenciais inválidas." }, 401);
    email = data[0].email as string;
  }

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: s, error } = await anon.auth.signInWithPassword({ email, password: senha });
  if (error || !s.session) return json({ error: "Credenciais inválidas." }, 401);

  return json({ access_token: s.session.access_token, refresh_token: s.session.refresh_token });
}));
