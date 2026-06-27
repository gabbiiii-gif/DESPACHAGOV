import { describe, it, expect } from "vitest";
import {
  contarPorStatus,
  contarPorUrgencia,
  taxaConclusao,
  tempoMedioConclusaoHoras,
  serieMensal,
  type ChamadoKpi,
} from "./kpis";

function ch(p: Partial<ChamadoKpi>): ChamadoKpi {
  return {
    status: "aberto",
    urgencia: null,
    created_at: "2026-06-01T00:00:00Z",
    data_atendimento: null,
    data_conclusao: null,
    ...p,
  };
}

describe("contarPorStatus", () => {
  it("conta e zera os ausentes", () => {
    const r = contarPorStatus([ch({ status: "aberto" }), ch({ status: "aberto" }), ch({ status: "concluido" })]);
    expect(r.aberto).toBe(2);
    expect(r.concluido).toBe(1);
    expect(r.cancelado).toBe(0);
  });
});

describe("contarPorUrgencia", () => {
  it("agrupa urgência e joga nula em sem_triagem", () => {
    const r = contarPorUrgencia([ch({ urgencia: "alta" }), ch({ urgencia: null }), ch({ urgencia: "alta" })]);
    expect(r.alta).toBe(2);
    expect(r.sem_triagem).toBe(1);
    expect(r.baixa).toBe(0);
  });
});

describe("taxaConclusao", () => {
  it("ignora cancelados na base", () => {
    const r = taxaConclusao([
      ch({ status: "concluido" }),
      ch({ status: "aberto" }),
      ch({ status: "cancelado" }),
    ]);
    expect(r).toBeCloseTo(0.5); // 1 concluído / 2 (exclui cancelado)
  });
  it("zero sem base", () => expect(taxaConclusao([])).toBe(0));
});

describe("tempoMedioConclusaoHoras", () => {
  it("média só dos concluídos com data", () => {
    const r = tempoMedioConclusaoHoras([
      ch({ created_at: "2026-06-01T00:00:00Z", data_conclusao: "2026-06-01T10:00:00Z" }),
      ch({ created_at: "2026-06-01T00:00:00Z", data_conclusao: "2026-06-01T20:00:00Z" }),
      ch({ data_conclusao: null }),
    ]);
    expect(r).toBeCloseTo(15);
  });
  it("null quando nenhum tem marco", () => expect(tempoMedioConclusaoHoras([ch({})])).toBeNull());
});

describe("serieMensal", () => {
  it("monta N meses e conta abertos/concluídos no mês de abertura", () => {
    const hoje = new Date(2026, 5, 15); // junho/2026
    const r = serieMensal(
      [
        ch({ created_at: "2026-06-02T00:00:00Z", status: "concluido" }),
        ch({ created_at: "2026-06-10T00:00:00Z", status: "aberto" }),
        ch({ created_at: "2026-05-20T00:00:00Z", status: "concluido" }),
      ],
      3,
      hoje,
    );
    expect(r).toHaveLength(3);
    expect(r[2]!.mes).toBe("2026-06");
    expect(r[2]!.total).toBe(2);
    expect(r[2]!.concluidos).toBe(1);
    expect(r[1]!.mes).toBe("2026-05");
    expect(r[1]!.total).toBe(1);
  });
});
