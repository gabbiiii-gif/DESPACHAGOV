import { supabase } from "./supabase";
import { deveReportar, type ErroRegistro, type AnaliseErros } from "@/lib/monitor";
import { redigirTexto, redigirValor } from "@/lib/lgpd";

// Erros recentes (RLS: só superadmin lê).
export async function listarErros(limite = 500): Promise<ErroRegistro[]> {
  const { data, error } = await supabase
    .from("error_log")
    .select("fonte, nivel, mensagem, created_at")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []) as ErroRegistro[];
}

// Pede a análise da IA (Edge Function ai-monitor, superadmin).
export async function analisarErros(): Promise<{ total: number; analise: AnaliseErros | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; total: number; analise: AnaliseErros; error?: string }>(
    "ai-monitor",
    { body: {} },
  );
  if (error) return { total: 0, analise: null, error: error.message };
  if (!data?.ok) return { total: 0, analise: null, error: data?.error ?? "Falha na análise" };
  return { total: data.total, analise: data.analise, error: null };
}

let instalado = false;
// ID de sessão do navegador — correlaciona múltiplos eventos do mesmo usuário
// numa mesma aba. Persiste no sessionStorage p/ sobreviver a refresh.
function idSessao(): string {
  try {
    const chave = "despachagov-sessao-id";
    const existente = sessionStorage.getItem(chave);
    if (existente) return existente;
    const novo = (crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    sessionStorage.setItem(chave, novo);
    return novo;
  } catch {
    return `s-${Date.now()}`;
  }
}
// Cache do user_id — populado via onAuthStateChange p/ evitar chamada async
// dentro do handler de erro (que pode ele mesmo falhar).
let usuarioIdCache: string | null = null;

// Extrai mensagem REAL + contexto (stack, code/status/hint do PostgREST/supabase-js)
// de qualquer motivo de erro. Evita o "Rejected" genérico sem origem.
function detalhesErro(r: unknown): { mensagem: string; contexto: Record<string, unknown> } {
  if (r instanceof Error) {
    return { mensagem: r.message || r.name || "Erro", contexto: { stack: r.stack?.slice(0, 3000) } };
  }
  if (r && typeof r === "object") {
    const o = r as Record<string, unknown>;
    // supabase-js / PostgREST: { message, code, details, hint, status/statusCode }
    const msg = typeof o.message === "string" && o.message ? o.message : JSON.stringify(o).slice(0, 500);
    return {
      mensagem: msg,
      contexto: {
        code: o.code ?? null,
        status: o.status ?? o.statusCode ?? null,
        details: o.details ?? null,
        hint: o.hint ?? null,
      },
    };
  }
  return { mensagem: r == null ? "Rejeição sem motivo" : String(r), contexto: {} };
}

// Contexto padrão anexado a todo report — dá pistas suficientes p/ triagem
// sem depender do log agregado do Vercel. `pathname` isolado facilita filtro
// por tela; `href` completo (com query) reproduz o link exato do erro.
function contextoBase(): Record<string, unknown> {
  return {
    sessao_id: idSessao(),
    usuario_id: usuarioIdCache,
    pathname: location.pathname,
    href: location.href,
    user_agent: (navigator.userAgent || "").slice(0, 200),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    ts_cliente: new Date().toISOString(),
  };
}

// Captura erros globais do front e envia ao log-erro (throttle por mensagem).
export function instalarReporterErros(): void {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  const ultimos = new Map<string, number>();

  // Mantém o cache de usuario_id em sincronia com a sessão do Supabase.
  void supabase.auth.getUser().then(({ data }) => { usuarioIdCache = data.user?.id ?? null; }).catch(() => {});
  supabase.auth.onAuthStateChange((_evt, session) => { usuarioIdCache = session?.user?.id ?? null; });

  const reportar = (mensagem: string, contexto: Record<string, unknown>) => {
    // Redige CPF/CNPJ/email/telefone/CEP na mensagem e em qualquer valor
    // do contexto ANTES de enviar (payloads de PostgREST costumam trazer
    // PII em details/hint — sem esta passagem violaria LGPD).
    const msg = redigirTexto((mensagem || "Erro desconhecido").slice(0, 2000));
    if (!deveReportar(msg, Date.now(), ultimos)) return;
    const contextoLimpo = redigirValor({ ...contextoBase(), ...contexto }) as Record<string, unknown>;
    void supabase.functions.invoke("log-erro", {
      body: { fonte: "front", nivel: "error", mensagem: msg, contexto: contextoLimpo },
    }).catch(() => {});
  };

  window.addEventListener("error", (e) => {
    const d = detalhesErro(e.error ?? e.message);
    reportar(d.mensagem, {
      origem: "window.error", arquivo: e.filename, linha: e.lineno, coluna: e.colno,
      ...d.contexto,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const d = detalhesErro(e.reason);
    reportar(d.mensagem, { origem: "unhandledrejection", ...d.contexto });
  });
}
