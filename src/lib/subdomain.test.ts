import { describe, it, expect } from "vitest";
import { resolverSubdomain } from "./subdomain";

describe("resolverSubdomain", () => {
  it("extrai slug de subdomínio em produção", () => {
    expect(resolverSubdomain("semed-altamira.despachagov.com.br", "")).toBe("semed-altamira");
  });
  it("retorna null no domínio base e em reservados", () => {
    expect(resolverSubdomain("despachagov.com.br", "")).toBeNull();
    expect(resolverSubdomain("www.despachagov.com.br", "")).toBeNull();
  });
  it("retorna null em localhost sem override", () => {
    expect(resolverSubdomain("localhost", "")).toBeNull();
  });
  it("aceita override ?tenant em dev", () => {
    expect(resolverSubdomain("localhost", "?tenant=semed-altamira")).toBe("semed-altamira");
  });
});
