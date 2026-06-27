import { describe, it, expect } from "vitest";
import { validarSugestao, promptUsuario, SUGESTAO_SCHEMA, CATEGORIAS } from "./aiTriagem";

describe("validarSugestao", () => {
  it("aceita urgência e categoria do domínio", () => {
    const r = validarSugestao({ urgencia: "alta", categoria: "eletrica", justificativa: "Fios expostos." });
    expect(r).toEqual({ urgencia: "alta", categoria: "eletrica", justificativa: "Fios expostos." });
  });

  it("rejeita urgência fora do domínio", () => {
    expect(validarSugestao({ urgencia: "urgentíssima", categoria: "eletrica", justificativa: "x" })).toBeNull();
  });

  it("rejeita categoria fora do domínio", () => {
    expect(validarSugestao({ urgencia: "baixa", categoria: "jardinagem", justificativa: "x" })).toBeNull();
  });

  it("rejeita entrada não-objeto", () => {
    expect(validarSugestao(null)).toBeNull();
    expect(validarSugestao("texto")).toBeNull();
  });

  it("tolera justificativa ausente (vira string vazia)", () => {
    const r = validarSugestao({ urgencia: "media", categoria: "outros" });
    expect(r?.justificativa).toBe("");
  });
});

describe("promptUsuario", () => {
  it("inclui a descrição", () => {
    expect(promptUsuario("  Ar parado  ")).toContain("Ar parado");
  });
});

describe("SUGESTAO_SCHEMA", () => {
  it("enumera todas as categorias e fecha o objeto", () => {
    expect(SUGESTAO_SCHEMA.additionalProperties).toBe(false);
    expect(SUGESTAO_SCHEMA.properties.categoria.enum).toEqual([...CATEGORIAS]);
    expect(SUGESTAO_SCHEMA.required).toContain("urgencia");
  });
});
