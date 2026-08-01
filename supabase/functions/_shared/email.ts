// Envio de e-mail via Resend (best-effort). Se RESEND_API_KEY não estiver
// configurada, retorna { sent: false } sem quebrar o fluxo de criação.

// Remetente dos transacionais. Estava hardcoded: trocar de domínio exigia
// editar e republicar a função, e o valor fixo escondia que este remetente NÃO
// é o mesmo dos e-mails do Supabase Auth (confirmação, recuperação, magic
// link), que saem pelo SMTP do painel. São dois remetentes distintos em
// produção e mantê-los alinhados é conferência manual.
//
// O fallback é o domínio que já está em uso, não um placeholder: o Resend
// aceita a chamada mesmo com domínio não verificado e só falha na entrega, então
// um valor errado aqui quebraria em silêncio.
const REMETENTE_PADRAO = "DespachaGov <nao-responder@despachagov.com>";

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { sent: false, error: "RESEND_API_KEY ausente" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") ?? REMETENTE_PADRAO,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!resp.ok) return { sent: false, error: `HTTP ${resp.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "erro" };
  }
}

export function emailConvite(nome: string, link: string): { subject: string; html: string } {
  return {
    subject: "Seu acesso ao DespachaGov",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#2456A6">DespachaGov</h2>
      <p>Olá, ${nome}.</p>
      <p>Você foi convidado para acessar a plataforma. Clique abaixo para definir sua senha:</p>
      <p><a href="${link}" style="background:#2456A6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Definir senha</a></p>
      <p style="color:#6b7488;font-size:12px">Se você não esperava este e-mail, ignore-o.</p>
    </div>`,
  };
}
