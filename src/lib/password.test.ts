import { describe, it, expect } from "vitest";
import { checarSenha, senhaValida } from "./password";

describe("checarSenha", () => {
  it("aprova senha completa", () => {
    expect(senhaValida("Gabb0089?")).toBe(true);
    const r = checarSenha("Gabb0089?");
    expect(r).toEqual({ tamanho: true, maiuscula: true, minuscula: true, numero: true, especial: true });
  });
  it("reprova faltando especial", () => {
    expect(senhaValida("Gabb0089")).toBe(false);
    expect(checarSenha("Gabb0089").especial).toBe(false);
  });
  it("reprova faltando maiúscula", () => {
    expect(checarSenha("gabb0089?").maiuscula).toBe(false);
  });
  it("reprova curta", () => {
    expect(checarSenha("Ga0?").tamanho).toBe(false);
  });
});
