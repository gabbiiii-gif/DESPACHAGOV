# DespachaGov — Handoff (retomar em outra máquina)

> Atualizado: 2026-06-24. Este doc viaja no git (a memória local do Claude não).
> Ao abrir sessão nova, peça ao agente para **ler `docs/HANDOFF.md` + `docs/sprints/`**.

## Estado atual
Sprints **0–4 concluídos e no ar** em **https://www.despachagov.com**.
Ciclo ponta-a-ponta funcionando: Secretaria cadastra → Unidade abre chamado → Secretaria atribui empresa → Empresa designa técnico → Técnico executa (foto antes/depois + assinatura) → comprovante PDF → some do mapa ao vivo. Multi-tenant + RLS + Realtime + e-mail (Resend) ok.

Último commit relevante: Sprint 4 (execução em campo).

## Stack / decisões travadas
- React 19 + Vite 6 + TS estrito + Tailwind v4 (CSS-first, `@theme`) + PWA. Supabase (Postgres+Auth+Realtime+Storage+Edge Functions). Leaflet, Recharts (sprint 6), qrcode, papaparse, html2pdf.js.
- Paleta **azul #2456A6 / laranja #F97316** (mockups `.dc.html` usam oliva/terracota — IGNORAR, só layout). Fontes Public Sans + Plus Jakarta Sans.
- Urgência: `baixa/media/alta/critica`. Status chamado: `aberto→atribuido→em_campo→concluido` + `cancelado`.

## Infra
- **Supabase**: projeto `evdjijvxllhrlkkhrcdi` (sa-east-1). Migrations aplicadas até `0006`. Edge Functions `create-tenant`, `invite-user`. Buckets privados `contratos`, `chamado-anexos`.
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
- **5**: notificações push (Capacitor/FCM) + e-mail transacional por evento (Resend) + PWA offline na abertura.
- **6**: painel Secretaria — KPIs + Recharts + relatórios PDF/CSV.
- **7**: Agente IA (Edge Function `ai-agent`, Claude Sonnet; campos `ai_urgencia_sugerida`/`ai_categoria` já existem).
- **8** (crítico p/ faturamento): relatórios mensais + `sla_log` + painel "Meu Contrato".
- **9** LGPD/segurança · **10** Beta SEMED Altamira.

## Gotchas
- TS `exactOptionalPropertyTypes`: campos opcionais em Insert/props precisam de `| undefined` explícito.
- eslint react-hooks v7 `set-state-in-effect`: usar IIFE async com guard `ativo`, setState só após `await`.
- Path do projeto tem espaços/acentos/OneDrive — usar caminhos absolutos.
