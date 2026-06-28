// Edge Function: log-erro
// Recebe erros do front (qualquer usuário autenticado) e grava em error_log
// via service_role. tenant_id vem do JWT quando houver.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const NIVEIS = new Set(["error", "warn", "info"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser();
  const tenantId = (u.user?.app_metadata as { tenant_id?: string } | undefined)?.tenant_id ?? null;

  let body: { fonte?: string; nivel?: string; mensagem?: string; contexto?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const mensagem = String(body.mensagem ?? "").trim().slice(0, 2000);
  if (!mensagem) return json({ error: "mensagem ausente" }, 400);
  const nivel = NIVEIS.has(String(body.nivel)) ? String(body.nivel) : "error";
  const fonte = String(body.fonte ?? "front").slice(0, 60);
  const contexto = body.contexto && typeof body.contexto === "object" ? body.contexto : {};

  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.from("error_log").insert({ tenant_id: tenantId, fonte, nivel, mensagem, contexto });

  return json({ ok: true });
});
