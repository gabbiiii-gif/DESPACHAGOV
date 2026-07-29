// Edge Function: delete-account
// Autosserviço do titular (LGPD art. 18, VI — eliminação). O chamador só pode
// excluir a PRÓPRIA conta: o alvo é sempre o `sub` do JWT, nunca um id vindo do
// corpo. Não existe caminho para um usuário excluir outro por aqui.
//
// O trabalho pesado vive em public.anonimizar_titular() (migration 0021), que
// roda tudo numa única transação. Fazer os 4 updates soltos daqui deixaria a
// janela de um deles falhar e a conta ficar meio anonimizada — nome limpo em
// users mas ainda visível em chamados.solicitante_nome, por exemplo.
//
// Depois da anonimização, a conta precisa parar de autenticar. Isso NÃO é
// automático: users.ativo não é consultado em nenhum ponto do login
// (nem em supabase/functions/login/index.ts, nem no useAuth). O ban no Auth é
// o único mecanismo que efetivamente barra o acesso — por isso ele é tratado
// como parte obrigatória da operação e a falha dele é reportada como erro.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura, logErro } from "../_shared/erros.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

// Confirmação explícita digitada pelo usuário. A operação é irreversível e não
// tem tela de "desfazer": exigir a frase evita disparo acidental e deixa claro
// no payload que houve intenção.
const CONFIRMACAO = "EXCLUIR MEUS DADOS";

// ~100 anos. O Auth não tem "banir para sempre"; esta é a forma idiomática.
const BAN_PERMANENTE = "876000h";

// Erros de regra levantados pela função SQL → status HTTP correspondente.
// Sem esse mapa tudo viraria 500 e o usuário veria "erro interno" quando na
// verdade a recusa foi deliberada (ex.: último admin da secretaria).
const STATUS_POR_ERRCODE: Record<string, number> = {
  no_data_found: 404,
  invalid_parameter_value: 409,
  insufficient_privilege: 403,
};

Deno.serve(comCaptura("delete-account", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Autenticação. O id do titular vem do token — nunca do corpo.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  const userId = u.user.id;

  // 2) Confirmação explícita.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }
  if (String(body.confirmacao ?? "").trim().toUpperCase() !== CONFIRMACAO) {
    return json({ error: `confirme digitando "${CONFIRMACAO}"` }, 400);
  }

  // 3) Anonimização atômica.
  const { data: resultado, error: rpcErr } = await admin.rpc("anonimizar_titular", {
    p_user_id: userId,
  });
  if (rpcErr) {
    const status = STATUS_POR_ERRCODE[rpcErr.code ?? ""] ?? 500;
    // 5xx aqui é falha real de infra — vale error_log. 4xx é regra de negócio.
    if (status >= 500) {
      await logErro({
        fonte: "delete-account",
        mensagem: `anonimizar_titular falhou: ${rpcErr.message}`,
        contexto: { code: rpcErr.code ?? null },
      });
    }
    return json({ error: rpcErr.message }, status);
  }

  // 4) Corta o acesso: e-mail vira placeholder (o real não pode continuar no
  // Auth) e a conta é banida. Sessões e refresh tokens são revogados em
  // seguida para que um token ainda válido não sobreviva ao ban.
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email: `anonimizado+${userId}@removido.invalid`,
    ban_duration: BAN_PERMANENTE,
    app_metadata: { role: null, tenant_id: null, empresa_id: null },
  });

  if (authErr) {
    // Estado parcial: dados já anonimizados, mas a conta ainda autentica.
    // Precisa de intervenção — não pode passar por sucesso silencioso.
    await logErro({
      fonte: "delete-account",
      mensagem: `dados anonimizados mas Auth não foi bloqueado: ${authErr.message}`,
      nivel: "error",
      contexto: { user_id: userId },
    });
    return json({
      error: "Seus dados foram anonimizados, mas o bloqueio do acesso falhou. "
        + "Nossa equipe foi notificada e concluirá em instantes.",
      anonimizado: true,
      acesso_bloqueado: false,
    }, 500);
  }

  await admin.auth.admin.signOut(token, "global").catch(() => {
    // Best-effort: o ban já barra novas autenticações.
  });

  return json({ ok: true, anonimizado: true, acesso_bloqueado: true, detalhes: resultado });
}));
