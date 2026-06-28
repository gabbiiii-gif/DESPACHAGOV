import html2pdf from "html2pdf.js";

export interface ComprovanteData {
  protocolo: string;
  unidade: string;
  descricao: string;
  urgencia: string;
  empresa?: string | undefined;
  tecnico?: string | undefined;
  aberturaISO: string;
  conclusaoISO: string;
  assinaturaDataUrl?: string | null | undefined;
  signatarioNome?: string | undefined;
  fotos?: { tipo: string; dataUrl: string }[] | undefined;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Gera e baixa o comprovante de execução em PDF (html2pdf no cliente).
export async function gerarComprovantePdf(d: ComprovanteData): Promise<void> {
  const fotosHtml = (d.fotos ?? [])
    .map(
      (f) => `<div style="display:inline-block;width:48%;margin:1%;vertical-align:top">
        <div style="font-size:11px;color:#6B7488;margin-bottom:4px">${f.tipo === "foto_antes" ? "Antes" : "Depois"}</div>
        <img src="${f.dataUrl}" style="width:100%;border:1px solid #E5E7EB;border-radius:6px" />
      </div>`,
    )
    .join("");

  const el = document.createElement("div");
  el.style.cssText = "font-family:Arial,Helvetica,sans-serif;color:#374151;padding:24px;max-width:720px";
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;border-bottom:2px solid #2456A6;padding-bottom:12px;margin-bottom:16px">
      <span style="font-size:22px;font-weight:bold;font-style:italic"><span style="color:#F97316">Despacha</span><span style="color:#2456A6">Gov</span></span>
      <span style="margin-left:auto;font-size:13px;color:#6B7488">Comprovante de execução</span>
    </div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#6B7488;width:160px">Protocolo</td><td style="font-weight:bold">${d.protocolo}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Unidade</td><td>${d.unidade}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Urgência</td><td>${d.urgencia}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Empresa</td><td>${d.empresa ?? "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Técnico</td><td>${d.tecnico ?? "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Aberto em</td><td>${fmt(d.aberturaISO)}</td></tr>
      <tr><td style="padding:4px 0;color:#6B7488">Concluído em</td><td>${fmt(d.conclusaoISO)}</td></tr>
    </table>
    <h3 style="font-size:14px;color:#1A3F7A;margin:18px 0 6px">Descrição</h3>
    <p style="font-size:13px;line-height:1.5;margin:0">${d.descricao}</p>
    ${fotosHtml ? `<h3 style="font-size:14px;color:#1A3F7A;margin:18px 0 6px">Registro fotográfico</h3><div>${fotosHtml}</div>` : ""}
    <p style="margin-top:24px;font-size:11px;color:#9CA3AF;text-align:center">Gerado por DespachaGov em ${fmt(new Date().toISOString())}</p>
  `;

  await html2pdf()
    .set({
      margin: 10,
      filename: `comprovante_${d.protocolo}.pdf`,
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(el)
    .save();
}
