# DespachaGov — Handoff (retomar em outra máquina)

> Atualizado: 2026-06-27. Este doc viaja no git (a memória local do Claude não).
> Ao abrir sessão nova, peça ao agente para **ler `docs/HANDOFF.md` + `docs/sprints/`**.

## Estado atual
Sprints **0–4 concluídos e no ar** + **Sprint 5 peça 1 (e-mail transacional) e 3 ajustes de fluxo** em **https://www.despachagov.com**.
Ciclo ponta-a-ponta funcionando: Secretaria cadastra → Unidade abre chamado (sem urgência, anexo obrigatório) → Secretaria tria (urgência + empresa) → Empresa designa técnico → Técnico executa (foto antes/depois + assinatura) → comprovante PDF → some do mapa ao vivo. Multi-tenant + RLS + Realtime + e-mail por evento (Resend) ok.

Verde local: `npm run build` ✓, `eslint .` ✓, `vitest run` 39 passed (8 files).

Pós-sprint-4 já no ar (ver `docs/sprints/sprint-5.md`): e-mail transacional por evento (`notify-event`), abertura sem urgência + anexo obrigatório + triagem, empresa cadastra próprios técnicos, superadmin gere cadastros dentro de um tenant, **PWA offline na abertura** (outbox IndexedDB + sync ao reconectar).

Sprints 5–7 **no ar** (deploy 2026-06-27): Sprint 7 = agente de triagem IA (`ai-agent`, Claude Sonnet, rate-limit 500/tenant/mês, migrations 0012/0013) + exclusão de Secretaria pelo superadmin (`delete-tenant`). ⚠️ **`ANTHROPIC_API_KEY` não está nos secrets** → `ai-agent` retorna 503 até `supabase secrets set ANTHROPIC_API_KEY=…`. Push nativo excluído pelo owner.

## Stack / decisões travadas
- React 19 + Vite 6 + TS estrito + Tailwind v4 (CSS-first, `@theme`) + PWA. Supabase (Postgres+Auth+Realtime+Storage+Edge Functions). Leaflet, Recharts (sprint 6), qrcode, papaparse, html2pdf.js.
- Paleta **azul #2456A6 / laranja #F97316** (mockups `.dc.html` usam oliva/terracota — IGNORAR, só layout). Fontes Public Sans + Plus Jakarta Sans.
- Urgência: `baixa/media/alta/critica`. Status chamado: `aberto→atribuido→em_campo→concluido` + `cancelado`.

## Infra
- **Supabase**: projeto `evdjijvxllhrlkkhrcdi` (sa-east-1). Migrations até `0013`. Edge Functions `create-tenant`, `invite-user` (v5), `notify-event` (`verify_jwt=false`), `ai-agent` (verify_jwt=true; precisa `ANTHROPIC_API_KEY`), `delete-tenant` (verify_jwt=true, superadmin). Database Webhook em `chamado_eventos` (INSERT) → `notify-event`. Buckets privados `contratos`, `chamado-anexos`.
- **Vercel**: projeto `despachagov`, deploy `vercel deploy --prod --yes`. Domínio www.despachagov.com (apex 308→www).
- **Resend**: domínio `despachagov.com` verificado; Custom SMTP do Supabase Auth aponta pro Resend; templates na paleta azul/laranja (`scripts/apply-email-templates.mjs`).
- **GitHub**: `gabbiiii-gif/DESPACHAGOV` (privado).

## Setup em máquina nova
```bash
git clone https://github.com/gabbiiii-gif/DESPACHAGOV.git
cd DESPACHAGOV
npm install
# criar .env.local (valores PÚBLICOS — ok versionar aqui no doc):
#   VITE_SUPABASE_URL=https://evdjijvxllhrlkkhrcdi.supabase.co
#   VITE_SUPABASE_ANON_KEY=sb_publishable_mpbkIBklto1Iw7j0OyFWdw_KX_Rq8eY
npm run dev
```
- Para deploy: `vercel login` (conta bielatm11) + `vercel link --project despachagov`.
- Para Edge Functions/secrets/config: `supabase login` (ou `SUPABASE_ACCESS_TOKEN`). Secrets server-side (Resend/Anthropic) já estão no Supabase — não precisam estar locais p/ rodar o front.

## Segredos — NÃO versionar / rotacionar
`.env.local` e `supabase/.env` são git-ignored. Os segredos abaixo foram expostos em chat e devem ser rotacionados: access token Supabase (`sbp_…`), Anthropic key, Resend key, e a senha do superadmin. service_role NÃO é necessário localmente (Edge Functions recebem injetado).

## Modelo de auth (importante)
Claims em `auth.users.app_metadata` = `{ role, tenant_id, empresa_id }`, setadas só por Edge Function (service_role). RLS lê via `current_tenant_id()`, `current_app_role()`, `current_empresa_id()`, `is_superadmin()`. Criar usuário = sempre via Edge Function.

Superadmin: `biel.atm11@gmail.com`. 4 tenants de teste (semed/sesma/semma/semaf-altamira). Admins antigos com link de e-mail pré-fix caem logados em "/"; usar "Esqueci senha" p/ definir senha.

## Próximos sprints (ordem)
- **5** ✓ concluído: e-mail transacional por evento + PWA offline na abertura. Push nativo (Capacitor/FCM) excluído pelo owner.
- **6** ✓ concluído (local): painel Secretaria — KPIs + Recharts + relatórios PDF/CSV em `/secretaria/painel`.
- **7** código pronto (local; falta deploy): Agente IA (`ai-agent`, Claude Sonnet, on-demand na triagem) + exclusão de Secretaria (`delete-tenant`). Migration 0012 (rate-limit) + deploy das functions pendentes.
- **8** ✓ (local): SLA (`src/lib/sla.ts`) + painel "Meu Contrato" da empresa (`/empresa/contrato`, KPIs + gráfico + CSV). `sla_log` persistido ficou como melhoria futura (hoje calcula on-the-fly de `chamados`).
- **9** ✓ (local): tela "Meus dados" (`/conta/privacidade`, export JSON portabilidade) + Política pública (`/politica-privacidade`) + headers de segurança no `vercel.json` (HSTS/nosniff/frame-deny/referrer/permissions). Exclusão = mediada pelo admin (futuro: self-service); CSP estrita = futuro.
- **10** Beta SEMED Altamira.

## Gotchas
- TS `exactOptionalPropertyTypes`: campos opcionais em Insert/props precisam de `| undefined` explícito.
- eslint react-hooks v7 `set-state-in-effect`: usar IIFE async com guard `ativo`, setState só após `await`.
- Path do projeto tem espaços/acentos/OneDrive — usar caminhos absolutos.

## Geocoding (lat/lng no cadastro de unidade)
O botão "Buscar coordenadas pelo endereço" usa **Google Geocoding** se `VITE_GOOGLE_MAPS_API_KEY` existir; senão cai no **Nominatim** (grátis, sem chave).
- **Chave já configurada no `.env.local`** (2026-06-27). Como `VITE_*` vai embutida no bundle do front, a chave **é pública por natureza** — a proteção real é restrição + cota (abaixo). Falta replicar na Vercel.
- Pendências p/ produção segura:
  1. **Restringir por HTTP referrer** no Google Cloud Console: `https://www.despachagov.com/*` (+ `http://localhost:*` p/ dev) e limitar à **Geocoding API**.
  2. **Cota dura em 10.000/mês** (Geocoding → Quotas) → estoura = falha, não cobra. + alerta de orçamento.
  3. Pôr `VITE_GOOGLE_MAPS_API_KEY` nas env vars da Vercel; `vercel deploy --prod`.
