// Envio de e-mail via Resend (best-effort). Se RESEND_API_KEY não estiver
// configurada, retorna { sent: false } sem quebrar o fluxo de criação.
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
        from: "DespachaGov <nao-responder@despachagov.com.br>",
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
