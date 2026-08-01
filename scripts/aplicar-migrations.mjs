// ─── DespachaGov · Aplicador de migrations pendentes ─────────────────────────
// Aplica migrations em produção pela Management API, uma por vez, verificando
// antes e depois. Mesmo padrão de autenticação de scripts/apply-email-templates.mjs.
//
// POR QUE NÃO `supabase db push`
// Os arquivos aqui se chamam 0001_auth_multitenant.sql, sem prefixo de
// timestamp, mas o histórico remoto registra version=20260623233538 com
// name=0001_auth_multitenant. Os originais eram <timestamp>_0001_*.sql e
// perderam o prefixo ao entrar no repo. Como o CLI deriva a versão do prefixo
// numérico, ele leria as locais como 0001..0023, não acharia nenhuma no
// histórico remoto e tentaria aplicar TODAS — recriando tabelas que já existem,
// com dados de cidadãos dentro. Ver docs/DEPLOY.md.
//
// USO:
//   export SUPABASE_ACCESS_TOKEN=sbp_...      # Painel → Account → Access Tokens
//   node scripts/aplicar-migrations.mjs --dry-run    # mostra o que faria
//   node scripts/aplicar-migrations.mjs              # aplica de verdade
//
// Idempotente: consulta o histórico remoto antes e pula o que já foi aplicado.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.PROJECT_REF ?? "evdjijvxllhrlkkhrcdi";
const DRY = process.argv.includes("--dry-run");

// Ordem importa: 0021 cria a função de anonimização, 0022 a prova do
// consentimento, 0023 estreita a RPC pública. São independentes entre si, mas o
// histórico deve refletir a ordem em que foram escritas.
const PENDENTES = [
  { versao: "20260729000021", nome: "0021_exclusao_titular" },
  { versao: "20260729000022", nome: "0022_consentimento_prova" },
  { versao: "20260729000023", nome: "0023_tenants_publicos_minimo" },
];

const CHECAGENS = [
  ["0021 · função anonimizar_titular",
   "select count(*)::int as n from pg_proc where proname = 'anonimizar_titular'"],
  ["0021 · guarda auth.uid() no corpo",
   "select (prosrc like '%auth.uid()%')::int as n from pg_proc where proname = 'anonimizar_titular'"],
  ["0021 · coluna users.anonimizado_em",
   "select count(*)::int as n from information_schema.columns where table_name='users' and column_name='anonimizado_em'"],
  ["0021 · tabela exclusao_dados_log com RLS",
   "select count(*)::int as n from pg_tables where tablename='exclusao_dados_log' and rowsecurity"],
  ["0022 · coluna lgpd_consents.texto_hash",
   "select count(*)::int as n from information_schema.columns where table_name='lgpd_consents' and column_name='texto_hash'"],
  ["0023 · RPC devolve 1 coluna só",
   "select (pg_get_function_result(oid) = 'TABLE(subdomain text)')::int as n from pg_proc where proname='listar_tenants_publicos'"],
  ["RLS ativa em TODAS as tabelas públicas",
   "select (count(*) = 0)::int as n from pg_tables where schemaname='public' and not rowsecurity"],
];

async function sql(query) {
  const resp = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const texto = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${texto.slice(0, 600)}`);
  try { return JSON.parse(texto); } catch { return texto; }
}

async function main() {
  if (!TOKEN) {
    console.error("ERRO: defina SUPABASE_ACCESS_TOKEN (Painel → Account → Access Tokens).");
    return 1;
  }

  console.log(`Projeto: ${REF}${DRY ? "  (DRY RUN — nada será aplicado)" : ""}\n`);

  // ─── 1) Estado atual ───────────────────────────────────────────────────────
  const aplicadas = await sql(
    "select version, name from supabase_migrations.schema_migrations order by version",
  );
  const jaAplicadas = new Set(aplicadas.map((m) => m.name));
  console.log(`Histórico remoto: ${aplicadas.length} migrations.`);
  console.log(`Última: ${aplicadas.at(-1)?.name ?? "(nenhuma)"}\n`);

  // ─── 2) Aplicar o que falta ────────────────────────────────────────────────
  let aplicadasAgora = 0;

  for (const { versao, nome } of PENDENTES) {
    if (jaAplicadas.has(nome)) {
      console.log(`· ${nome} — já aplicada, pulando.`);
      continue;
    }

    const conteudo = await readFile(join(RAIZ, "supabase", "migrations", `${nome}.sql`), "utf8");

    if (DRY) {
      console.log(`· ${nome} — PENDENTE (${conteudo.length} bytes).`);
      continue;
    }

    process.stdout.write(`· ${nome} — aplicando… `);
    try {
      // A Management API já roda cada requisição numa transação: erro no meio
      // desfaz o arquivo inteiro em vez de deixar o schema pela metade.
      await sql(conteudo);
      await sql(
        `insert into supabase_migrations.schema_migrations (version, name)
         values ('${versao}', '${nome}')
         on conflict (version) do nothing`,
      );
      console.log("OK");
      aplicadasAgora++;
    } catch (e) {
      console.log("FALHOU");
      console.error(`\n  ${e.message}\n`);
      console.error("Parando aqui. Nada além desta migration foi aplicado.");
      return 1;
    }
  }

  if (DRY) {
    console.log("\nDry run concluído. Rode sem --dry-run para aplicar.");
    return 0;
  }

  // ─── 3) Verificação ────────────────────────────────────────────────────────
  console.log(`\n${aplicadasAgora} migration(s) aplicada(s). Verificando…\n`);

  let falhas = 0;
  for (const [rotulo, query] of CHECAGENS) {
    const r = await sql(query);
    const ok = Number(r?.[0]?.n) === 1;
    console.log(`${ok ? "✓" : "✗"} ${rotulo}`);
    if (!ok) falhas++;
  }

  console.log(
    falhas === 0
      ? "\nTudo certo. Próximo passo: publicar as Edge Functions (docs/DEPLOY.md)."
      : `\n${falhas} verificação(ões) falharam — investigue antes de publicar as functions.`,
  );
  return falhas === 0 ? 0 : 1;
}

// process.exit() derruba o processo com sockets do fetch ainda abertos, e no
// Windows isso vira "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
// com exit code 9 — mesmo quando tudo deu certo. Num script de deploy o código
// de saída é o que distingue sucesso de falha, então definimos process.exitCode
// e deixamos o Node encerrar naturalmente quando os handles fecharem.
main()
  .then((codigo) => { process.exitCode = codigo; })
  .catch((e) => {
    console.error(`\nERRO: ${e.message}`);
    process.exitCode = 1;
  });
