import { describe, it, expect } from "vitest";
import { agruparErros, deveReportar, promptErros, validarAnalise, type ErroRegistro } from "./monitor";

const erros: ErroRegistro[] = [
  { fonte: "front", nivel: "error", mensagem: "X is not a function", created_at: "2026-06-28T10:00:00Z" },
  { fonte: "front", nivel: "error", mensagem: "X is not a function", created_at: "2026-06-28T11:00:00Z" },
  { fonte: "front", nivel: "error", mensagem: "Failed to fetch", created_at: "2026-06-28T09:00:00Z" },
];

describe("agruparErros", () => {
  it("agrupa, conta e ordena por ocorrências", () => {
    const g = agruparErros(erros);
    expect(g).toHaveLength(2);
    expect(g[0]!.mensagem).toBe("X is not a function");
    expect(g[0]!.ocorrencias).toBe(2);
    expect(g[0]!.ultima).toBe("2026-06-28T11:00:00Z");
  });
});

describe("deveReportar", () => {
  it("bloqueia repetição dentro do silêncio e libera depois", () => {
    const m = new Map<string, number>();
    expect(deveReportar("err", 1000, m, 5000)).toBe(true);
    expect(deveReportar("err", 3000, m, 5000)).toBe(false);
    expect(deveReportar("err", 7000, m, 5000)).toBe(true);
  });
});

describe("promptErros", () => {
  it("lista os grupos e marca vazio", () => {
    expect(promptErros([])).toContain("Nenhum erro");
    expect(promptErros(agruparErros(erros))).toContain("X is not a function");
  });
});

describe("validarAnalise", () => {
  it("aceita shape válido e filtra listas", () => {
    const r = validarAnalise({ resumo: "ok", riscos: ["a", 1], recomendacoes: ["b"] });
    expect(r).toEqual({ resumo: "ok", riscos: ["a"], recomendacoes: ["b"] });
  });
  it("rejeita sem resumo", () => {
    expect(validarAnalise({ riscos: [] })).toBeNull();
  });
});
