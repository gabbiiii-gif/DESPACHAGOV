import { describe, it, expect } from "vitest";
import {
  URGENCIAS,
  URGENCIA_META,
  isUrgencia,
  podeTransicionar,
  proximosEstados,
  validarAnexo,
  ANEXO_MAX_BYTES,
  horasEntre,
  slaCumprido,
} from "./chamados";

describe("urgência", () => {
  it("tem 4 níveis ranqueados crescentes", () => {
    const ranks = URGENCIAS.map((u) => URGENCIA_META[u].rank);
    expect(ranks).toEqual([0, 1, 2, 3]);
  });
  it("isUrgencia valida o vocabulário travado", () => {
    expect(isUrgencia("critica")).toBe(true);
    expect(isUrgencia("urgente")).toBe(false); // vocabulário antigo do escola.js
    expect(isUrgencia(null)).toBe(false);
  });
});

describe("máquina de estados", () => {
  it("permite transições válidas", () => {
    expect(podeTransicionar("aberto", "atribuido")).toBe(true);
    expect(podeTransicionar("em_campo", "concluido")).toBe(true);
  });
  it("bloqueia transições inválidas", () => {
    expect(podeTransicionar("aberto", "concluido")).toBe(false);
    expect(podeTransicionar("concluido", "aberto")).toBe(false); // terminal
  });
  it("concluido é terminal", () => {
    expect(proximosEstados("concluido")).toHaveLength(0);
  });
});

describe("validarAnexo", () => {
  it("aceita PDF e imagem dentro do limite", () => {
    expect(validarAnexo({ type: "application/pdf", size: 1000 }).ok).toBe(true);
    expect(validarAnexo({ type: "image/jpeg", size: 1000 }).ok).toBe(true);
  });
  it("rejeita tipo inválido e excesso de tamanho", () => {
    expect(validarAnexo({ type: "text/plain", size: 10 }).ok).toBe(false);
    expect(validarAnexo({ type: "image/png", size: ANEXO_MAX_BYTES + 1 }).ok).toBe(false);
    expect(validarAnexo(null).ok).toBe(false);
  });
});

describe("SLA", () => {
  it("calcula horas entre timestamps", () => {
    expect(horasEntre("2026-06-01T00:00:00Z", "2026-06-01T06:00:00Z")).toBe(6);
  });
  it("marca cumprido quando dentro do prazo", () => {
    expect(slaCumprido(24, 20)).toBe(true);
    expect(slaCumprido(24, 25)).toBe(false);
  });
});
