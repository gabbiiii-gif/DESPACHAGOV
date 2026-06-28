// Exporta um relatório em 5 formatos: PDF, Excel (XLSX), CSV, PNG, JSON.
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { DadosRelatorio } from "./relatorioModelo";

type Celula = string | number;

export type FormatoRelatorio = "pdf" | "xlsx" | "csv" | "png" | "json";

export const FORMATOS: { id: FormatoRelatorio; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "xlsx", label: "Excel" },
  { id: "csv", label: "CSV" },
  { id: "png", label: "Imagem (PNG)" },
  { id: "json", label: "JSON" },
];

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

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

// Seções da planilha/CSV — sempre com cabeçalho, mesmo sem linhas.
function secoes(dados: DadosRelatorio): { titulo: string; header: string[]; linhas: Celula[][] }[] {
  return [
    {
      titulo: "Resumo", header: ["Indicador", "Valor"],
      linhas: [
        ["Chamados totais", dados.total],
        ["Concluídos", dados.concluidos],
        ["Em aberto", dados.emAberto],
        ["Taxa de conclusão (%)", dados.taxaPct],
        ["Tempo médio até conclusão (h)", dados.tempoMedioHoras != null ? Number(dados.tempoMedioHoras.toFixed(1)) : "—"],
      ],
    },
    { titulo: "Por unidade", header: ["Unidade", "Chamados", "Concluídos"], linhas: dados.porUnidade.map((u) => [u.nome, u.total, u.concluidos]) },
    { titulo: "Por urgência", header: ["Urgência", "Chamados", "Concluídos"], linhas: dados.porUrgencia.map((l) => [l.rotulo, l.total, l.concluidos]) },
    { titulo: "Chamados", header: ["Data", "Protocolo", "Serviço", "Unidade", "Urgência", "Status"], linhas: dados.chamados.map((c) => [c.data, c.protocolo, c.descricao, c.unidade, c.urgencia, c.status]) },
  ];
}

function exportarCsv(dados: DadosRelatorio, nome: string) {
  const texto = secoes(dados)
    .map((s) => `${s.titulo}\n${Papa.unparse({ fields: s.header, data: s.linhas })}`)
    .join("\n\n");
  // BOM para o Excel abrir acentos certos.
  baixarBlob(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8;" }), `${nome}.csv`);
}

function exportarXlsx(dados: DadosRelatorio, nome: string) {
  const wb = XLSX.utils.book_new();
  for (const s of secoes(dados)) {
    const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.linhas]);
    XLSX.utils.book_append_sheet(wb, ws, s.titulo);
  }
  XLSX.writeFile(wb, `${nome}.xlsx`);
}

function exportarJson(dados: DadosRelatorio, nome: string) {
  baixarBlob(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }), `${nome}.json`);
}

export async function exportarRelatorio(
  formato: FormatoRelatorio,
  ctx: { el: HTMLElement | null; nome: string; dados: DadosRelatorio },
): Promise<void> {
  const { el, nome, dados } = ctx;
  switch (formato) {
    case "pdf": if (el) await exportarPdf(el, nome); break;
    case "png": if (el) await exportarPng(el, nome); break;
    case "csv": exportarCsv(dados, nome); break;
    case "xlsx": exportarXlsx(dados, nome); break;
    case "json": exportarJson(dados, nome); break;
  }
}
