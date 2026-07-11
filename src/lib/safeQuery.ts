// Wrapper canonico para chamadas ao Supabase — resolve tres problemas:
//   1. `.then` sem `.catch` gerando 'Rejected' cru no unhandledrejection.
//   2. Erro do PostgREST perdendo code/status/details/hint quando embrulhado
//      em `new Error(msg)` (a maioria dos services faz isso hoje).
//   3. Trate `data == null` como erro tipado em vez de propagar undefined.
//
// Uso:
//   const chamados = await safeQuery(supabase.from("chamados").select("*"), "listar chamados");
//
// A SupabaseError expõe code/status para decisão do chamador (401 → logout,
// 23505 → dedup, 42501 → sem permissao, etc.) sem depender de string-match.

export interface FalhaSupabase {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
  statusCode?: number | null;
}

export class SupabaseError extends Error {
  readonly code: string | null;
  readonly status: number | null;
  readonly details: string | null;
  readonly hint: string | null;
  readonly contexto: string | null;
  constructor(fonte: FalhaSupabase, contexto?: string) {
    super(contexto ? `${contexto}: ${fonte.message}` : fonte.message);
    this.name = "SupabaseError";
    this.code = fonte.code ?? null;
    this.status = fonte.status ?? fonte.statusCode ?? null;
    this.details = fonte.details ?? null;
    this.hint = fonte.hint ?? null;
    this.contexto = contexto ?? null;
  }
}

export async function safeQuery<T>(
  builder: PromiseLike<{ data: T | null; error: FalhaSupabase | null }>,
  contexto?: string,
): Promise<T> {
  const { data, error } = await builder;
  if (error) throw new SupabaseError(error, contexto);
  if (data == null) throw new SupabaseError({ message: "resposta vazia" }, contexto);
  return data;
}

// Variante que preserva `null` quando é resposta legitima (ex.: maybeSingle).
export async function safeQueryMaybe<T>(
  builder: PromiseLike<{ data: T | null; error: FalhaSupabase | null }>,
  contexto?: string,
): Promise<T | null> {
  const { data, error } = await builder;
  if (error) throw new SupabaseError(error, contexto);
  return data;
}
