import { describe, it, expect } from "vitest";
import { hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("responsavel_unidade abre e assina chamado, não deleta", () => {
    expect(hasPermission("responsavel_unidade", "create", "chamado")).toBe(true);
    expect(hasPermission("responsavel_unidade", "sign", "chamado")).toBe(true);
    expect(hasPermission("responsavel_unidade", "delete", "chamado")).toBe(false);
  });
  it("tecnico_empresa executa mas não atribui", () => {
    expect(hasPermission("tecnico_empresa", "execute", "chamado")).toBe(true);
    expect(hasPermission("tecnico_empresa", "assign", "chamado")).toBe(false);
  });
  it("admin_secretaria gerencia usuários; gestor não cria", () => {
    expect(hasPermission("admin_secretaria", "create", "user")).toBe(true);
    expect(hasPermission("gestor_secretaria", "create", "user")).toBe(false);
  });
});
