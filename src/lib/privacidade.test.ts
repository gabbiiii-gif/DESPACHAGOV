import { describe, it, expect } from "vitest";
import { montarExportacao, camposPessoais, nomeArquivoExport, type ConsentimentoResumo } from "./privacidade";
import type { UserProfile } from "./auth";

const perfil = {
  id: "u1",
  nome: "Maria Silva",
  email: "maria@x.gov.br",
  cpf: "123",
  telefone: "9999",
  cargo: "Diretora",
  matricula: "M-1",
  role: "responsavel_unidade",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ativo: true,
  tenant_id: "t1",
  empresa_id: null,
  unidade_id: "un1",
} as unknown as UserProfile;

const consentimentos: ConsentimentoResumo[] = [{ versao_termo: "2026-06-v1", aceito_em: "2026-06-02T00:00:00Z" }];

describe("montarExportacao", () => {
  it("inclui titular, consentimentos e chamados com timestamp", () => {
    const r = montarExportacao(perfil, consentimentos, [
      { numero_protocolo: "2026-000123", status: "aberto", created_at: "2026-06-03T00:00:00Z" },
    ], new Date("2026-06-27T12:00:00Z"));
    expect(r.gerado_em).toBe("2026-06-27T12:00:00.000Z");
    expect(r.titular.nome).toBe("Maria Silva");
    expect(r.titular.papel).toBe("responsavel_unidade");
    expect(r.consentimentos).toHaveLength(1);
    expect(r.chamados_abertos[0]!.numero_protocolo).toBe("2026-000123");
  });
});

describe("camposPessoais", () => {
  it("rotula os campos e troca nulos por travessão", () => {
    const semCpf = { ...perfil, cpf: null } as UserProfile;
    const linhas = camposPessoais(semCpf);
    expect(linhas.find((l) => l.rotulo === "Nome")?.valor).toBe("Maria Silva");
    expect(linhas.find((l) => l.rotulo === "CPF")?.valor).toBe("—");
  });
});

describe("nomeArquivoExport", () => {
  it("carimba a data", () => {
    expect(nomeArquivoExport(new Date(2026, 5, 7))).toBe("meus-dados_2026-06-07.json");
  });
});
