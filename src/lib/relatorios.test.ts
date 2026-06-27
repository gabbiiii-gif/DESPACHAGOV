import { describe, it, expect } from "vitest";
import { linhasRelatorio, nomeArquivoRelatorio, type ChamadoRelatorio } from "./relatorios";

const chamados: ChamadoRelatorio[] = [
  {
    numero_protocolo: "2026-000123",
    unidade_id: "u1",
    empresa_id: "e1",
    status: "concluido",
    urgencia: "alta",
    created_at: "2026-06-01T00:00:00Z",
    data_conclusao: "2026-06-02T00:00:00Z",
  },
  {
    numero_protocolo: "2026-000124",
    unidade_id: "u2",
    empresa_id: null,
    status: "aberto",
    urgencia: null,
    created_at: "2026-06-03T00:00:00Z",
    data_conclusao: null,
  },
];

const nomeUnidade = (id: string) => (id === "u1" ? "Escola Central" : "Posto Norte");
const nomeEmpresa = (id: string | null) => (id === "e1" ? "ManutençãoX" : "—");

describe("linhasRelatorio", () => {
  it("resolve nomes e trata urgência nula / sem conclusão", () => {
    const r = linhasRelatorio(chamados, nomeUnidade, nomeEmpresa);
    expect(r[0]).toEqual({
      protocolo: "2026-000123",
      unidade: "Escola Central",
      empresa: "ManutençãoX",
      status: "concluido",
      urgencia: "alta",
      aberto_em: "2026-06-01T00:00:00Z",
      concluido_em: "2026-06-02T00:00:00Z",
    });
    expect(r[1]!.urgencia).toBe("sem triagem");
    expect(r[1]!.empresa).toBe("—");
    expect(r[1]!.concluido_em).toBe("");
  });
});

describe("nomeArquivoRelatorio", () => {
  it("carimba a data", () => {
    expect(nomeArquivoRelatorio("chamados", new Date(2026, 5, 7))).toBe("chamados_2026-06-07");
  });
});
