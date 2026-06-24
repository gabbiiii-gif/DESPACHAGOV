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
