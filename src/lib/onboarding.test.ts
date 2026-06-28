import { describe, it, expect } from "vitest";
import { passosOnboarding, progressoOnboarding, onboardingCompleto } from "./onboarding";

describe("passosOnboarding", () => {
  it("marca concluído conforme as contagens", () => {
    const p = passosOnboarding({ unidades: 2, empresas: 0, usuarios: 1 });
    expect(p.find((s) => s.chave === "unidades")?.concluido).toBe(true);
    expect(p.find((s) => s.chave === "empresas")?.concluido).toBe(false);
    expect(p.find((s) => s.chave === "usuarios")?.concluido).toBe(true);
  });
});

describe("progressoOnboarding", () => {
  it("conta feitos e total", () => {
    expect(progressoOnboarding({ unidades: 1, empresas: 1, usuarios: 0 })).toEqual({ feitos: 2, total: 3 });
  });
});

describe("onboardingCompleto", () => {
  it("true só com todos os passos", () => {
    expect(onboardingCompleto({ unidades: 1, empresas: 1, usuarios: 1 })).toBe(true);
    expect(onboardingCompleto({ unidades: 1, empresas: 1, usuarios: 0 })).toBe(false);
  });
});
