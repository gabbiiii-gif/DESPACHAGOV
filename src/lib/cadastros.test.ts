import { describe, it, expect } from "vitest";
import { normalizarLinhaUnidade } from "./cadastros";

describe("normalizarLinhaUnidade", () => {
  it("normaliza linha completa", () => {
    const r = normalizarLinhaUnidade({
      nome: "Escola A", zona: "Rural", lat: "-3,20", lng: "-52,21", inep: "15001",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ nome: "Escola A", zona: "rural", lat: -3.2, lng: -52.21, codigo_inep: "15001" });
    }
  });
  it("rejeita nome vazio", () => {
    const r = normalizarLinhaUnidade({ nome: "  " });
    expect(r.ok).toBe(false);
  });
  it("ignora zona inválida e coords não numéricas", () => {
    const r = normalizarLinhaUnidade({ nome: "B", zona: "x", lat: "abc" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.zona).toBeUndefined();
      expect(r.data.lat).toBeUndefined();
    }
  });
});

import { enderecoParaGeocode } from "./cadastros";

describe("enderecoParaGeocode", () => {
  it("monta endereço estruturado com Brasil no fim", () => {
    const q = enderecoParaGeocode({
      logradouro_tipo: "Rua", logradouro: "das Flores", numero: "123",
      bairro: "Centro", cidade: "Altamira", cep: "68370-000",
    });
    expect(q).toBe("Rua das Flores, 123, Centro, Altamira, 68370-000, Brasil");
  });
  it("ignora campos vazios", () => {
    expect(enderecoParaGeocode({ logradouro_tipo: "Avenida", logradouro: "Brasil", cidade: "Altamira" }))
      .toBe("Avenida Brasil, Altamira, Brasil");
  });
  it("cai no nome quando não há endereço", () => {
    expect(enderecoParaGeocode({ nome: "EMEF Teste" })).toBe("EMEF Teste");
  });
});
