import { describe, it, expect } from "vitest";
import { ESPECIALIDADES, filtrarEmpresasPorEspecialidade } from "./especialidades";

const emp = (nome: string, esp: string[]) => ({ razao_social: nome, especialidades: esp });

describe("ESPECIALIDADES", () => {
  it("tem os 4 termos que guiam a atribuição", () => {
    expect(ESPECIALIDADES).toEqual([
      "Manutenção predial",
      "Manutenção de refrigeração",
      "Manutenção de ar-condicionado",
      "Instalação de ar-condicionado",
    ]);
  });
});

describe("filtrarEmpresasPorEspecialidade", () => {
  const empresas = [
    emp("Alfa", ["Manutenção predial"]),
    emp("Beta", ["Manutenção de ar-condicionado", "Instalação de ar-condicionado"]),
    emp("Gama", []),
  ];

  it("retorna todas quando a especialidade está vazia", () => {
    expect(filtrarEmpresasPorEspecialidade(empresas, "").length).toBe(3);
  });

  it("filtra as empresas que atendem a especialidade", () => {
    const r = filtrarEmpresasPorEspecialidade(empresas, "Instalação de ar-condicionado");
    expect(r.map((e) => e.razao_social)).toEqual(["Beta"]);
  });

  it("vazio quando nenhuma atende", () => {
    expect(filtrarEmpresasPorEspecialidade(empresas, "Manutenção de refrigeração")).toEqual([]);
  });
});
