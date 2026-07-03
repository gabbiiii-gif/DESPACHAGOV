import { supabase } from "./supabase";
import { deveReportar, type ErroRegistro, type AnaliseErros } from "@/lib/monitor";

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

// Captura erros globais do front e envia ao log-erro (throttle por mensagem).
export function instalarReporterErros(): void {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  const ultimos = new Map<string, number>();

  const reportar = (mensagem: string, contexto: Record<string, unknown>) => {
    const msg = (mensagem || "Erro desconhecido").slice(0, 2000);
    if (!deveReportar(msg, Date.now(), ultimos)) return;
    void supabase.functions.invoke("log-erro", {
      body: { fonte: "front", nivel: "error", mensagem: msg, contexto },
    }).catch(() => {});
  };

  window.addEventListener("error", (e) => {
    const d = detalhesErro(e.error ?? e.message);
    reportar(d.mensagem, {
      origem: "window.error", arquivo: e.filename, linha: e.lineno, coluna: e.colno,
      url: location.pathname, ...d.contexto,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const d = detalhesErro(e.reason);
    reportar(d.mensagem, { origem: "unhandledrejection", url: location.pathname, ...d.contexto });
  });
}
