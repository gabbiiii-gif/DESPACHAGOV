import { describe, it, expect } from "vitest";
import { destinatariosDe, linkPara, emailEvento } from "./notificacoes";

describe("destinatariosDe", () => {
  it("mapeia cada evento para os papéis corretos", () => {
    expect(destinatariosDe("aberto")).toEqual(["admin_secretaria"]);
    expect(destinatariosDe("atribuido")).toEqual(["empresa"]);
    expect(destinatariosDe("tecnico_designado")).toEqual(["tecnico"]);
    expect(destinatariosDe("em_campo")).toEqual(["responsavel"]);
    expect(destinatariosDe("concluido")).toEqual(["responsavel", "admin_secretaria"]);
    expect(destinatariosDe("cancelado")).toEqual(["responsavel", "empresa"]);
  });

  it("retorna lista vazia para evento desconhecido (defensivo em runtime)", () => {
    expect(destinatariosDe("xpto")).toEqual([]);
  });
});

describe("linkPara", () => {
  it("aponta para a área do papel no domínio de produção", () => {
    expect(linkPara("responsavel")).toBe("https://www.despachagov.com/unidade");
    expect(linkPara("empresa")).toBe("https://www.despachagov.com/empresa");
    expect(linkPara("tecnico")).toBe("https://www.despachagov.com/empresa");
    expect(linkPara("admin_secretaria")).toBe("https://www.despachagov.com/secretaria/chamados");
  });
});

describe("emailEvento", () => {
  const ctx = { protocolo: "2026-000123", unidadeNome: "Escola Central", link: "https://x/y" };

  it("inclui protocolo e unidade no assunto/corpo de 'aberto'", () => {
    const { subject, html } = emailEvento("aberto", ctx);
    expect(subject).toContain("2026-000123");
    expect(html).toContain("Escola Central");
    expect(html).toContain(ctx.link);
    expect(html).toContain("#2456A6");
  });

  it("gera assunto não vazio para todos os eventos", () => {
    for (const ev of ["aberto", "atribuido", "tecnico_designado", "em_campo", "concluido", "cancelado"] as const) {
      expect(emailEvento(ev, ctx).subject.length).toBeGreaterThan(0);
    }
  });
});
