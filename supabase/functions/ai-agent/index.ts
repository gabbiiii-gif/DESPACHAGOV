// Edge Function: ai-agent
// Triagem por IA de um chamado: sugere urgência + categoria a partir da descrição,
// grava em chamados.ai_urgencia_sugerida / ai_categoria e retorna a sugestão.
// Autorização: secretaria do tenant (verify_jwt=true). Rate limit 500/tenant/mês.
//
// Usa a Messages API da Anthropic via HTTP direto (mesmo padrão de _shared/email.ts
// com o Resend) — evita atrito de tipos do SDK npm no runtime Deno. Modelo Sonnet
// (decisão do owner no HANDOFF): classificação simples e de alto volume.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PROMPT_SISTEMA,
  promptUsuario,
  SUGESTAO_SCHEMA,
  validarSugestao,
} from "../../../src/lib/aiTriagem.ts";
import { comCaptura, logErro } from "../_shared/erros.ts";

const LIMITE_MENSAL = 500;
const MODELO = "claude-sonnet-4-6";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(comCaptura("ai-agent", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Identifica o usuário e o papel a partir do JWT (RLS).
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser();
  const user = u.user;
  if (!user) return json({ error: "não autenticado" }, 401);
  const meta = user.app_metadata as { role?: string; tenant_id?: string };
  if (meta.role !== "admin_secretaria" && meta.role !== "gestor_secretaria") {
    return json({ error: "sem permissão" }, 403);
  }
  const tenantId = meta.tenant_id;
  if (!tenantId) return json({ error: "sem tenant" }, 400);

  let body: { chamado_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const chamadoId = body.chamado_id;
  if (!chamadoId) return json({ error: "chamado_id ausente" }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Carrega o chamado e confere o tenant.
  const { data: chamado } = await admin
    .from("chamados")
    .select("id, descricao, tenant_id")
    .eq("id", chamadoId)
    .maybeSingle();
  if (!chamado || chamado.tenant_id !== tenantId) {
    return json({ error: "chamado não encontrado" }, 404);
  }

  // Rate limit atômico (500/tenant/mês).
  const { data: dentroLimite } = await admin.rpc("ai_consumir_credito", {
    p_tenant: tenantId,
    p_limite: LIMITE_MENSAL,
  });
  if (dentroLimite !== true) return json({ error: "limite mensal de IA atingido" }, 429);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "IA não configurada" }, 503);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 256,
      thinking: { type: "disabled" },
      system: PROMPT_SISTEMA,
      output_config: { format: { type: "json_schema", schema: SUGESTAO_SCHEMA } },
      messages: [{ role: "user", content: promptUsuario(chamado.descricao as string) }],
    }),
  });
  if (!resp.ok) {
    await logErro({ fonte: "ai-agent", nivel: "warn", tenant_id: tenantId, mensagem: `Anthropic HTTP ${resp.status}`, contexto: { chamadoId } });
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
  const sugestao = validarSugestao(parsed);
  if (!sugestao) return json({ error: "resposta da IA inválida" }, 502);

  await admin
    .from("chamados")
    .update({ ai_urgencia_sugerida: sugestao.urgencia, ai_categoria: sugestao.categoria })
    .eq("id", chamadoId);

  return json({ ok: true, sugestao }, 200);
}));
