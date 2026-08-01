// Edge Function: health
// Sonda de disponibilidade para monitor externo de uptime.
//
// POR QUE PRECISA SER EXTERNA
// A observabilidade do DespachaGov hoje é a tabela error_log, que vive no mesmo
// Postgres que ela monitora. Quando o banco cai, perde-se o incidente E o
// registro dele ao mesmo tempo, e a descoberta da falha depende de o superadmin
// abrir a tela de Saúde por acaso. Um monitor de fora sondando este endpoint
// detecta a queda sem depender de nada que possa ter caído junto.
//
// POR QUE É PÚBLICA (verify_jwt = false em supabase/config.toml)
// Monitores de uptime não carregam credencial. A resposta é deliberadamente
// pobre: booleanos e latência, nenhum dado de negócio, nenhuma contagem, nenhuma
// mensagem de erro do Postgres — mensagem de erro crua é superfície de
// reconhecimento (revela versão, nome de tabela, estrutura). Quem sonda aprende
// apenas "está de pé" ou "não está".
//
// Mantida barata de propósito: será chamada de minuto em minuto, para sempre.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Uma dependência lenta é um incidente em formação. Sem teto, a sonda ficaria
// pendurada junto com o banco e o monitor acusaria timeout genérico em vez de
// apontar qual peça travou.
const TIMEOUT_MS = 5_000;

async function comTeto<T>(rotulo: string, p: Promise<T>): Promise<{ ok: boolean; ms: number }> {
  const inicio = Date.now();
  try {
    await Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${rotulo}`)), TIMEOUT_MS)),
    ]);
    return { ok: true, ms: Date.now() - inicio };
  } catch {
    return { ok: false, ms: Date.now() - inicio };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Secret ausente é falha de configuração, não de dependência — e é um modo de
  // falha real: um redeploy sem os secrets deixa TODAS as funções quebradas.
  if (!url || !service) {
    return new Response(JSON.stringify({ status: "erro", motivo: "configuracao" }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // head: true não traz linhas — confirma PostgREST + Postgres com o menor
  // custo possível. tenants é pequena e sempre existe.
  const banco = await comTeto(
    "postgres",
    admin.from("tenants").select("id", { head: true, count: undefined }).limit(1)
      .then(({ error }) => { if (error) throw new Error(error.message); }),
  );

  // Metadados do bucket: valida a API de Storage sem baixar objeto.
  const storage = await comTeto(
    "storage",
    admin.storage.getBucket("chamado-anexos")
      .then(({ error }) => { if (error) throw new Error(error.message); }),
  );

  const saudavel = banco.ok && storage.ok;

  return new Response(
    JSON.stringify({
      status: saudavel ? "ok" : "degradado",
      verificado_em: new Date().toISOString(),
      checagens: { banco, storage },
    }),
    {
      // 503 é o que faz o monitor externo alertar. 200 com corpo "degradado"
      // passaria despercebido por qualquer serviço de uptime.
      status: saudavel ? 200 : 503,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
});
