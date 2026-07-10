import html2pdf from "html2pdf.js";
import semedLogo from "@/assets/semed.png";

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

// Paleta e famílias iguais ao RelatorioDoc — mantém consistência visual
// entre relatórios institucionais e o comprovante de conclusão.
const C = {
  oliva: "#636B2F",
  laranja: "#C2602F",
  verde: "#157A52",
  cinza: "#6B7488",
  cinzaClaro: "#9099ab",
  borda: "#E3E6EC",
  linha: "#EEF0F4",
  fundoSuave: "#F7F8FB",
};
const display = "'Plus Jakarta Sans','Public Sans',sans-serif";
const corpo = "'Public Sans',sans-serif";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
function tempoDecorrido(deISO: string, ateISO: string): string {
  const ms = new Date(ateISO).getTime() - new Date(deISO).getTime();
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h${String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0")}`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
function docNum(protocolo: string, conclusaoISO: string): string {
  const d = new Date(conclusaoISO);
  return `DG-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-EXE-${protocolo.replace(/[^0-9A-Za-z]/g, "")}`;
}

// Converte o asset da logo em data URL para embutir direto no HTML — assim
// a captura via html2canvas não corre em cima de um <img> ainda carregando
// (que era o motivo do PDF vir em branco quando o elemento é criado on-the-fly).
let logoDataUrlCache: string | null = null;
async function logoParaDataUrl(): Promise<string> {
  if (logoDataUrlCache) return logoDataUrlCache;
  const blob = await (await fetch(semedLogo)).blob();
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
  logoDataUrlCache = dataUrl;
  return dataUrl;
}

// Gera e baixa o comprovante de execução em PDF (html2pdf no cliente).
// Layout alinhado ao RelatorioDoc: logo institucional, header oliva/laranja,
// bloco de identificação, KPIs de execução, descrição, registro fotográfico
// pareado (antes/depois) e assinatura.
export async function gerarComprovantePdf(d: ComprovanteData): Promise<void> {
  const emitidoEm = fmtData(new Date().toISOString());
  const numero = docNum(d.protocolo, d.conclusaoISO);
  const decorrido = tempoDecorrido(d.aberturaISO, d.conclusaoISO);
  const logoSrc = await logoParaDataUrl();

  const antes = (d.fotos ?? []).filter((f) => f.tipo === "foto_antes");
  const depois = (d.fotos ?? []).filter((f) => f.tipo === "foto_depois");
  const paresMax = Math.max(antes.length, depois.length);
  const paresHtml = paresMax === 0 ? "" : Array.from({ length: paresMax }).map((_, i) => {
    const a = antes[i], p = depois[i];
    const cell = (label: string, url?: string) => `
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div style="font-family:${display};font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.cinza}">${label}</div>
        ${url
          ? `<img src="${url}" style="width:100%;height:210px;object-fit:cover;border:1px solid ${C.borda};border-radius:10px" />`
          : `<div style="width:100%;height:210px;border:1px dashed ${C.borda};border-radius:10px;display:flex;align-items:center;justify-content:center;color:${C.cinzaClaro};font-size:11.5px">sem registro</div>`}
      </div>`;
    return `<div style="display:flex;gap:16px;margin-bottom:14px">${cell("Antes", a?.dataUrl)}${cell("Depois", p?.dataUrl)}</div>`;
  }).join("");

  const linhaInfo = (rot: string, val: string, corVal?: string) => `
    <tr style="border-bottom:1px solid ${C.linha}">
      <td style="padding:11px 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.cinza};font-weight:600;width:180px">${rot}</td>
      <td style="padding:11px 4px;font-size:13px;font-weight:600;color:${corVal ?? C.oliva}">${val}</td>
    </tr>`;

  const assinaturaBlock = d.assinaturaDataUrl
    ? `<div style="display:flex;justify-content:center;margin-top:50px">
         <div style="text-align:center;width:340px">
           <img src="${d.assinaturaDataUrl}" style="max-height:70px;max-width:100%;display:block;margin:0 auto 4px" />
           <div style="border-top:1.5px solid ${C.oliva};padding-top:8px;font-family:${display};font-size:12.5px;color:${C.oliva};font-weight:700">${esc(d.signatarioNome ?? "Responsável pela unidade")}</div>
           <div style="font-size:11.5px;color:${C.cinza}">Assinatura de recebimento</div>
         </div>
       </div>`
    : `<div style="display:flex;justify-content:space-between;gap:40px;margin-top:60px">
         <div style="flex:1;text-align:center">
           <div style="border-top:1.5px solid ${C.oliva};padding-top:8px;font-family:${display};font-size:12px;color:${C.oliva};font-weight:700">${esc(d.tecnico ?? "Técnico responsável")}</div>
           <div style="font-size:11px;color:${C.cinza}">${esc(d.empresa ?? "Empresa executora")}</div>
         </div>
         <div style="flex:1;text-align:center">
           <div style="border-top:1.5px solid ${C.oliva};padding-top:8px;font-family:${display};font-size:12px;color:${C.oliva};font-weight:700">${esc(d.signatarioNome ?? "Responsável pela unidade")}</div>
           <div style="font-size:11px;color:${C.cinza}">Recebimento do serviço</div>
         </div>
       </div>`;

  const el = document.createElement("div");
  el.style.cssText = `width:820px;background:#fff;padding:52px 52px 44px;color:${C.oliva};font-family:${corpo};box-sizing:border-box`;
  el.innerHTML = `
    <div style="display:flex;justify-content:center;margin-bottom:20px">
      <img src="${logoSrc}" alt="SEMED · Prefeitura de Altamira" style="height:62px;display:block" />
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${C.oliva};padding-bottom:18px;margin-bottom:6px">
      <div>
        <div style="font-family:${display};font-weight:800;font-size:15px;color:${C.oliva}">Prefeitura de Altamira</div>
        <div style="font-size:12.5px;color:${C.cinza}">Secretaria Municipal de Educação</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${C.laranja};font-weight:700">Comprovante de Execução</div>
        <div style="font-family:${display};font-size:18px;font-weight:800;color:${C.oliva}">Serviço Concluído</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:${C.cinzaClaro};margin-bottom:26px">
      Emitido em ${emitidoEm} · Doc. nº ${numero}
    </div>

    <h1 style="font-family:${display};font-size:25px;font-weight:800;color:${C.oliva};margin:0 0 6px">
      Protocolo ${esc(d.protocolo)}
    </h1>
    <p style="font-size:14px;color:${C.cinza};line-height:1.6;margin:0 0 24px">
      Comprovante oficial de conclusão do chamado de manutenção registrado na plataforma DespachaGov, com dados do executor, do responsável pela unidade e o registro fotográfico do serviço.
    </p>

    <div style="display:flex;gap:16px;align-items:center;background:${C.fundoSuave};border:1px solid ${C.borda};border-radius:12px;padding:18px 20px;margin-bottom:26px">
      <div style="flex:1">
        <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.cinza};font-weight:600">Unidade atendida</div>
        <div style="font-family:${display};font-size:17px;font-weight:800;color:${C.oliva};margin-top:2px">${esc(d.unidade)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:${display};font-size:22px;font-weight:800;color:${C.verde}">${decorrido}</div>
        <div style="font-size:11px;color:${C.cinza}">tempo de execução</div>
      </div>
    </div>

    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${C.cinza};margin-bottom:12px">Identificação</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tbody>
        ${linhaInfo("Protocolo", esc(d.protocolo))}
        ${linhaInfo("Urgência", esc(d.urgencia))}
        ${linhaInfo("Empresa executora", esc(d.empresa ?? "—"))}
        ${linhaInfo("Técnico responsável", esc(d.tecnico ?? "—"))}
        ${linhaInfo("Abertura do chamado", fmt(d.aberturaISO))}
        ${linhaInfo("Conclusão do serviço", fmt(d.conclusaoISO), C.verde)}
      </tbody>
    </table>

    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${C.cinza};margin-bottom:10px">Descrição do atendimento</div>
    <div style="border-left:3px solid ${C.laranja};padding:2px 0 2px 14px;margin-bottom:30px">
      <p style="font-size:13.5px;line-height:1.65;color:${C.oliva};margin:0">${esc(d.descricao)}</p>
    </div>

    ${paresHtml ? `
      <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${C.cinza};margin-bottom:14px">Registro fotográfico</div>
      ${paresHtml}
    ` : ""}

    ${assinaturaBlock}

    <div style="margin-top:36px;padding-top:14px;border-top:1px solid ${C.borda};display:flex;justify-content:space-between;font-size:10.5px;color:${C.cinzaClaro}">
      <span>DespachaGov · Comprovante gerado automaticamente</span>
      <span>Página 1 de 1</span>
    </div>
  `;

  // Precisa estar no DOM para o layout calcular scrollHeight (fotos, tabelas
  // e assinatura crescem em altura). Fica invisível mas com dimensões reais.
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  document.body.appendChild(el);

  try {
    // Espera as imagens (fotos) decodificarem antes da captura — evita cortes
    // por altura ainda não calculada quando o layout depende do <img>.
    const imgs = Array.from(el.querySelectorAll("img"));
    await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));

    // PDF dimensionado exatamente ao conteúdo (mesmo padrão do relatório):
    // altura da página = altura do documento, nada é cortado.
    const altura = el.scrollHeight + 8;
    await html2pdf()
      .set({
        margin: 0,
        filename: `comprovante_${d.protocolo}.pdf`,
        image: { type: "jpeg", quality: 0.94 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "px", format: [820, altura], orientation: "portrait" },
      })
      .from(el)
      .save();
  } finally {
    document.body.removeChild(el);
  }
}
