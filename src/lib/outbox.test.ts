import { describe, it, expect } from "vitest";
import { criarJobAbertura, rotuloPendentes, ehErroDeRede, type NovoChamadoOffline } from "./outbox";

const input: NovoChamadoOffline = {
  tenant_id: "t1",
  unidade_id: "u1",
  unidade_nome: "Escola Central",
  descricao: "Ar-condicionado parou",
  solicitante_id: "s1",
  solicitante_nome: "Maria",
};

describe("criarJobAbertura", () => {
  it("gera id/timestamp, copia o input e marca anexos como não enviados", () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const job = criarJobAbertura(input, [{ name: "of.png", type: "image/png", size: 1, blob }]);
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(job.chamado_id_criado).toBeNull();
    expect(typeof job.criado_em).toBe("number");
    expect(job.unidade_nome).toBe("Escola Central");
    expect(job.anexos).toHaveLength(1);
    expect(job.anexos[0]!.enviado).toBe(false);
    expect(job.anexos[0]!.name).toBe("of.png");
  });

  it("gera ids distintos por job", () => {
    expect(criarJobAbertura(input, []).id).not.toBe(criarJobAbertura(input, []).id);
  });
});

describe("rotuloPendentes", () => {
  it("vazio quando zero", () => expect(rotuloPendentes(0)).toBe(""));
  it("singular e plural", () => {
    expect(rotuloPendentes(1)).toBe("1 chamado aguardando envio");
    expect(rotuloPendentes(3)).toBe("3 chamados aguardando envio");
  });
});

describe("ehErroDeRede", () => {
  it("detecta erros de rede", () => {
    expect(ehErroDeRede("Failed to fetch")).toBe(true);
    expect(ehErroDeRede("TypeError: NetworkError when attempting to fetch resource")).toBe(true);
    expect(ehErroDeRede("Load failed")).toBe(true);
  });
  it("ignora nulo e erro de regra", () => {
    expect(ehErroDeRede(null)).toBe(false);
    expect(ehErroDeRede(undefined)).toBe(false);
    expect(ehErroDeRede("new row violates row-level security policy")).toBe(false);
  });
});
