// Fila offline (outbox) de abertura de chamados — I/O em IndexedDB + replay.
// A lógica pura (montar job, rótulos, classificar erro) vive em src/lib/outbox.ts.
import { abrirChamado } from "./chamados";
import { anexarArquivo } from "./execucao";
import type { ChamadoPendente } from "@/lib/outbox";

const DB = "despachagov-outbox";
const STORE = "aberturas";
export const OUTBOX_EVENTO = "outbox-mudou";

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB indisponível"));
  });
}

function executar<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrirDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

function notificar(): void {
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENTO));
}

export async function enfileirar(job: ChamadoPendente): Promise<void> {
  await executar("readwrite", (s) => s.put(job));
  notificar();
}

export async function listarPendentes(): Promise<ChamadoPendente[]> {
  const all = await executar<ChamadoPendente[]>("readonly", (s) => s.getAll() as IDBRequest<ChamadoPendente[]>);
  return all.sort((a, b) => a.criado_em - b.criado_em);
}

export async function contarPendentes(): Promise<number> {
  return executar<number>("readonly", (s) => s.count());
}

async function salvar(job: ChamadoPendente): Promise<void> {
  await executar("readwrite", (s) => s.put(job));
}

async function remover(id: string): Promise<void> {
  await executar("readwrite", (s) => s.delete(id));
  notificar();
}

let sincronizando = false;

// Replay best-effort e idempotente: cria o chamado uma vez (persistindo o id antes
// de subir anexos) e envia os anexos pendentes. Falha de rede no meio → para o lote
// mantendo o progresso. Só remove o job quando chamado + todos os anexos foram enviados.
export async function sincronizarPendentes(): Promise<{ enviados: number; restantes: number }> {
  if (sincronizando) return { enviados: 0, restantes: await contarPendentes() };
  sincronizando = true;
  let enviados = 0;
  try {
    const pendentes = await listarPendentes();
    for (const job of pendentes) {
      try {
        if (!job.chamado_id_criado) {
          const { error, chamado } = await abrirChamado({
            tenant_id: job.tenant_id,
            unidade_id: job.unidade_id,
            descricao: job.descricao,
            solicitante_id: job.solicitante_id,
            solicitante_nome: job.solicitante_nome,
          });
          if (error || !chamado) break; // provavelmente ainda offline → para o lote
          job.chamado_id_criado = chamado.id;
          await salvar(job);
        }
        const chamadoId = job.chamado_id_criado;
        for (const anexo of job.anexos) {
          if (anexo.enviado) continue;
          const file = new File([anexo.blob], anexo.name, { type: anexo.type });
          const up = await anexarArquivo({
            tenantId: job.tenant_id,
            chamadoId,
            atorId: job.solicitante_id,
            tipo: "oficio",
            file,
          });
          if (up.error) throw new Error(up.error);
          anexo.enviado = true;
          await salvar(job);
        }
        await remover(job.id);
        enviados++;
      } catch {
        break; // falha de rede no meio do lote → tenta de novo no próximo gatilho
      }
    }
  } finally {
    sincronizando = false;
    notificar();
  }
  return { enviados, restantes: await contarPendentes() };
}
