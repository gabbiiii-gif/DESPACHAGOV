import { describe, it, expect } from "vitest";
import {
  TERMO_SECOES, TERMO_VERSAO, textoCanonicoTermo, hashTermo, type SecaoTermo,
} from "./termo";

describe("TERMO_SECOES", () => {
  it("tem versão no formato AAAA-MM-vN", () => {
    expect(TERMO_VERSAO).toMatch(/^\d{4}-\d{2}-v\d+$/);
  });

  it("não tem seção vazia — seção sem texto no documento aceito é falha probatória", () => {
    expect(TERMO_SECOES.length).toBeGreaterThan(0);
    for (const s of TERMO_SECOES) {
      expect(s.titulo.trim()).not.toBe("");
      expect(s.paragrafos.length).toBeGreaterThan(0);
      for (const p of s.paragrafos) expect(p.trim()).not.toBe("");
    }
  });
});

describe("textoCanonicoTermo", () => {
  const amostra: SecaoTermo[] = [
    { titulo: "1. Um", paragrafos: ["alfa", "beta"] },
    { titulo: "2. Dois", paragrafos: ["gama"] },
  ];

  it("serializa título e parágrafos de forma estável", () => {
    expect(textoCanonicoTermo(amostra)).toBe("1. Um\nalfa\nbeta\n\n2. Dois\ngama");
  });

  it("é determinística — mesma entrada, mesma saída", () => {
    expect(textoCanonicoTermo(amostra)).toBe(textoCanonicoTermo(amostra));
  });

  it("muda quando o conteúdo muda", () => {
    const editado: SecaoTermo[] = [
      { titulo: "1. Um", paragrafos: ["alfa", "beta!"] },
      { titulo: "2. Dois", paragrafos: ["gama"] },
    ];
    expect(textoCanonicoTermo(editado)).not.toBe(textoCanonicoTermo(amostra));
  });
});

describe("hashTermo", () => {
  it("produz SHA-256 em hex de 64 caracteres", async () => {
    const h = await hashTermo("abc");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("bate com o vetor conhecido de SHA-256('abc')", async () => {
    // Referência independente: confirma que é SHA-256 de verdade e que a
    // conversão para hex não inverte bytes nem perde o zero à esquerda.
    expect(await hashTermo("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("detecta alteração de um único caractere", async () => {
    const a = await hashTermo(textoCanonicoTermo());
    const b = await hashTermo(`${textoCanonicoTermo()} `);
    expect(a).not.toBe(b);
  });
});
