// Exporta um relatório em 5 formatos: PDF, Excel (XLSX), CSV, PNG, JSON.
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import type ExcelJS from "exceljs";
import Papa from "papaparse";
import type { DadosRelatorio } from "./relatorioModelo";

export type FormatoRelatorio = "pdf" | "xlsx" | "csv" | "png" | "json";

export const FORMATOS: { id: FormatoRelatorio; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "xlsx", label: "Excel" },
  { id: "csv", label: "CSV" },
  { id: "png", label: "Imagem (PNG)" },
  { id: "json", label: "JSON" },
];

export interface MetaRelatorio { periodo: string; orgao: string }

type Celula = string | number;

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

const emAberto = (d: DadosRelatorio) => d.total - d.concluidos;
const taxa = (concluidos: number, total: number) => (total ? Math.round((concluidos / total) * 100) : 0);

// ─── PDF / PNG ───────────────────────────────────────────────────────────────
async function exportarPdf(el: HTMLElement, nome: string) {
  await html2pdf()
    .set({
      margin: 0,
      filename: `${nome}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "px", format: [820, el.scrollHeight + 8], orientation: "portrait" },
    })
    .from(el)
    .save();
}

async function exportarPng(el: HTMLElement, nome: string) {
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  await new Promise<void>((res) => {
    canvas.toBlob((b) => {
      if (b) baixarBlob(b, `${nome}.png`);
      res();
    }, "image/png");
  });
}

// ─── CSV (seccionado) ────────────────────────────────────────────────────────
function exportarCsv(dados: DadosRelatorio, nome: string, meta: MetaRelatorio) {
  const sec: { titulo: string; header: string[]; linhas: Celula[][] }[] = [
    {
      titulo: "Resumo", header: ["Indicador", "Valor"],
      linhas: [
        ["Chamados totais", dados.total],
        ["Concluídos", dados.concluidos],
        ["Em aberto", emAberto(dados)],
        ["Taxa de conclusão (%)", dados.taxaPct],
        ["Tempo médio até conclusão (h)", dados.tempoMedioHoras != null ? Number(dados.tempoMedioHoras.toFixed(1)) : "—"],
      ],
    },
    {
      titulo: "Por unidade", header: ["Unidade", "Chamados", "Concluídos", "Em aberto", "Taxa de conclusão (%)"],
      linhas: [
        ...dados.porUnidade.map((u) => [u.nome, u.total, u.concluidos, u.total - u.concluidos, taxa(u.concluidos, u.total)] as Celula[]),
        ["TOTAL", dados.total, dados.concluidos, emAberto(dados), dados.taxaPct],
      ],
    },
    {
      titulo: "Por urgência", header: ["Urgência", "Chamados", "Concluídos", "Em aberto", "Taxa de conclusão (%)"],
      linhas: [
        ...dados.porUrgencia.map((l) => [l.rotulo, l.total, l.concluidos, l.total - l.concluidos, taxa(l.concluidos, l.total)] as Celula[]),
        ["TOTAL", dados.total, dados.concluidos, emAberto(dados), dados.taxaPct],
      ],
    },
    {
      titulo: "Chamados", header: ["Data", "Protocolo", "Serviço", "Unidade", "Urgência", "Status"],
      linhas: dados.chamados.map((c) => [c.data, c.protocolo, c.descricao, c.unidade, c.urgencia, c.status]),
    },
  ];
  const cabecalho = `RELATÓRIO DE CHAMADOS\n${meta.orgao}\nPeríodo de referência: ${meta.periodo}\n`;
  const corpo = sec.map((s) => `${s.titulo}\n${Papa.unparse({ fields: s.header, data: s.linhas })}`).join("\n\n");
  baixarBlob(new Blob(["﻿" + cabecalho + "\n" + corpo], { type: "text/csv;charset=utf-8;" }), `${nome}.csv`);
}

// ─── Excel (XLSX) estilizado (ExcelJS) ───────────────────────────────────────
const VERDE = "FF0F6B3A", VERDE_CLARO = "FFE8F3EC", VERDE_VAL = "FF1B8E4D";
const TX = "FF1F2937", SEC = "FF6B7280", SUB = "FF5A6A5F", BRANCO = "FFFFFFFF";

function preencher(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function bordaFina(cell: ExcelJS.Cell) {
  cell.border = { bottom: { style: "thin", color: { argb: "FFE3E6EC" } } };
}

function cabecalhoFolha(ws: ExcelJS.Worksheet, titulo: string, ate: number, meta: MetaRelatorio) {
  ws.mergeCells(1, 2, 1, ate);
  Object.assign(ws.getCell(1, 2), { value: titulo });
  ws.getCell(1, 2).font = { name: "Calibri", size: 18, bold: true, color: { argb: VERDE } };
  ws.mergeCells(2, 2, 2, ate);
  ws.getCell(2, 2).value = meta.orgao;
  ws.getCell(2, 2).font = { name: "Calibri", size: 11, color: { argb: SUB } };
  ws.mergeCells(3, 2, 3, ate);
  ws.getCell(3, 2).value = `Período de referência: ${meta.periodo}`;
  ws.getCell(3, 2).font = { name: "Calibri", size: 10, color: { argb: SUB } };
}
function secao(ws: ExcelJS.Worksheet, texto: string) {
  const c = ws.getCell(6, 2);
  c.value = texto;
  c.font = { name: "Calibri", size: 11, bold: true, color: { argb: VERDE } };
}
// Cabeçalho de tabela (faixa verde) na linha `lin`, colunas 2..(1+labels.length).
function headerTabela(ws: ExcelJS.Worksheet, lin: number, labels: string[]) {
  labels.forEach((t, i) => {
    const c = ws.getCell(lin, 2 + i);
    c.value = t;
    c.font = { name: "Calibri", size: 10, bold: true, color: { argb: BRANCO } };
    preencher(c, VERDE);
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center" };
  });
}

async function exportarXlsx(dados: DadosRelatorio, nome: string, meta: MetaRelatorio) {
  // Carrega o ExcelJS sob demanda (chunk separado — não pesa o bundle inicial).
  const { default: ExcelJSLib } = await import("exceljs");
  const wb = new ExcelJSLib.Workbook();
  const M = 2.375;

  // ── Resumo (cards) ──
  const r = wb.addWorksheet("Resumo");
  r.columns = [{ width: M }, ...Array(8).fill({ width: 15.875 }), { width: M }];
  cabecalhoFolha(r, "RELATÓRIO DE CHAMADOS", 9, meta);
  secao(r, "VISÃO GERAL");
  const cards: { rot: string; val: Celula; desc: string; cor: string }[] = [
    { rot: "CHAMADOS TOTAIS", val: dados.total, desc: "chamados registrados", cor: TX },
    { rot: "CONCLUÍDOS", val: dados.concluidos, desc: "finalizados no período", cor: VERDE_VAL },
    { rot: "EM ABERTO", val: emAberto(dados), desc: "aguardando atendimento", cor: TX },
    { rot: "TAXA DE CONCLUSÃO", val: `${dados.taxaPct}%`, desc: "do total de chamados", cor: VERDE_VAL },
  ];
  cards.forEach((card, i) => {
    const col = 2 + i * 2; // B, D, F, H
    r.mergeCells(8, col, 8, col + 1);
    const rot = r.getCell(8, col);
    rot.value = card.rot; rot.font = { name: "Calibri", size: 9, bold: true, color: { argb: BRANCO } };
    preencher(rot, VERDE); rot.alignment = { horizontal: "center", vertical: "middle" };
    r.mergeCells(9, col, 9, col + 1);
    const v = r.getCell(9, col);
    v.value = card.val; v.font = { name: "Calibri", size: 28, bold: true, color: { argb: card.cor } };
    v.alignment = { horizontal: "center", vertical: "middle" };
    r.mergeCells(10, col, 10, col + 1);
    const d = r.getCell(10, col);
    d.value = card.desc; d.font = { name: "Calibri", size: 9, color: { argb: SEC } };
    d.alignment = { horizontal: "center", vertical: "middle" };
  });
  r.mergeCells(13, 2, 13, 9);
  const tmL = r.getCell(13, 2);
  tmL.value = "TEMPO MÉDIO ATÉ CONCLUSÃO"; tmL.font = { name: "Calibri", size: 9, bold: true, color: { argb: BRANCO } };
  preencher(tmL, VERDE);
  r.mergeCells(14, 2, 14, 9);
  const tmV = r.getCell(14, 2);
  tmV.value = dados.tempoMedioHoras != null ? `${dados.tempoMedioHoras.toFixed(1)} h` : "—";
  tmV.font = { name: "Calibri", size: 22, bold: true, color: { argb: TX } };
  r.mergeCells(15, 2, 15, 9);
  const tmD = r.getCell(15, 2);
  tmD.value = "do registro até a conclusão do chamado"; tmD.font = { name: "Calibri", size: 9, color: { argb: SEC } };

  // ── Tabela genérica (Por unidade / Por urgência) ──
  function folhaDistribuicao(titulo: string, secaoTxt: string, rotuloCol: string, larguraB: number, linhas: { rotulo: string; total: number; concluidos: number }[]) {
    const ws = wb.addWorksheet(titulo);
    ws.columns = [{ width: M }, { width: larguraB }, { width: 16.625 }, { width: 16.625 }, { width: 16.625 }, { width: 21.625 }, { width: M }];
    cabecalhoFolha(ws, titulo === "Por unidade" ? "CHAMADOS POR UNIDADE" : "CHAMADOS POR URGÊNCIA", 6, meta);
    secao(ws, secaoTxt);
    headerTabela(ws, 8, [rotuloCol, "CHAMADOS", "CONCLUÍDOS", "EM ABERTO", "TAXA DE CONCLUSÃO"]);
    let lin = 9;
    for (const l of linhas) {
      const vals: Celula[] = [l.rotulo, l.total, l.concluidos, l.total - l.concluidos, `${taxa(l.concluidos, l.total)}%`];
      vals.forEach((val, i) => {
        const c = ws.getCell(lin, 2 + i);
        c.value = val; c.font = { name: "Calibri", size: 11, color: { argb: TX } };
        c.alignment = { horizontal: i === 0 ? "left" : "center" };
        bordaFina(c);
      });
      lin++;
    }
    const totalVals: Celula[] = ["TOTAL", dados.total, dados.concluidos, emAberto(dados), `${dados.taxaPct}%`];
    totalVals.forEach((val, i) => {
      const c = ws.getCell(lin, 2 + i);
      c.value = val; c.font = { name: "Calibri", size: 11, bold: true, color: { argb: VERDE } };
      preencher(c, VERDE_CLARO); c.alignment = { horizontal: i === 0 ? "left" : "center" };
    });
  }
  folhaDistribuicao("Por unidade", "DISTRIBUIÇÃO POR UNIDADE ESCOLAR", "UNIDADE", 63.375, dados.porUnidade.map((u) => ({ rotulo: u.nome, total: u.total, concluidos: u.concluidos })));
  folhaDistribuicao("Por urgência", "DISTRIBUIÇÃO POR NÍVEL DE URGÊNCIA", "URGÊNCIA", 30, dados.porUrgencia.map((l) => ({ rotulo: l.rotulo, total: l.total, concluidos: l.concluidos })));

  // ── Chamados ──
  const ch = wb.addWorksheet("Chamados");
  ch.columns = [{ width: M }, { width: 15.875 }, { width: 17.5 }, { width: 30 }, { width: 53.375 }, { width: 16.625 }, { width: 20 }, { width: M }];
  cabecalhoFolha(ch, "REGISTRO DE CHAMADOS", 7, meta);
  secao(ch, "DETALHAMENTO DOS CHAMADOS");
  headerTabela(ch, 8, ["Data", "Protocolo", "Serviço", "Unidade", "Urgência", "Status"]);
  let lin = 9;
  for (const c of dados.chamados) {
    [c.data, c.protocolo, c.descricao, c.unidade, c.urgencia, c.status].forEach((val, i) => {
      const cell = ch.getCell(lin, 2 + i);
      cell.value = val; cell.font = { name: "Calibri", size: 11, color: { argb: TX } };
      bordaFina(cell);
    });
    lin++;
  }

  const buf = await wb.xlsx.writeBuffer();
  baixarBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${nome}.xlsx`);
}

// ─── JSON ────────────────────────────────────────────────────────────────────
function exportarJson(dados: DadosRelatorio, nome: string) {
  baixarBlob(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }), `${nome}.json`);
}

export async function exportarRelatorio(
  formato: FormatoRelatorio,
  ctx: { el: HTMLElement | null; nome: string; dados: DadosRelatorio; meta: MetaRelatorio },
): Promise<void> {
  const { el, nome, dados, meta } = ctx;
  switch (formato) {
    case "pdf": if (el) await exportarPdf(el, nome); break;
    case "png": if (el) await exportarPng(el, nome); break;
    case "csv": exportarCsv(dados, nome, meta); break;
    case "xlsx": await exportarXlsx(dados, nome, meta); break;
    case "json": exportarJson(dados, nome); break;
  }
}
