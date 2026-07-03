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

const ROLES_SECRETARIA = new Set([
  "gestor_secretaria", "responsavel_unidade", "secretaria_semed", "engenheiro", "arquiteto",
]);
const ROLES_EMPRESA = new Set([
  "empresa_admin", "manutencao_predial", "manutencao_refrigeracao",
  "manutencao_ar_condicionado", "instalacao_ar_condicionado",
]);

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
          html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:32px 12px;">
 <tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
   <tr><td align="center" style="background:#2456A6;padding:24px 32px;">
     <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;font-style:italic;"><span style="color:#FB923C;">Despacha</span><span style="color:#ffffff;">Gov</span></span>
   </td></tr>
   <tr><td style="padding:36px 40px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
     <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#F97316;padding:0 0 8px;">Acesso ao sistema</td></tr>
     <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:23px;font-weight:bold;color:#1A3F7A;padding:0 0 16px;">Defina sua senha de acesso</td></tr>
     <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;padding:0 0 14px;">Olá, <b style="color:#1A3F7A;">${nome}</b>.</td></tr>
     <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;padding:0 0 20px;">A Secretaria Municipal de Educação criou um acesso para você no DespachaGov. Para começar, defina uma senha clicando no botão abaixo.</td></tr>
     <tr><td style="padding:4px 0 4px;">
       <a href="${actionLink}" style="display:inline-block;background:#2456A6;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;">Definir minha senha</a>
     </td></tr>
     <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#9CA3AF;padding:16px 0 0;">Este link expira em 24 horas. Se expirar, peça um novo convite à Secretaria.</td></tr>
     <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6B7488;border-top:1px solid #E5E7EB;padding:20px 0 0;">Se você não esperava este acesso, pode ignorar este e-mail com segurança.</td></tr>
    </table>
   </td></tr>
   <tr><td style="background:#F8F9FB;padding:20px 40px;border-top:1px solid #E5E7EB;">
     <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9CA3AF;margin:0 0 6px;">Você recebeu este e-mail porque a Secretaria criou um acesso para você no DespachaGov.</p>
     <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9CA3AF;margin:0;">Prefeitura de Altamira · Secretaria Municipal de Educação · DespachaGov &copy; 2026</p>
   </td></tr>
  </table>
 </td></tr>
</table>
</body>
</html>`,
        }),
      });
      emailSent = r.ok;
    } catch { /* ignora */ }
  }

  return json({ ok: true, user_id: created.user.id, email_sent: emailSent, action_link: emailSent ? null : actionLink });
}));
