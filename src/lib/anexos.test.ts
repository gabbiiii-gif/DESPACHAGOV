import { describe, it, expect } from "vitest";
import { validarAnexosAbertura, type ArquivoMeta } from "./anexos";

const png = (over: Partial<ArquivoMeta> = {}): ArquivoMeta => ({ name: "of.png", type: "image/png", size: 1000, ...over });

describe("validarAnexosAbertura", () => {
  it("exige ao menos 1 arquivo", () => {
    expect(validarAnexosAbertura([]).ok).toBe(false);
  });

  it("aceita 1 a 3 arquivos válidos", () => {
    expect(validarAnexosAbertura([png()]).ok).toBe(true);
    expect(validarAnexosAbertura([png(), png({ type: "image/jpeg" }), png({ type: "application/pdf" })]).ok).toBe(true);
  });

  it("rejeita mais de 3 arquivos", () => {
    expect(validarAnexosAbertura([png(), png(), png(), png()]).ok).toBe(false);
  });

  it("rejeita tipo não permitido", () => {
    const r = validarAnexosAbertura([png({ name: "x.gif", type: "image/gif" })]);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain("x.gif");
  });

  it("rejeita arquivo acima de 10 MB", () => {
    const r = validarAnexosAbertura([png({ size: 11 * 1024 * 1024 })]);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain("10 MB");
  });
});
