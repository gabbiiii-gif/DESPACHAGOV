# Sprint 10 — Onboarding do piloto (Beta SEMED Altamira) + hardening de papéis

Status: **concluído (local)**. Frontend + Edge Function; sem migration.

## Onboarding "Primeiros passos"
Ajuda a Secretaria-piloto a se configurar sozinha no primeiro acesso.

- `src/lib/onboarding.ts` — **puro/testado**: `passosOnboarding` (unidades → empresas → equipe),
  `progressoOnboarding`, `onboardingCompleto`. `onboarding.test.ts` (3 casos).
- `PainelPage` — card "Primeiros passos" no topo enquanto incompleto: checklist com link p/ cada
  cadastro + contador (X/3). Some quando os 3 passos têm ≥1 registro. Conta usuários via
  `listarUsuariosTenant`.

## Hardening de papéis (defesa server-side)
- `invite-user` deixa de aceitar papéis `tecnico_secretaria`/`tecnico_empresa` (já saíram da UI no
  refactor anterior). `ROLES_SECRETARIA`/`ROLES_EMPRESA` reduzidos. **Deployado** (verify_jwt=true).

## Verificação
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ |
| `eslint .` | exit 0 |
| `vitest run` | 69 passed (16 files) |

## Notas do piloto
- Tenant `semed-altamira` já existe (HANDOFF: tenant de teste). Superadmin cria/gerencia via UI.
- Import de unidades por CSV já existe (UnidadesPage) — caminho rápido p/ popular o piloto.

## Roadmap do HANDOFF concluído
Sprints 0–10 entregues. Próximos passos viram operação (popular dados reais, treinar usuários) +
pendências de chave (ANTHROPIC/Google) e merge dos PRs.
