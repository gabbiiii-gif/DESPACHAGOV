// Captura de erros das Edge Functions → grava em error_log (service_role).
// O logging nunca pode quebrar a função (try/catch interno).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logErro(params: {
  fonte: string;
  mensagem: string;
  tenant_id?: string | null;
  nivel?: "error" | "warn" | "info";
  contexto?: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    await admin.from("error_log").insert({
      fonte: params.fonte,
      mensagem: (params.mensagem || "erro").slice(0, 2000),
      tenant_id: params.tenant_id ?? null,
      nivel: params.nivel ?? "error",
      contexto: params.contexto ?? {},
    });
  } catch {
    // ignora — logging best-effort
  }
}

// Envolve o handler: qualquer exceção não tratada vira um error_log + 500.
// Não captura erros de regra/4xx (esses são retornados normalmente pelo handler).
export function comCaptura(
  fonte: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (e) {
      await logErro({
        fonte,
        mensagem: e instanceof Error ? e.message : String(e),
        contexto: { metodo: req.method, url: req.url },
      });
      return new Response(JSON.stringify({ error: "erro interno" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  };
}
