# DespachaGov

**Menos papel, mais ação.**

Plataforma B2G multi-tenant de gestão de demandas de manutenção para Secretarias municipais. Secretaria abre, empresa recebe, técnico executa e comprova — tudo dentro do sistema, em tempo real, com trilha de auditoria e SLA para prestação de contas (TCM/TCE).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript (strict) |
| Estilo | TailwindCSS v4 (CSS-first via `@tailwindcss/vite`) |
| Validação | Zod |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) |
| PWA | vite-plugin-pwa |
| Mobile | Capacitor (Android/iOS) — sprints futuros |
| Mapas | Leaflet — sprint 2 |
| Gráficos / PDF | Recharts / html2pdf.js — sprints 6/4 |
| IA | Anthropic Claude (Sonnet 4.6) via Edge Function |
| Email | Resend |
| Testes | Vitest + Testing Library |

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run icons                # gera ícones PWA a partir do favicon
npm run dev
```

Scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `test:cov`, `lint`, `typecheck`, `icons`.

## Segredos

- **Frontend**: só chaves `VITE_*` públicas (Supabase URL + anon).
- **Edge Functions**: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY` via `supabase secrets set` — nunca no bundle do front.
- `.env.local` é git-ignored.

## Design system

Paleta **azul/laranja TRAVADA** em `src/styles/globals.css` (`@theme`). Os mockups `Identidade visual DespachaGov/*.dc.html` usam oliva/terracota — **referência de layout apenas, paleta ignorada**. Fontes: Public Sans (corpo) + Plus Jakarta Sans (títulos/logo).

## Estrutura

```
src/
  lib/         domínio puro (TS, sem React) — chamados, permissions, sla, relatorios
  components/  ui, chamados, layout
  pages/       admin-secretaria, unidade, empresa, tecnico, superadmin
  hooks/  services/  types/  styles/
supabase/
  migrations/  functions/ (ai-agent, gerar-relatorio-mensal, notify-evento)
docs/sprints/  documentação por sprint
escola-export/ código-fonte de referência (módulo Escola do FrostERP)
```

## Roadmap

Sprints 0–10. Status atual: **Sprint 0 (setup)**. Ver `docs/sprints/`.
