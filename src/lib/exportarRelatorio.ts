// Exporta um relatório em 5 formatos: PDF, Excel (XLSX), CSV, PNG, JSON.
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ChamadoLinha, DadosRelatorio } from "./relatorioModelo";

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

function exportarCsv(linhas: ChamadoLinha[], nome: string) {
  // BOM para o Excel abrir acentos certos.
  baixarBlob(new Blob(["﻿" + Papa.unparse(linhas)], { type: "text/csv;charset=utf-8;" }), `${nome}.csv`);
}

function exportarXlsx(linhas: ChamadoLinha[], nome: string) {
  const ws = XLSX.utils.json_to_sheet(linhas.map((l) => ({
    Data: l.data,
    Protocolo: l.protocolo,
    Serviço: l.descricao,
    Unidade: l.unidade,
    Urgência: l.urgencia,
    Status: l.status,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Chamados");
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
    case "csv": exportarCsv(dados.chamados, nome); break;
    case "xlsx": exportarXlsx(dados.chamados, nome); break;
    case "json": exportarJson(dados, nome); break;
  }
}
