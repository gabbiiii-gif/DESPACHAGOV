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
    reportar(e.message, { origem: "window.error", arquivo: e.filename, linha: e.lineno, url: location.pathname });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    const msg = r instanceof Error ? r.message : String(r);
    reportar(msg, { origem: "unhandledrejection", url: location.pathname });
  });
}
