// Edge Function: invite-user
// admin_secretaria convida usuário para o PRÓPRIO tenant (claim do JWT).
// Papéis de secretaria (gestor/responsável) e de empresa (empresa_admin, exige
// empresa_id do mesmo tenant). Técnicos NÃO são usuários do app — a empresa os
// cadastra como registros (tabela tecnicos); papéis tecnico_* são rejeitados aqui.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ROLES_SECRETARIA = new Set(["gestor_secretaria", "responsavel_unidade"]);
const ROLES_EMPRESA = new Set(["empresa_admin"]);

Deno.serve(comCaptura("invite-user", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  const meta = u.user.app_metadata as Record<string, unknown>;
  const callerRole = meta?.role;
  if (callerRole !== "admin_secretaria" && callerRole !== "superadmin") {
    return json({ error: "sem permissão" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }

  // admin_secretaria usa o próprio tenant (claim); superadmin informa o tenant alvo.
  let tenantId: string | undefined;
  if (callerRole === "superadmin") {
    tenantId = body.tenant_id ? String(body.tenant_id) : undefined;
    if (!tenantId) return json({ error: "tenant_id obrigatório p/ superadmin" }, 400);
  } else {
    tenantId = meta?.tenant_id as string | undefined;
  }
  if (!tenantId) return json({ error: "sem tenant" }, 400);
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");
  const empresaId = body.empresa_id ? String(body.empresa_id) : null;
  const matricula = body.matricula ? String(body.matricula).trim() : null;
  const unidadeIds = Array.isArray(body.unidade_ids) ? body.unidade_ids.map((x) => String(x)) : [];
  const isEmpresa = ROLES_EMPRESA.has(role);
  const isResponsavel = role === "responsavel_unidade";
  if (!nome || !email || (!ROLES_SECRETARIA.has(role) && !isEmpresa)) {
    return json({ error: "campos inválidos" }, 400);
  }
  if (isEmpresa && !empresaId) return json({ error: "empresa_id obrigatório p/ papel de empresa" }, 400);
  // Diretor precisa de ao menos uma escola vinculada.
  if (isResponsavel && unidadeIds.length === 0) {
    return json({ error: "selecione ao menos uma escola p/ o responsável" }, 400);
  }
  // Garante que as unidades informadas pertencem ao tenant do admin.
  if (unidadeIds.length) {
    const { data: uns } = await admin.from("unidades").select("id").eq("tenant_id", tenantId).in("id", unidadeIds);
    if (!uns || uns.length !== unidadeIds.length) return json({ error: "unidade inválida" }, 400);
  }

  // Matrícula = login alternativo; única dentro do tenant.
  if (matricula) {
    const { data: jaUsada } = await admin.from("users").select("id").eq("tenant_id", tenantId).eq("matricula", matricula).maybeSingle();
    if (jaUsada) return json({ error: "matrícula já usada nesta secretaria" }, 400);
  }

  // Garante que a empresa pertence ao tenant do admin.
  if (empresaId) {
    const { data: emp } = await admin.from("empresas").select("id").eq("id", empresaId).eq("tenant_id", tenantId).maybeSingle();
    if (!emp) return json({ error: "empresa inválida" }, 400);
  }

  const appMetadata: Record<string, unknown> = { role, tenant_id: tenantId };
  if (empresaId) appMetadata.empresa_id = empresaId;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: appMetadata,
  });
  if (cErr || !created.user) return json({ error: `auth: ${cErr?.message ?? "falhou"}` }, 400);

  const { error: pErr } = await admin.from("users").insert({
    id: created.user.id,
    tenant_id: tenantId,
    role,
    nome,
    email,
    empresa_id: empresaId,
    matricula,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: `perfil: ${pErr.message}` }, 400);
  }

  // Vincula as escolas ao diretor recém-criado (unidades.responsavel_user_id).
  // Reatribui: se a escola já tinha responsável, o novo assume.
  if (unidadeIds.length) {
    const { error: uErr } = await admin
      .from("unidades")
      .update({ responsavel_user_id: created.user.id })
      .eq("tenant_id", tenantId)
      .in("id", unidadeIds);
    if (uErr) {
      // Rollback: deletar o auth user cascateia o perfil (users.id → auth.users).
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: `vínculo de escola: ${uErr.message}` }, 400);
    }
  }

  const { data: link } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
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
          to: [email],
          subject: "Seu acesso ao DespachaGov",
          html: `<div style="font-family:sans-serif"><h2 style="color:#2456A6">DespachaGov</h2><p>Olá, ${nome}.</p><p>Defina sua senha:</p><p><a href="${actionLink}">Definir senha</a></p></div>`,
        }),
      });
      emailSent = r.ok;
    } catch { /* ignora */ }
  }

  return json({ ok: true, user_id: created.user.id, email_sent: emailSent, action_link: emailSent ? null : actionLink });
}));
