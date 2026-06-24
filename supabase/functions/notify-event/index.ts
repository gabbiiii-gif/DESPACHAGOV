// Edge Function: notify-event
// Disparada por Database Webhook em INSERT de chamado_eventos.
// Resolve destinatários (service_role), deduplica e envia e-mail via Resend.
//
// Self-contained por convenção do projeto (como create-tenant/invite-user):
// a lógica pura abaixo é ESPELHO de src/lib/notificacoes.ts (testada lá).
// Ao mudar a matriz/templates, manter os dois em sincronia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Domínio puro (espelho de src/lib/notificacoes.ts) ───────────────────────
type EventoChamado =
  | "aberto" | "atribuido" | "tecnico_designado" | "em_campo" | "concluido" | "cancelado";
type PapelNotificavel = "admin_secretaria" | "empresa" | "tecnico" | "responsavel";

const MATRIZ: Record<EventoChamado, PapelNotificavel[]> = {
  aberto: ["admin_secretaria"],
  atribuido: ["empresa"],
  tecnico_designado: ["tecnico"],
  em_campo: ["responsavel"],
  concluido: ["responsavel", "admin_secretaria"],
  cancelado: ["responsavel", "empresa"],
};

function destinatariosDe(evento: string): PapelNotificavel[] {
  return MATRIZ[evento as EventoChamado] ?? [];
}

const BASE = "https://www.despachagov.com";
function linkPara(papel: PapelNotificavel): string {
  switch (papel) {
    case "responsavel": return `${BASE}/unidade`;
    case "admin_secretaria": return `${BASE}/secretaria/chamados`;
    case "empresa":
    case "tecnico": return `${BASE}/empresa`;
  }
}

interface EventoEmailCtx { protocolo: string; unidadeNome: string; link: string }

const FRASE: Record<EventoChamado, (c: EventoEmailCtx) => { titulo: string; corpo: string }> = {
  aberto: (c) => ({
    titulo: `Novo chamado ${c.protocolo}`,
    corpo: `Um novo chamado foi aberto na unidade <b>${c.unidadeNome}</b> e aguarda atribuição.`,
  }),
  atribuido: (c) => ({
    titulo: `Chamado ${c.protocolo} atribuído à sua empresa`,
    corpo: `O chamado da unidade <b>${c.unidadeNome}</b> foi atribuído à sua empresa.`,
  }),
  tecnico_designado: (c) => ({
    titulo: `Você foi escalado — chamado ${c.protocolo}`,
    corpo: `Você foi designado para o chamado da unidade <b>${c.unidadeNome}</b>.`,
  }),
  em_campo: (c) => ({
    titulo: `Atendimento iniciado — chamado ${c.protocolo}`,
    corpo: `O atendimento do chamado na unidade <b>${c.unidadeNome}</b> começou.`,
  }),
  concluido: (c) => ({
    titulo: `Chamado ${c.protocolo} concluído`,
    corpo: `O chamado da unidade <b>${c.unidadeNome}</b> foi concluído. O comprovante já está disponível.`,
  }),
  cancelado: (c) => ({
    titulo: `Chamado ${c.protocolo} cancelado`,
    corpo: `O chamado da unidade <b>${c.unidadeNome}</b> foi cancelado.`,
  }),
};

