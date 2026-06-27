import html2pdf from "html2pdf.js";
import { nomeArquivoRelatorio } from "./relatorios";

export interface ResumoRelatorio {
  secretaria: string;
  total: number;
  concluidos: number;
  taxaConclusaoPct: number;
  tempoMedioConclusaoHoras: number | null;
  porStatus: { label: string; n: number }[];
  porUrgencia: { label: string; n: number }[];
}

function fmtHoras(h: number | null): string {
  if (h == null) return "—";
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}

// Gera e baixa o relatório-resumo do painel em PDF (html2pdf no cliente).
export async function gerarRelatorioPdf(r: ResumoRelatorio): Promise<void> {
  const linha = (label: string, n: number) =>
    `<tr><td style="padding:4px 0;color:#6B7488">${label}</td><td style="text-align:right;font-weight:600">${n}</td></tr>`;
  const statusHtml = r.porStatus.map((s) => linha(s.label, s.n)).join("");
  const urgenciaHtml = r.porUrgencia.map((u) => linha(u.label, u.n)).join("");

  const el = document.createElement("div");
  el.style.cssText = "font-family:Arial,Helvetica,sans-serif;color:#374151;padding:24px;max-width:720px";
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;border-bottom:2px solid #2456A6;padding-bottom:12px;margin-bottom:16px">
      <span style="font-size:22px;font-weight:bold;font-style:italic"><span style="color:#F97316">Despacha</span><span style="color:#2456A6">Gov</span></span>
      <span style="margin-left:auto;font-size:13px;color:#6B7488">Relatório de chamados</span>
    </div>
    <p style="font-size:13px;margin:0 0 12px"><b>${r.secretaria}</b></p>
    <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:8px">
      <tr><td style="padding:4px 0;color:#6B7488;width:220px">Total de chamados</td><td style="font-weight:bold">${r.total}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Concluídos</td><td>${r.concluidos}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Taxa de conclusão</td><td>${r.taxaConclusaoPct}%</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Tempo médio até conclusão</td><td>${fmtHoras(r.tempoMedioConclusaoHoras)}</td></tr>
    </table>
    <h3 style="font-size:14px;color:#1A3F7A;margin:18px 0 6px">Por status</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse">${statusHtml}</table>
    <h3 style="font-size:14px;color:#1A3F7A;margin:18px 0 6px">Por urgência</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse">${urgenciaHtml}</table>
    <p style="margin-top:24px;font-size:11px;color:#9CA3AF;text-align:center">Gerado por DespachaGov em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
  `;

  await html2pdf()
    .set({
      margin: 10,
      filename: `${nomeArquivoRelatorio("relatorio-chamados")}.pdf`,
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(el)
    .save();
}
