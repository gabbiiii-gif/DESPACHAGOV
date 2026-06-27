// Domínio puro da fila offline ("outbox") de abertura de chamados.
// Sem IndexedDB/rede: só monta o registro e decide rótulos/estratégia.
// O I/O (persistência + replay) fica em src/services/outbox.ts.

export interface AnexoPendente {
  name: string;
  type: string;
  size: number;
  blob: Blob;
  enviado: boolean;
}

export interface ChamadoPendente {
  id: string; // uuid local — idempotência do replay
  tenant_id: string;
  unidade_id: string;
  unidade_nome: string; // exibe o card offline sem depender de lookup
  descricao: string;
  solicitante_id: string;
  solicitante_nome: string;
  anexos: AnexoPendente[];
  chamado_id_criado: string | null; // setado após criar no server (não duplica)
  criado_em: number; // epoch ms
}

export interface NovoChamadoOffline {
  tenant_id: string;
  unidade_id: string;
  unidade_nome: string;
  descricao: string;
  solicitante_id: string;
  solicitante_nome: string;
}

export interface ArquivoBlob {
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

// Monta o job a partir do form + arquivos. id/timestamp gerados aqui.
export function criarJobAbertura(input: NovoChamadoOffline, arquivos: ArquivoBlob[]): ChamadoPendente {
  return {
    id: crypto.randomUUID(),
    tenant_id: input.tenant_id,
    unidade_id: input.unidade_id,
    unidade_nome: input.unidade_nome,
    descricao: input.descricao,
    solicitante_id: input.solicitante_id,
    solicitante_nome: input.solicitante_nome,
    anexos: arquivos.map((a) => ({ name: a.name, type: a.type, size: a.size, blob: a.blob, enviado: false })),
    chamado_id_criado: null,
    criado_em: Date.now(),
  };
}

// Rótulo do banner de pendências.
export function rotuloPendentes(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 chamado aguardando envio" : `${n} chamados aguardando envio`;
}

// Erro de rede (offline/fetch) → vale enfileirar p/ retry. Erro de regra/validação
// (RLS, constraint, 4xx de domínio) → mostra ao usuário, não enfileira.
export function ehErroDeRede(msg: string | null | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network error") ||
    m.includes("load failed") ||
    m.includes("fetch")
  );
}
