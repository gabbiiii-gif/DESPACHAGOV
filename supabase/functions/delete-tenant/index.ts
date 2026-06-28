// Edge Function: delete-tenant
// Apenas superadmin. Exclui uma secretaria (tenant) e tudo dela:
// - DELETE em public.tenants → cascade remove dados públicos (users, unidades,
//   empresas, chamados, anexos, notificacoes, ai_usage, etc.).
// - Remove os usuários correspondentes do Auth (não cascateiam de public.users).
// Obs.: arquivos no Storage (buckets contratos/chamado-anexos) NÃO são cobertos
// pelo cascade — limpeza de Storage fica como melhoria futura.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(comCaptura("delete-tenant", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Autorização: caller precisa ser superadmin.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  if ((u.user.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
    return json({ error: "apenas superadmin" }, 403);
  }

  // 2) Corpo.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }
  const tenantId = String(body.tenant_id ?? "").trim();
  if (!tenantId) return json({ error: "tenant_id ausente" }, 400);

  // 3) IDs dos usuários do tenant (Auth) antes do cascade.
  const { data: usuarios } = await admin.from("users").select("id").eq("tenant_id", tenantId);
  const ids = (usuarios ?? []).map((r) => r.id as string);

  // 4) Deleta o tenant → cascade nos dados públicos.
  const { error: dErr } = await admin.from("tenants").delete().eq("id", tenantId);
  if (dErr) return json({ error: `tenant: ${dErr.message}` }, 400);

  // 5) Remove os usuários do Auth (best-effort, não cascateiam).
  let usuariosRemovidos = 0;
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) usuariosRemovidos++;
  }

  return json({ ok: true, usuarios_removidos: usuariosRemovidos });
}));
