// Edge Function: delete-tenant
// Apenas superadmin. Exclui uma secretaria (tenant) e tudo dela:
// - DELETE em public.tenants → cascade remove dados públicos (users, unidades,
//   empresas, chamados, anexos, notificacoes, ai_usage, etc.).
// - Remove os usuários correspondentes do Auth (não cascateiam de public.users).
// - Remove os arquivos do Storage (buckets contratos/chamado-anexos), que NÃO
//   são cobertos pelo cascade do Postgres.
//
// Ordem importa: os caminhos são coletados ANTES do delete, porque o cascade
// destrói chamado_anexos.storage_path e contratos.pdf_url — depois dele não há
// como saber o que apagar, e os arquivos ficariam órfãos no bucket para sempre
// (dado pessoal retido sem base legal após a exclusão do tenant).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { comCaptura } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Storage não tem "delete by prefix": é preciso enumerar. list() devolve no
// máximo `limit` itens por página e marca pastas com id === null, então a
// varredura é recursiva e paginada. Sem isso, tenant com mais de 100 anexos
// (default do list) teria só a primeira página apagada.
const PAGINA = 1000;

async function listarRecursivo(
  storage: ReturnType<typeof createClient>["storage"],
  bucket: string,
  prefixo: string,
): Promise<string[]> {
  const encontrados: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await storage.from(bucket).list(prefixo, { limit: PAGINA, offset });
    // Prefixo inexistente devolve lista vazia, não erro. Erro real aborta o ramo
    // sem derrubar a exclusão inteira — o caller reporta o que sobrou.
    if (error || !data || data.length === 0) break;

    for (const item of data) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (item.id === null) {
        encontrados.push(...(await listarRecursivo(storage, bucket, caminho)));
      } else {
        encontrados.push(caminho);
      }
    }

    if (data.length < PAGINA) break;
    offset += PAGINA;
  }

  return encontrados;
}

// remove() aceita no máximo 1000 chaves por chamada.
async function removerEmLotes(
  storage: ReturnType<typeof createClient>["storage"],
  bucket: string,
  caminhos: string[],
): Promise<number> {
  let removidos = 0;
  for (let i = 0; i < caminhos.length; i += PAGINA) {
    const lote = caminhos.slice(i, i + PAGINA);
    const { error } = await storage.from(bucket).remove(lote);
    if (!error) removidos += lote.length;
  }
  return removidos;
}

Deno.serve(comCaptura("delete-tenant", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Autorização: caller precisa ser superadmin.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u.user) return json({ error: "não autenticado" }, 401);
  if ((u.user.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
    return json({ error: "apenas superadmin" }, 403);
  }

  // 2) Corpo.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }
  const tenantId = String(body.tenant_id ?? "").trim();
  if (!tenantId) return json({ error: "tenant_id ausente" }, 400);

  // 3) IDs dos usuários do tenant (Auth) antes do cascade.
  const { data: usuarios } = await admin.from("users").select("id").eq("tenant_id", tenantId);
  const ids = (usuarios ?? []).map((r) => r.id as string);

  // 4) Caminhos no Storage — ANTES do delete, senão o cascade apaga a única
  // referência que temos aos arquivos. Ambos os buckets usam o tenant_id como
  // primeira pasta (contratos/{tenant}/{contrato}/… e
  // chamado-anexos/{tenant}/{chamado}/…), o que torna o prefixo a raiz da varredura.
  const anexos = await listarRecursivo(admin.storage, "chamado-anexos", tenantId);
  const contratos = await listarRecursivo(admin.storage, "contratos", tenantId);

  // 5) Deleta o tenant → cascade nos dados públicos.
  const { error: dErr } = await admin.from("tenants").delete().eq("id", tenantId);
  if (dErr) return json({ error: `tenant: ${dErr.message}` }, 400);

  // 6) Remove os usuários do Auth (best-effort, não cascateiam).
  let usuariosRemovidos = 0;
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) usuariosRemovidos++;
  }

  // 7) Remove os arquivos. Só depois do commit do delete: se o passo 5 falhar,
  // um tenant vivo não pode ficar sem os anexos dos seus chamados.
  const anexosRemovidos = await removerEmLotes(admin.storage, "chamado-anexos", anexos);
  const contratosRemovidos = await removerEmLotes(admin.storage, "contratos", contratos);

  return json({
    ok: true,
    usuarios_removidos: usuariosRemovidos,
    anexos_removidos: anexosRemovidos,
    contratos_removidos: contratosRemovidos,
    // Divergência entre encontrados e removidos = arquivo que resistiu à
    // exclusão. Sinaliza para o superadmin auditar o bucket manualmente em vez
    // de assumir que a limpeza foi completa.
    storage_pendente: (anexos.length - anexosRemovidos) + (contratos.length - contratosRemovidos),
  });
}));
