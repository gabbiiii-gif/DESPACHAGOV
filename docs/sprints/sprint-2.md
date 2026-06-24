# Sprint 2 — Cadastros base

Status: **concluído**.

## Banco (migration `0002_cadastros_base`)
- Tabelas: `unidades`, `empresas`, `equipamentos`, `tecnicos`, `contratos` (todas com `tenant_id`).
- RLS macro (loop): SELECT p/ membros do tenant; ALL p/ `admin_secretaria` (+ superadmin).
- Bucket privado `contratos` (Storage) com RLS por pasta = `tenant_id`. Upload restrito a `admin_secretaria`.

## Frontend
- `SecretariaShell`: nav (sidebar desktop / topo mobile) entre Unidades, Empresas, Equipamentos, Contratos. Rotas aninhadas sob `/secretaria`.
- **Unidades**: CRUD + **mapa Leaflet/OSM** (marcadores geolocalizados, fitBounds) + **import CSV** (papaparse, normalização + linhas inválidas ignoradas).
- **Empresas**: CRUD, especialidades como array.
- **Equipamentos**: CRUD vinculado a unidade + **QR code** (qrcode → PNG, imprimível) apontando para `/eq/:id`.
- **Contratos**: CRUD + **upload de PDF** ao bucket privado + link assinado (1h) para visualizar.
- UI nova: `Modal`, `Select`. Reuso de `Button`, `Input`, `Card`, `Alert`.
- Fix do **link de convite** no painel superadmin (exibe link quando Resend não está configurado).

## Validações (Zod, puras + testadas)
- `src/lib/cadastros.ts`: schemas de unidade/empresa/equipamento/contrato + `normalizarLinhaUnidade` (CSV).

## Verificação
| Check | Resultado |
|-------|-----------|
| `vitest run` | 23 passed (5 files) |
| `npm run build` | ✓ (chunks de vendor: react/leaflet/supabase) |
| `eslint .` | OK |

## Pendências de infra (não bloqueiam)
- **Resend**: setar `RESEND_API_KEY` como secret da Edge Function + verificar domínio `despachagov.com` no Resend (DNS na Hostinger) para envio real de e-mail. Hoje o convite sai como link na tela.
- **DNS wildcard** Hostinger → Vercel para subdomínio por tenant.

## Próximo (Sprint 3)
Chamados (núcleo): abertura pela unidade (PWA offline), inbox da empresa, atribuição de técnico, timeline, protocolo numerado.
