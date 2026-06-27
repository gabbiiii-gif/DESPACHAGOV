import { describe, it, expect } from "vitest";
import {
  prazoPrevistoHoras, avaliarSla, resumoSlaMensal, taxaSlaGeral, PRAZO_PADRAO_HORAS, type ChamadoSla,
} from "./sla";

function ch(p: Partial<ChamadoSla>): ChamadoSla {
  return {
    urgencia: "alta",
    sla_horas: null,
    created_at: "2026-06-01T00:00:00Z",
    data_conclusao: null,
    status: "concluido",
    ...p,
  };
}

describe("prazoPrevistoHoras", () => {
  it("usa sla_horas explícito quando há", () => {
    expect(prazoPrevistoHoras(ch({ sla_horas: 12, urgencia: "baixa" }))).toBe(12);
  });
  it("cai no padrão da urgência", () => {
    expect(prazoPrevistoHoras(ch({ urgencia: "critica" }))).toBe(PRAZO_PADRAO_HORAS.critica);
  });
  it("null sem urgência", () => {
    expect(prazoPrevistoHoras(ch({ urgencia: null }))).toBeNull();
  });
});

describe("avaliarSla", () => {
  it("cumprido quando real ≤ previsto", () => {
    // alta = 24h; concluído em 10h
    const r = avaliarSla(ch({ created_at: "2026-06-01T00:00:00Z", data_conclusao: "2026-06-01T10:00:00Z" }));
    expect(r.previsto).toBe(24);
    expect(r.real).toBeCloseTo(10);
    expect(r.cumprido).toBe(true);
  });
  it("estourado quando real > previsto", () => {
    // critica = 4h; concluído em 6h
    const r = avaliarSla(ch({ urgencia: "critica", created_at: "2026-06-01T00:00:00Z", data_conclusao: "2026-06-01T06:00:00Z" }));
    expect(r.cumprido).toBe(false);
  });
  it("cumprido null se não concluído", () => {
    expect(avaliarSla(ch({ data_conclusao: null })).cumprido).toBeNull();
  });
});

describe("resumoSlaMensal", () => {
  it("agrupa por mês de conclusão e calcula taxa", () => {
    const hoje = new Date(2026, 5, 30); // junho/2026
    const r = resumoSlaMensal([
      ch({ data_conclusao: "2026-06-02T10:00:00Z", created_at: "2026-06-02T00:00:00Z" }), // 10h ≤ 24 ok
      ch({ urgencia: "critica", data_conclusao: "2026-06-03T06:00:00Z", created_at: "2026-06-03T00:00:00Z" }), // 6h > 4 estoura
      ch({ status: "aberto", data_conclusao: null }), // ignorado
    ], 3, hoje);
    const jun = r.find((p) => p.mes === "2026-06")!;
    expect(jun.concluidos).toBe(2);
    expect(jun.no_prazo).toBe(1);
    expect(jun.taxa).toBeCloseTo(0.5);
  });
});

describe("taxaSlaGeral", () => {
  it("zero sem avaliáveis", () => {
    expect(taxaSlaGeral([ch({ data_conclusao: null })])).toBe(0);
  });
});
