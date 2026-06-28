// Cria um fluxo de usuários de teste com SENHAS conhecidas, para testar o app
// ponta a ponta: Secretaria (admin) → Unidade (diretora) → Empresa (admin).
// Idempotente: remove o tenant de teste anterior antes de recriar.
//
// Uso (a service_role key vem do Dashboard → Project Settings → API):
//   SUPABASE_URL=https://evdjijvxllhrlkkhrcdi.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role> \
//   node scripts/seed-teste.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const SENHA = "Desp@chaTeste2026";
const SUB = "teste";

async function criarUsuario(tenantId, { email, nome, role, empresa_id = null, unidade_id = null }) {
  const app_metadata = { role, tenant_id: tenantId };
  if (empresa_id) app_metadata.empresa_id = empresa_id;
  const { data: au, error: aErr } = await db.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    app_metadata,
  });
  if (aErr) throw new Error(`auth ${email}: ${aErr.message}`);
  const { error: pErr } = await db.from("users").insert({
    id: au.user.id, tenant_id: tenantId, role, nome, email, empresa_id, unidade_id,
  });
  if (pErr) throw new Error(`perfil ${email}: ${pErr.message}`);
  // Pré-aceita o termo LGPD para o login de teste não travar no gate.
  await db.from("lgpd_consents").insert({ user_id: au.user.id, tenant_id: tenantId, versao_termo: "2026-06-v1" });
  return au.user.id;
}

async function main() {
  // 1) Limpa o tenant de teste anterior (cascade nos dados públicos + Auth).
  const { data: existente } = await db.from("tenants").select("id").eq("subdomain", SUB).maybeSingle();
  if (existente) {
    const { data: us } = await db.from("users").select("id").eq("tenant_id", existente.id);
    for (const u of us ?? []) await db.auth.admin.deleteUser(u.id).catch(() => {});
    await db.from("tenants").delete().eq("id", existente.id);
    console.log("Tenant de teste anterior removido.");
  }

  // 2) Tenant.
  const { data: tenant, error: tErr } = await db
    .from("tenants")
    .insert({ nome_secretaria: "Secretaria de Educação (Teste)", subdomain: SUB, municipio: "Altamira", estado: "PA" })
    .select()
    .single();
  if (tErr) throw new Error(`tenant: ${tErr.message}`);

  // 3) Admin da Secretaria.
  await criarUsuario(tenant.id, { email: "admin.teste@despachagov.com", nome: "Admin Teste", role: "admin_secretaria" });

  // 4) Unidade + Diretora (responsavel_unidade).
  const { data: unidade, error: uErr } = await db
    .from("unidades")
    .insert({ tenant_id: tenant.id, nome: "Escola Municipal Teste", bairro: "Centro", zona: "urbana" })
    .select()
    .single();
  if (uErr) throw new Error(`unidade: ${uErr.message}`);
  await criarUsuario(tenant.id, {
    email: "diretora.teste@despachagov.com", nome: "Diretora Teste", role: "responsavel_unidade", unidade_id: unidade.id,
  });

  // 5) Empresa + Admin da Empresa.
  const { data: empresa, error: eErr } = await db
    .from("empresas")
    .insert({ tenant_id: tenant.id, razao_social: "Manutenção Teste LTDA", email: "empresa.teste@despachagov.com", especialidades: ["eletrica", "hidraulica"] })
    .select()
    .single();
  if (eErr) throw new Error(`empresa: ${eErr.message}`);
  await criarUsuario(tenant.id, {
    email: "empresa.teste@despachagov.com", nome: "Empresa Teste Admin", role: "empresa_admin", empresa_id: empresa.id,
  });

  console.log(`\n✅ Fluxo de teste criado (senha de todos: ${SENHA}):`);
  console.table([
    { papel: "Admin Secretaria", email: "admin.teste@despachagov.com" },
    { papel: "Diretora (unidade)", email: "diretora.teste@despachagov.com" },
    { papel: "Admin Empresa", email: "empresa.teste@despachagov.com" },
  ]);
  console.log("\nSuperadmin: use sua conta biel.atm11@gmail.com.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
