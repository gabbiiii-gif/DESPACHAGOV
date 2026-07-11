// Wrapper para supabase.functions.invoke que aplica timeout + retry com
// backoff exponencial. Motiva:
//   - Edge Functions Deno podem ter cold start (~2s) e ocasionalmente falhar
//     com HTTP 5xx ou aborto de conexão em horario de pico.
//   - Sem timeout, chamadas travam a UI silenciosamente.
//   - Sem retry, um único hiccup transitorio vira "Rejected" no monitor.
//
// NÃO faz retry em erros de regra (4xx exceto 408/429): esses sao decisao
// de negocio e re-tentar seria mascarar o problema real.

import { supabase } from "@/services/supabase";

const TIMEOUT_MS_PADRAO = 10_000;
const MAX_TENTATIVAS_PADRAO = 3; // 1 chamada + 2 retries
const BACKOFF_BASE_MS = 250;

export interface InvokeOpts {
  timeoutMs?: number;
  maxTentativas?: number;
  headers?: Record<string, string>;
}

export interface InvokeResultado<T> {
  data: T | null;
  error: Error | null;
}

// Erros considerados transitorios — vale a pena re-tentar.
function ehTransitorio(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; status?: number; message?: string };
  if (e.name === "AbortError") return true;
  if (e.status === 408 || e.status === 429) return true;
  if (typeof e.status === "number" && e.status >= 500) return true;
  // TypeError com mensagem "Failed to fetch" = falha de rede antes de resposta.
  if (e.name === "TypeError" || (e.message ?? "").toLowerCase().includes("fetch")) return true;
  return false;
}

// Sleep com jitter — evita "thundering herd" quando varios clientes tomam
// erro ao mesmo tempo (ex.: edge function cold start pra todos).
function aguarda(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 100);
  return new Promise((r) => setTimeout(r, ms + jitter));
}

export async function invokeSeguro<T>(
  nome: string,
  body: unknown,
  opts: InvokeOpts = {},
): Promise<InvokeResultado<T>> {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS_PADRAO;
  const maxTentativas = opts.maxTentativas ?? MAX_TENTATIVAS_PADRAO;
  let ultimoErro: Error | null = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const invokeOpts: Record<string, unknown> = { body };
      if (opts.headers) invokeOpts.headers = opts.headers;
      // supabase-js aceita `signal` no invoke desde a v2.42.
      (invokeOpts as { signal?: AbortSignal }).signal = ctrl.signal;
      const { data, error } = await supabase.functions.invoke<T>(nome, invokeOpts);
      clearTimeout(timer);
      if (!error) return { data: data as T | null, error: null };
      if (!ehTransitorio(error) || tentativa === maxTentativas) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
      ultimoErro = error instanceof Error ? error : new Error(String(error));
    } catch (e) {
      clearTimeout(timer);
      const err = e instanceof Error ? e : new Error(String(e));
      if (!ehTransitorio(err) || tentativa === maxTentativas) {
        return { data: null, error: err };
      }
      ultimoErro = err;
    }
    // Backoff exponencial: 250ms, 750ms, 2250ms...
    await aguarda(BACKOFF_BASE_MS * (3 ** (tentativa - 1)));
  }
  return { data: null, error: ultimoErro ?? new Error(`Falha em ${nome}`) };
}
