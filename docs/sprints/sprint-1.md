# Sprint 1 — Auth e Onboarding

Status: **quase concluído**. Pendente: 1 autorização do owner (criar superadmin).

## Projeto Supabase

⚠️ Corrigido: a URL/anon enviada no início (`rbwzhglsztmjvwrcydcy`) era do **frostapp2.0** (ERP antigo). O projeto correto é **DESPACHAGOV** `evdjijvxllhrlkkhrcdi` (sa-east-1 / São Paulo). `.env.local` apontando pro certo.

## Entregue

### Banco (migration `0001_auth_multitenant`)
- Tabelas: `tenants`, `users` (1:1 com `auth.users`), `lgpd_consents`.
- Enum `user_role` (7 papéis).
- Helpers de claim: `current_tenant_id()`, `current_app_role()`, `is_superadmin()` (lêem `app_metadata` do JWT).
- Trigger `set_updated_at`.
- **RLS em 100% das tabelas** (ver checklist abaixo).
- Claims `{ role, tenant_id }` em `auth.users.app_metadata`, setados server-side (Edge Functions) — só `service_role` altera.

### Edge Functions (deployadas)
- `create-tenant` (verify_jwt, superadmin) — cria tenant + 1º `admin_secretaria` (Auth + perfil) + link de convite + e-mail Resend (best-effort). Rollback em falha.
- `invite-user` (verify_jwt, admin_secretaria) — convida usuário do próprio tenant (gestor/responsável/técnico). Claims setadas.

### Frontend
- `AuthProvider`/`useAuth` (sessão + perfil + role + tenant). Cliente Supabase tipado (`Database`).
- Telas: Login, Recuperar senha, Redefinir senha (Zod + acessível). `AuthShell` com a marca.
- `ProtectedRoute` (sessão + restrição por papéis) → `LgpdGate` (aceite obrigatório do termo `2026-06-v1`).
- Roteamento por papel (`HomeRedirect` → `/superadmin`, `/secretaria`, `/unidade`, `/empresa`, `/tecnico`).
- Painel superadmin: lista de Secretarias + form de criação (chama `create-tenant`).
- Resolução de subdomínio (`resolverSubdomain`) com override `?tenant=` em dev. Testado.
- UI: Button, Input, Card/Alert, AppShell.

### Verificação
| Check | Resultado |
|-------|-----------|
| `vitest run` | 19 passed (chamados, permissions, subdomain) |
| `npm run build` | ✓ (tsc strict + vite + PWA) |
| `eslint .` | OK |
| advisors security | só WARN em função pré-existente `rls_auto_enable` (não nossa) |

## Checklist RLS (por papel)

| Tabela | superadmin | admin_secretaria | gestor | responsavel/tecnico | outro tenant |
|--------|-----------|------------------|--------|---------------------|--------------|
| tenants | CRUD | SELECT próprio + UPDATE próprio | SELECT próprio | SELECT próprio | ❌ |
| users | CRUD | CRUD do tenant | SELECT do tenant + self-update | SELECT do tenant + self-update | ❌ |
| lgpd_consents | SELECT all | INSERT/SELECT próprio + SELECT do tenant | idem | INSERT/SELECT próprio | ❌ |

> Isolamento por `tenant_id = current_tenant_id()` (claim do JWT). Teste end-to-end por papel será feito após bootstrap do superadmin + criação de um tenant piloto.

## Pendência — autorização do owner

Criar o **superadmin** (Gabriel) foi bloqueado pelo classificador de segurança (conta de privilégio máximo com credencial escolhida pelo agente). Precisa de autorização explícita + senha escolhida pelo Gabriel. Ver opções no chat.

## Próximo (Sprint 2)
Cadastros base: Unidades (mapa Leaflet + import CSV), Equipamentos (QR code), Empresas, Contratos (upload PDF).
