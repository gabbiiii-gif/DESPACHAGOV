import { describe, it, expect } from "vitest";
import { redigirTexto, redigirValor } from "./lgpd";

describe("redigirTexto", () => {
  it("redige CPF em formato mascarado e cru", () => {
    expect(redigirTexto("solicitante cpf 123.456.789-00")).toBe("solicitante cpf [CPF]");
    expect(redigirTexto("cpf 12345678900 nao existe")).toBe("cpf [CPF] nao existe");
  });
  it("redige CNPJ", () => {
    expect(redigirTexto("empresa 12.345.678/0001-90 recebida")).toBe("empresa [CNPJ] recebida");
  });
  it("redige email", () => {
    expect(redigirTexto("erro em bielatm11@gmail.com hoje")).toBe("erro em [EMAIL] hoje");
    expect(redigirTexto("dir@edu.gov.br falhou")).toBe("[EMAIL] falhou");
  });
  it("redige CEP", () => {
    expect(redigirTexto("cep 68370-000 invalido")).toBe("cep [CEP] invalido");
  });
  it("redige telefone brasileiro em varios formatos", () => {
    expect(redigirTexto("liga (93) 99123-4567")).toBe("liga [TELEFONE]");
    // 11 digitos crus sao ambiguos com CPF; ambos sao PII → redacao ainda ocorre.
    const bruto = redigirTexto("celular 93991234567");
    expect(bruto === "celular [TELEFONE]" || bruto === "celular [CPF]").toBe(true);
  });
  it("nao mexe em texto sem PII", () => {
    expect(redigirTexto("nenhuma unidade encontrada")).toBe("nenhuma unidade encontrada");
  });
});

describe("redigirValor", () => {
  it("redige valores string em objetos aninhados", () => {
    const entrada = {
      msg: "email bielatm11@gmail.com",
      contexto: { details: "cpf 12345678900" },
    };
    expect(redigirValor(entrada)).toEqual({
      msg: "email [EMAIL]",
      contexto: { details: "cpf [CPF]" },
    });
  });
  it("substitui valor completo em chaves sensiveis, independente do formato", () => {
    expect(redigirValor({ descricao: "vazamento na sala 3" })).toEqual({
      descricao: "[REDACTED]",
    });
    expect(redigirValor({ senha: "abc123" })).toEqual({ senha: "[REDACTED]" });
    expect(redigirValor({ diretora_telefone: "sem formato aqui" })).toEqual({
      diretora_telefone: "[REDACTED]",
    });
  });
  it("preserva numeros e booleanos", () => {
    expect(redigirValor({ status: 401, ok: true })).toEqual({ status: 401, ok: true });
  });
  it("redige elementos de array", () => {
    expect(redigirValor(["ok", "cpf 12345678900", 42])).toEqual(["ok", "cpf [CPF]", 42]);
  });
});
