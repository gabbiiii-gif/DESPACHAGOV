import { describe, it, expect } from "vitest";
import { agregar, type ChamadoRel } from "./relatorioModelo";

function ch(p: Partial<ChamadoRel>): ChamadoRel {
  return {
    status: "aberto",
    urgencia: "media",
    created_at: "2026-06-01T00:00:00Z",
    data_atendimento: null,
    data_conclusao: null,
    unidade_id: "u1",
    descricao: "x",
    numero_protocolo: "2026-000001",
    ...p,
  };
}
const nome = (id: string) => ({ u1: "Escola A", u2: "Escola B" }[id] ?? id);

describe("agregar → porEscola (detalhamento por chamado)", () => {
  it("agrupa por escola com em andamento, concluídos e %", () => {
    const d = agregar([
      ch({ unidade_id: "u1", status: "concluido" }),
      ch({ unidade_id: "u1", status: "em_campo" }),
      ch({ unidade_id: "u2", status: "concluido" }),
    ], nome);
    const a = d.porEscola.find((e) => e.unidadeId === "u1")!;
    const b = d.porEscola.find((e) => e.unidadeId === "u2")!;
    expect(a.nome).toBe("Escola A");
    expect(a.concluidos).toBe(1);
    expect(a.emAndamento).toBe(1);
    expect(a.pct).toBe(50);
    expect(b.concluidos).toBe(1);
    expect(b.emAndamento).toBe(0);
    expect(b.pct).toBe(100);
  });

  it("ignora cancelados na contagem por escola", () => {
    const d = agregar([
      ch({ unidade_id: "u1", status: "cancelado" }),
      ch({ unidade_id: "u1", status: "aberto" }),
    ], nome);
    const a = d.porEscola.find((e) => e.unidadeId === "u1")!;
    expect(a.emAndamento).toBe(1);
    expect(a.concluidos).toBe(0);
    expect(a.pct).toBe(0);
  });
});
