import { describe, it, expect } from "vitest";
import { resolverUnidadesAbertura } from "./unidadesAbertura";

type U = { id: string; nome: string; responsavel_user_id: string | null };

function u(id: string, dono: string | null): U {
  return { id, nome: `Escola ${id}`, responsavel_user_id: dono };
}

describe("resolverUnidadesAbertura", () => {
  it("trava na única escola quando o diretor tem 1 vínculo", () => {
    const todas = [u("a", "dir1"), u("b", "outro"), u("c", null)];
    const r = resolverUnidadesAbertura(todas, "dir1");
    expect(r.modo).toBe("travado");
    if (r.modo === "travado") expect(r.unidade.id).toBe("a");
  });

  it("dá select só com as escolas dele quando tem 2+", () => {
    const todas = [u("a", "dir1"), u("b", "outro"), u("c", "dir1"), u("d", null)];
    const r = resolverUnidadesAbertura(todas, "dir1");
    expect(r.modo).toBe("select");
    if (r.modo === "select") expect(r.unidades.map((x) => x.id)).toEqual(["a", "c"]);
  });

  it("cai no fallback com TODAS quando o diretor não tem vínculo", () => {
    const todas = [u("a", "outro"), u("b", null), u("c", "outro2")];
    const r = resolverUnidadesAbertura(todas, "semvinculo");
    expect(r.modo).toBe("fallback");
    if (r.modo === "fallback") expect(r.unidades.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("fallback também quando a lista está vazia", () => {
    const r = resolverUnidadesAbertura([], "dir1");
    expect(r.modo).toBe("fallback");
    if (r.modo === "fallback") expect(r.unidades).toEqual([]);
  });
});