function emailEvento(evento: EventoChamado, ctx: EventoEmailCtx): { subject: string; html: string } {
  const { titulo, corpo } = FRASE[evento](ctx);
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:auto">
  <h2 style="color:#2456A6;margin-bottom:4px">DespachaGov</h2>
  <p style="color:#F97316;font-weight:600;margin-top:0">${titulo}</p>
  <p>${corpo}</p>
  <p>Protocolo: <b>${ctx.protocolo}</b></p>
  <p><a href="${ctx.link}" style="background:#2456A6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Abrir no DespachaGov</a></p>
  <p style="color:#6b7488;font-size:12px">Mensagem automática — não responda este e-mail.</p>
</div>`;
  return { subject: `${titulo} — ${ctx.unidadeNome}`, html };
}

// ─── Envio via Resend (best-effort) ──────────────────────────────────────────
async function enviarEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { sent: false, error: "RESEND_API_KEY ausente" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "DespachaGov <nao-responder@despachagov.com>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!resp.ok) return { sent: false, error: `HTTP ${resp.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "erro" };
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  if (req.headers.get("x-notify-secret") !== Deno.env.get("NOTIFY_WEBHOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: { record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response("json", { status: 400 });
  }
  const rec = body.record;
  if (!rec) return new Response("no record", { status: 200 });

  const evento = String(rec.evento ?? "") as EventoChamado;
  const eventoId = String(rec.id ?? "");
  const chamadoId = String(rec.chamado_id ?? "");
  const tenantId = String(rec.tenant_id ?? "");
  const atorId = rec.ator_id ? String(rec.ator_id) : null;

  const papeis = destinatariosDe(evento);
  if (papeis.length === 0 || !chamadoId || !eventoId) {
    return new Response(JSON.stringify({ ok: true, enviados: 0 }), { status: 200 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Carrega chamado + nome da unidade.
  const { data: chamado } = await admin
    .from("chamados")
    .select("numero_protocolo, empresa_id, tecnico_id, solicitante_id, unidades!inner(nome)")
    .eq("id", chamadoId)
    .single();
  if (!chamado) return new Response(JSON.stringify({ ok: true, enviados: 0 }), { status: 200 });

  const c = chamado as Record<string, unknown>;
  const protocolo = String(c.numero_protocolo ?? "");
  const unidadeNome = (c.unidades as { nome?: string } | null)?.nome ?? "Unidade";

  // E-mail do ator (para excluir auto-notificação).
  let atorEmail: string | null = null;
  if (atorId) {
    const { data } = await admin.from("users").select("email").eq("id", atorId).maybeSingle();
    atorEmail = (data?.email as string | undefined)?.toLowerCase() ?? null;
  }

  // Resolve e-mails por papel.
  async function emailsDoPapel(papel: PapelNotificavel): Promise<string[]> {
    if (papel === "empresa") {
      if (!c.empresa_id) return [];
      const { data } = await admin.from("empresas").select("email").eq("id", c.empresa_id).maybeSingle();
      return data?.email ? [data.email as string] : [];
    }
    if (papel === "tecnico") {
      if (!c.tecnico_id) return [];
      const { data } = await admin.from("tecnicos").select("email").eq("id", c.tecnico_id).maybeSingle();
      return data?.email ? [data.email as string] : [];
    }
    if (papel === "responsavel") {
      if (!c.solicitante_id) return [];
      const { data } = await admin.from("users").select("email").eq("id", c.solicitante_id).maybeSingle();
      return data?.email ? [data.email as string] : [];
    }
    const { data } = await admin
      .from("users")
      .select("email")
      .eq("tenant_id", tenantId)
      .eq("role", "admin_secretaria");
    return (data ?? []).map((r) => r.email as string).filter(Boolean);
  }

  // Lista única (email, papel), excluindo o ator.
  const alvos: { email: string; papel: PapelNotificavel }[] = [];
  const vistos = new Set<string>();
  for (const papel of papeis) {
    for (const email of await emailsDoPapel(papel)) {
      const e = email.toLowerCase();
      if (!e || e === atorEmail || vistos.has(e)) continue;
      vistos.add(e);
      alvos.push({ email, papel });
    }
  }

  // Envio best-effort + log idempotente.
  let enviados = 0;
  for (const { email, papel } of alvos) {
    const { data: existente } = await admin
      .from("notificacoes")
      .select("id")
      .eq("evento_id", eventoId)
      .eq("destinatario", email)
      .eq("canal", "email")
      .maybeSingle();
    if (existente) continue;

    const { subject, html } = emailEvento(evento, { protocolo, unidadeNome, link: linkPara(papel) });
    const res = await enviarEmail(email, subject, html);
    if (res.sent) enviados++;
    await admin.from("notificacoes").insert({
      tenant_id: tenantId,
      evento_id: eventoId,
      chamado_id: chamadoId,
      canal: "email",
      destinatario: email,
      assunto: subject,
      status: res.sent ? "enviado" : "falha",
      erro: res.sent ? null : (res.error ?? "erro"),
    });
  }

  return new Response(JSON.stringify({ ok: true, enviados }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
