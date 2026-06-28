// Edge Function: ai-monitor
// Apenas superadmin. Lê os erros recentes (error_log), agrupa e pede ao Claude
// um resumo + riscos futuros + recomendações de prevenção.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  agruparErros,
  promptErros,
  PROMPT_MONITOR,
  ANALISE_SCHEMA,
  validarAnalise,
  type ErroRegistro,
} from "../../../src/lib/monitor.ts";
import { comCaptura, logErro } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MODELO = "claude-sonnet-4-6";

Deno.serve(comCaptura("ai-monitor", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  if ((u.user.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
    return json({ error: "apenas superadmin" }, 403);
  }

  const { data: rows } = await admin
    .from("error_log")
    .select("fonte, nivel, mensagem, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const erros = (rows ?? []) as ErroRegistro[];
  const grupos = agruparErros(erros);

  if (grupos.length === 0) {
    return json({ ok: true, total: 0, analise: { resumo: "Nenhum erro registrado.", riscos: [], recomendacoes: [] } });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "IA não configurada" }, 503);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: PROMPT_MONITOR,
      output_config: { format: { type: "json_schema", schema: ANALISE_SCHEMA } },
      messages: [{ role: "user", content: promptErros(grupos) }],
    }),
  });
  if (!resp.ok) {
    await logErro({ fonte: "ai-monitor", nivel: "warn", mensagem: `Anthropic HTTP ${resp.status}` });
    return json({ error: `IA HTTP ${resp.status}` }, 502);
  }

  const data = (await resp.json()) as { content?: Array<{ type: string; text?: string }> };
  const bloco = (data.content ?? []).find((b) => b.type === "text");
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(bloco?.text ?? "{}");
  } catch {
    parsed = null;
  }
  const analise = validarAnalise(parsed);
  if (!analise) return json({ error: "resposta da IA inválida" }, 502);

  return json({ ok: true, total: erros.length, analise });
}));
