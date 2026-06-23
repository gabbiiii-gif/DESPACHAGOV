# Sprint 0 — Setup

Status: **concluído (local)**. Pendente: deploy Vercel + DNS wildcard + projeto Supabase backend.

## Entregue

- Scaffold Vite 6 + React 19 + TypeScript **strict** (`tsconfig.app.json`: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`).
- TailwindCSS **v4** via `@tailwindcss/vite` (CSS-first). Paleta azul/laranja TRAVADA em `src/styles/globals.css` (`@theme`). Fontes Public Sans + Plus Jakarta Sans.
- PWA via `vite-plugin-pwa` (`registerType: autoUpdate`, manifest pt-BR, service worker gerado no build).
- Ícones PWA gerados de `public/favicon.svg` via `scripts/generate-icons.mjs` (sharp): 192, 512, 512-maskable.
- ESLint flat config (typescript-eslint, react-hooks) com `no-explicit-any: error`.
- Vitest + Testing Library + happy-dom. Cobertura mirando 60% em `src/lib/**`. `escola-export` excluído.
- Cliente Supabase frontend (`src/services/supabase.ts`) lendo `VITE_*` de `.env.local`.
- Router (react-router-dom v7) com landing placeholder + componente `Logo` (avião azul + pixels laranja).
- Domínio inicial portado de `escola.js` → TS:
  - `src/lib/chamados.ts` — urgência (`baixa/media/alta/critica`), máquina de estados (`aberto→atribuido→em_campo→concluido` + `cancelado`), `validarAnexo`, SLA (`horasEntre`, `slaCumprido`).
  - `src/lib/permissions.ts` — `hasPermission(role, action, resource)` (7 roles do prompt).

## Verificação

| Check | Resultado |
|-------|-----------|
| `npx vitest run` | 12 passed (2 files) |
| `npm run build` (tsc -b + vite) | ✓ build + sw.js + 13 precache entries |
| `npx eslint .` | exit 0 |
| `npm run icons` | 3 ícones gerados |

## Decisões

- Urgência: vocabulário travado `baixa/media/alta/critica` (diverge do `baixo/medio/alto/urgente` do escola.js).
- Estados expandidos vs. escola.js para suportar atribuição empresa/técnico + execução em campo.
- Paleta dos mockups `.dc.html` (oliva/terracota) IGNORADA — só layout serve de referência.
- Tailwind v4 CSS-first: sem `tailwind.config.js`; tokens em `@theme`.

## Pendências p/ fechar Sprint 0 (precisam de credencial/infra)

- [ ] Projeto Supabase backend: confirmar `rbwzhglsztmjvwrcydcy`, criar migrations base (Sprint 1).
- [ ] Deploy Vercel (frontend) + variáveis de ambiente.
- [ ] DNS wildcard `*.despachagov.com.br` → Vercel (subdomínio por tenant).
- [ ] CI/CD (GitHub Actions: lint + test + build no PR).
- [ ] `git init` + primeiro commit + push pro repo GitHub.
- [ ] Secrets de Edge Function: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Riscos abertos (do briefing)

1. Wildcard subdomain no Vercel (plano/cert) — bloqueante p/ Sprint 1.
2. JWT custom claim `tenant_id` via Auth Hook do Supabase.
3. Capacitor + Realtime em background (websocket morre; precisa FCM/local-notifications).
4. Rate limit IA 500/tenant/mês — contador atômico server-side.
