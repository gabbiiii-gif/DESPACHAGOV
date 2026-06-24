// Aplica os templates de e-mail do Supabase Auth na paleta TRAVADA azul/laranja.
// Genéricos (sem hardcode de Secretaria). Reaplicável após mudanças.
//
// Uso:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-email-templates.mjs
//   (PROJECT_REF opcional; default = evdjijvxllhrlkkhrcdi)

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.PROJECT_REF || "evdjijvxllhrlkkhrcdi";
if (!TOKEN) {
  console.error("Faltou SUPABASE_ACCESS_TOKEN no ambiente.");
  process.exit(1);
}

// Wrapper base — paleta azul #2456A6 / laranja #F97316.
function wrap({ titulo, paragrafos, cta, expiraTexto }) {
  const corpo = paragrafos
    .map(
      (p) =>
        `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;padding:0 0 14px;">${p}</td></tr>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
      <tr><td align="center" style="background:#2456A6;padding:26px 32px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;font-style:italic;"><span style="color:#F97316;">Despacha</span><span style="color:#ffffff;">Gov</span></span>
      </td></tr>
      <tr><td style="padding:38px 40px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:#1A3F7A;padding:0 0 16px;">${titulo}</td></tr>
          ${corpo}
          <tr><td align="center" style="padding:8px 0 4px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#F97316;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:15px 34px;border-radius:10px;">${cta}</a>
          </td></tr>
          <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9CA3AF;padding:16px 0 0;">${expiraTexto}</td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#F8F9FB;padding:22px 40px;border-top:1px solid #E5E7EB;">
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9CA3AF;margin:0 0 6px;">Você recebeu este e-mail porque há uma conta DespachaGov associada a este endereço.</p>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9CA3AF;margin:0;">DespachaGov · Menos papel, mais ação &copy; 2026</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const config = {
  mailer_subjects_confirmation: "Confirme seu e-mail — DespachaGov",
  mailer_subjects_invite: "Você foi convidado — DespachaGov",
  mailer_subjects_recovery: "Redefinir senha — DespachaGov",
  mailer_subjects_magic_link: "Seu link de acesso — DespachaGov",

  mailer_templates_confirmation_content: wrap({
    titulo: "Confirme seu e-mail",
    paragrafos: [
      "Olá! Recebemos uma solicitação de cadastro no DespachaGov com este endereço de e-mail.",
      "Para ativar sua conta e acessar o sistema, confirme seu e-mail no botão abaixo.",
    ],
    cta: "Confirmar e-mail",
    expiraTexto: "Este link expira em 24 horas. Se você não solicitou, ignore este e-mail.",
  }),
  mailer_templates_invite_content: wrap({
    titulo: "Você foi convidado",
    paragrafos: [
      "Você foi convidado para acessar o DespachaGov — a plataforma de gestão de demandas de manutenção.",
      "Clique abaixo para criar sua conta e definir sua senha.",
    ],
    cta: "Aceitar convite",
    expiraTexto: "Este convite expira em 7 dias. Se você não esperava, ignore este e-mail.",
  }),
  mailer_templates_recovery_content: wrap({
    titulo: "Redefinir senha",
    paragrafos: [
      "Recebemos um pedido para redefinir a senha da sua conta DespachaGov.",
      "Clique abaixo para escolher uma nova senha.",
    ],
    cta: "Redefinir senha",
    expiraTexto: "Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.",
  }),
  mailer_templates_magic_link_content: wrap({
    titulo: "Seu link de acesso",
    paragrafos: ["Use o botão abaixo para entrar no DespachaGov. O link expira em breve e só pode ser usado uma vez."],
    cta: "Entrar",
    expiraTexto: "Se você não solicitou este acesso, ignore este e-mail.",
  }),
};

const resp = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(config),
});
console.log("HTTP", resp.status);
if (!resp.ok) {
  console.error(await resp.text());
  process.exit(1);
}
console.log("Templates de e-mail aplicados (paleta azul/laranja).");
