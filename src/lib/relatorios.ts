// Domínio puro dos relatórios da Secretaria: monta as linhas exportáveis (CSV)
// e o nome do arquivo. A geração de CSV/PDF (I/O) fica fora deste módulo.

export interface ChamadoRelatorio {
  numero_protocolo: string;
  unidade_id: string;
  empresa_id: string | null;
  status: string;
  urgencia: string | null;
  created_at: string;
  data_conclusao: string | null;
}

export interface LinhaRelatorio {
  protocolo: string;
  unidade: string;
  empresa: string;
  status: string;
  urgencia: string;
  aberto_em: string;
  concluido_em: string;
}

// Resolve nomes de unidade/empresa e achata o chamado em uma linha de planilha.
export function linhasRelatorio(
  chamados: ChamadoRelatorio[],
  nomeUnidade: (id: string) => string,
  nomeEmpresa: (id: string | null) => string,
): LinhaRelatorio[] {
  return chamados.map((c) => ({
    protocolo: c.numero_protocolo,
    unidade: nomeUnidade(c.unidade_id),
    empresa: nomeEmpresa(c.empresa_id),
    status: c.status,
    urgencia: c.urgencia ?? "sem triagem",
    aberto_em: c.created_at,
    concluido_em: c.data_conclusao ?? "",
  }));
}

// Nome de arquivo com data (AAAA-MM-DD), sem extensão.
export function nomeArquivoRelatorio(prefixo: string, hoje = new Date()): string {
  const d = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  return `${prefixo}_${d}`;
}
