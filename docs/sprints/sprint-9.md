# Sprint 9 — LGPD (direitos do titular) + segurança

Status: **concluído (local)**. Frontend + config; sem migration.

## Direitos do titular (LGPD art. 18)
A tela "Meus dados" — prometida no termo de aceite (`LgpdGate`) — agora existe.

- `src/lib/privacidade.ts` — **puro/testado**: `montarExportacao` (pacote de portabilidade:
  titular + consentimentos + chamados abertos), `camposPessoais` (linhas rotuladas), `nomeArquivoExport`.
  `privacidade.test.ts` (3 casos).
- `src/services/privacidade.ts` — `obterConsentimentos` (`lgpd_consents`, coluna `aceito_em`) e
  `obterMeusChamados` (chamados do solicitante). Tudo via RLS (o usuário lê o próprio).
- `src/pages/conta/PrivacidadePage.tsx` (`/conta/privacidade`, qualquer papel autenticado) —
  dados pessoais + **baixar meus dados (JSON)** + histórico de consentimentos + explicação dos direitos.
- `src/pages/PoliticaPrivacidadePage.tsx` (`/politica-privacidade`, **pública**) — política completa
  (controlador/operador, dados, finalidade/base legal, isolamento, direitos, segurança, contato).
- Link "Meus dados" nos headers (`AppShell`, `SecretariaShell`, `EmpresaShell`).

## Segurança — headers HTTP (Vercel)
`vercel.json` ganha `headers` em todas as rotas:
- `Strict-Transport-Security` (HSTS, 2 anos + preload)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), camera=(self), microphone=()` (app usa câmera/geo)

> CSP não incluída ainda (precisa allowlist de Supabase/Leaflet/recharts/fonts p/ não quebrar) — melhoria futura.

## Verificação
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ |
| `eslint .` | exit 0 |
| `vitest run` | 66 passed (14 files) |

## Decisões / fora de escopo
- **Exclusão (direito ao esquecimento) é mediada pelo admin da Secretaria**, não self-service —
  preserva integridade dos registros públicos. A tela orienta o titular. (Self-service de exclusão
  de conta = melhoria futura.)
- CSP estrita = futuro.

## Próximo (Sprint 10)
Beta SEMED Altamira (rollout/onboarding do piloto).
