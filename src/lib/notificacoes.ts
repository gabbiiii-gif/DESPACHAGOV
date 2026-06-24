// Domínio puro das notificações por evento de chamado.
// Sem I/O: importado tanto pelo front (vitest) quanto pela Edge Function (Deno).

export type EventoChamado =
  | "aberto"
  | "atribuido"
  | "tecnico_designado"
  | "em_campo"
  | "concluido"
  | "cancelado";

export type PapelNotificavel = "admin_secretaria" | "empresa" | "tecnico" | "responsavel";

const MATRIZ: Record<EventoChamado, PapelNotificavel[]> = {
  aberto: ["admin_secretaria"],
  atribuido: ["empresa"],
  tecnico_designado: ["tecnico"],
  em_campo: ["responsavel"],
  concluido: ["responsavel", "admin_secretaria"],
  cancelado: ["responsavel", "empresa"],
};

// Quais papéis notificar para um evento. Desconhecido → [] (defensivo).
export function destinatariosDe(evento: string): PapelNotificavel[] {
  return MATRIZ[evento as EventoChamado] ?? [];
}

const BASE = "https://www.despachagov.com";

// Deep link best-effort para a área do papel.
export function linkPara(papel: PapelNotificavel): string {
  switch (papel) {
    case "responsavel":
      return `${BASE}/unidade`;
    case "admin_secretaria":
      return `${BASE}/secretaria/chamados`;
    case "empresa":
    case "tecnico":
      return `${BASE}/empresa`;
  }
}

export interface EventoEmailCtx {
  protocolo: string;
  unidadeNome: string;
  link: string;
}

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

// Monta assunto + HTML (identidade azul/laranja) para o evento.
export function emailEvento(evento: EventoChamado, ctx: EventoEmailCtx): { subject: string; html: string } {
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
