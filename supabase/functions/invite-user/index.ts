// Edge Function: invite-user
// admin_secretaria convida usuário para o PRÓPRIO tenant (claim do JWT).
// Cria usuário no Auth com app_metadata {role, tenant_id} + perfil + convite.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ROLES_PERMITIDAS = new Set([
  "gestor_secretaria",
  "responsavel_unidade",
  "tecnico_secretaria",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  const meta = u.user.app_metadata as Record<string, unknown>;
  if (meta?.role !== "admin_secretaria") return json({ error: "apenas admin_secretaria" }, 403);
  const tenantId = meta?.tenant_id as string | undefined;
  if (!tenantId) return json({ error: "sem tenant" }, 400);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");
  if (!nome || !email || !ROLES_PERMITIDAS.has(role)) {
    return json({ error: "campos inválidos" }, 400);
  }

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role, tenant_id: tenantId },
  });
  if (cErr || !created.user) return json({ error: `auth: ${cErr?.message ?? "falhou"}` }, 400);

  const { error: pErr } = await admin.from("users").insert({
    id: created.user.id,
    tenant_id: tenantId,
    role,
    nome,
    email,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: `perfil: ${pErr.message}` }, 400);
  }

  const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const actionLink = link?.properties?.action_link ?? null;

  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey && actionLink) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "DespachaGov <nao-responder@despachagov.com.br>",
          to: [email],
          subject: "Seu acesso ao DespachaGov",
          html: `<div style="font-family:sans-serif"><h2 style="color:#2456A6">DespachaGov</h2><p>Olá, ${nome}.</p><p>Defina sua senha:</p><p><a href="${actionLink}">Definir senha</a></p></div>`,
        }),
      });
      emailSent = r.ok;
    } catch { /* ignora */ }
  }

  return json({ ok: true, user_id: created.user.id, email_sent: emailSent, action_link: emailSent ? null : actionLink });
});
