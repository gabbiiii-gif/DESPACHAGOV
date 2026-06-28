// Edge Function: create-tenant
// Apenas superadmin. Cria tenant + primeiro admin_secretaria (Auth + perfil),
// gera link de convite e envia e-mail (best-effort via Resend).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(comCaptura("create-tenant", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Autorização: caller precisa ser superadmin.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  const role = (u.user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") return json({ error: "apenas superadmin" }, 403);

  // 2) Validação do corpo.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }
  const nome = String(body.nome_secretaria ?? "").trim();
  const subdomain = String(body.subdomain ?? "").trim().toLowerCase();
  const adminNome = String(body.admin_nome ?? "").trim();
  const adminEmail = String(body.admin_email ?? "").trim().toLowerCase();
  if (!nome || !/^[a-z0-9-]{2,}$/.test(subdomain) || !adminNome || !adminEmail) {
    return json({ error: "campos obrigatórios inválidos" }, 400);
  }

  // 3) Cria o tenant.
  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .insert({
      nome_secretaria: nome,
      subdomain,
      cnpj: body.cnpj ? String(body.cnpj) : null,
      municipio: body.municipio ? String(body.municipio) : null,
      estado: body.estado ? String(body.estado).toUpperCase().slice(0, 2) : null,
      contrato_vigencia_inicio: body.contrato_vigencia_inicio ? String(body.contrato_vigencia_inicio) : null,
      contrato_vigencia_fim: body.contrato_vigencia_fim ? String(body.contrato_vigencia_fim) : null,
    })
    .select()
    .single();
  if (tErr) return json({ error: `tenant: ${tErr.message}` }, 400);

  // 4) Cria o admin no Auth com claims no app_metadata.
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    email_confirm: true,
    app_metadata: { role: "admin_secretaria", tenant_id: tenant.id },
  });
  if (cErr || !created.user) {
    await admin.from("tenants").delete().eq("id", tenant.id); // rollback
    return json({ error: `auth: ${cErr?.message ?? "falhou"}` }, 400);
  }

  // 5) Perfil em public.users.
  const { error: pErr } = await admin.from("users").insert({
    id: created.user.id,
    tenant_id: tenant.id,
    role: "admin_secretaria",
    nome: adminNome,
    email: adminEmail,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("tenants").delete().eq("id", tenant.id);
    return json({ error: `perfil: ${pErr.message}` }, 400);
  }

  // 6) Link de convite (define senha) + e-mail best-effort.
  const { data: link } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: adminEmail,
    options: { redirectTo: "https://www.despachagov.com/redefinir-senha" },
  });
  const actionLink = link?.properties?.action_link ?? null;

  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey && actionLink) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "DespachaGov <nao-responder@despachagov.com>",
          to: [adminEmail],
          subject: "Seu acesso ao DespachaGov",
          html: `<div style="font-family:sans-serif"><h2 style="color:#2456A6">DespachaGov</h2><p>Olá, ${adminNome}.</p><p>Defina sua senha de acesso:</p><p><a href="${actionLink}">Definir senha</a></p></div>`,
        }),
      });
      emailSent = r.ok;
    } catch { /* ignora */ }
  }

  return json({ ok: true, tenant_id: tenant.id, email_sent: emailSent, action_link: emailSent ? null : actionLink });
}));
