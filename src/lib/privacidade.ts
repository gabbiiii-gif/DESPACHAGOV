// Domínio puro dos direitos do titular (LGPD art. 18). Sem rede: monta a
// exportação de dados pessoais (portabilidade) e os campos exibíveis.
import type { UserProfile } from "./auth";

export interface ConsentimentoResumo {
  versao_termo: string;
  aceito_em: string;
}

export interface ChamadoResumoExport {
  numero_protocolo: string;
  status: string;
  created_at: string;
}

export interface ExportacaoDados {
  gerado_em: string;
  titular: {
    nome: string;
    email: string;
    cpf: string | null;
    telefone: string | null;
    cargo: string | null;
    matricula: string | null;
    papel: string;
    criado_em: string;
  };
  consentimentos: ConsentimentoResumo[];
  chamados_abertos: ChamadoResumoExport[];
}

// Monta o pacote de portabilidade (LGPD) a partir do perfil + consentimentos +
// chamados abertos pelo titular.
export function montarExportacao(
  perfil: UserProfile,
  consentimentos: ConsentimentoResumo[],
  chamados: ChamadoResumoExport[],
  agora: Date = new Date(),
): ExportacaoDados {
  return {
    gerado_em: agora.toISOString(),
    titular: {
      nome: perfil.nome,
      email: perfil.email,
      cpf: perfil.cpf,
      telefone: perfil.telefone,
      cargo: perfil.cargo,
      matricula: perfil.matricula,
      papel: perfil.role,
      criado_em: perfil.created_at,
    },
    consentimentos,
    chamados_abertos: chamados,
  };
}

// Linhas rotuladas dos dados pessoais p/ exibição na tela "Meus dados".
export function camposPessoais(perfil: UserProfile): { rotulo: string; valor: string }[] {
  return [
    { rotulo: "Nome", valor: perfil.nome },
    { rotulo: "E-mail", valor: perfil.email },
    { rotulo: "CPF", valor: perfil.cpf ?? "—" },
    { rotulo: "Telefone", valor: perfil.telefone ?? "—" },
    { rotulo: "Cargo", valor: perfil.cargo ?? "—" },
    { rotulo: "Matrícula", valor: perfil.matricula ?? "—" },
    { rotulo: "Papel", valor: perfil.role },
  ];
}

export function nomeArquivoExport(agora: Date = new Date()): string {
  const d = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  return `meus-dados_${d}.json`;
}
