# Spec — Superadmin gere cadastros dentro de uma secretaria (#4)

> Data: 2026-06-25. Status: aprovado. Escopo: só cadastros (sem chamados/mapa).

## Objetivo
Superadmin entra numa secretaria e gerencia seus cadastros: unidades, empresas,
equipamentos, contratos e usuários. Reuso das páginas da secretaria, escopadas ao
tenant escolhido. Secretarias e empresas mantêm autonomia.

## Mecanismo "tenant em foco"
`AuthProvider` ganha `focoTenantId` + `setFocoTenant(id|null)`. `tenantId` exposto =
`profile?.tenant_id ?? focoTenantId`. Páginas que leem `useAuth().tenantId` operam no
tenant em foco quando superadmin (inserts saem com tenant_id correto).

## Filtro por tenant nos selects
Selects de cadastro não filtram por tenant (dependem de RLS). Para superadmin (RLS
`is_superadmin` → todos os tenants), os `listar*` ganham `tenantId?` opcional →
`.eq('tenant_id', tenantId)`. Páginas passam `useAuth().tenantId`.
- `listarUnidades`, `listarEmpresas`, `listarEquipamentos`, `listarContratos`,
  `listarUsuariosTenant` (cadastros.ts / usuarios.ts).

## Usuários (convite) — ADIADO p/ próximo passo
Hoje `invite-user` exige `role === admin_secretaria` e usa `tenant_id` do claim → superadmin
não consegue. Estender (aceitar superadmin + `tenant_id` no body) é mudança de **segurança na
edge function** + redeploy → merece passe próprio. **Não entra neste commit.** O modo
superadmin cobre Unidades/Empresas/Equipamentos/Contratos; Usuários segue só pela secretaria
até a extensão de `invite-user`.

## Frontend
- `SuperadminSecretariaShell` — nav p/ `/superadmin/secretaria/:tenantId/{unidades,empresas,equipamentos,contratos,usuarios}` + banner "Gerenciando «nome» — modo superadmin" + voltar.
- `SuperadminTenantScope` — layout de rota: lê `:tenantId`, valida superadmin, `setFocoTenant` no mount / limpa no unmount, busca nome do tenant p/ o banner, renderiza o shell.
- Reuso direto de `UnidadesPage/EmpresasPage/EquipamentosPage/ContratosPage/UsuariosPage`.
- `router.tsx`: grupo `/superadmin/secretaria/:tenantId` (ProtectedRoute superadmin → Scope → Shell → páginas).
- `TenantsPage`: botão "Gerenciar" por tenant → navega pro grupo.

## RLS
Sem mudança — superadmin já tem acesso de leitura/escrita (policies com `or is_superadmin()`).

## Verificação
- `npm run build` + `eslint .` verdes.
- Smoke: superadmin abre "Gerenciar" de um tenant, cadastra unidade/empresa, vê só aquele tenant.

## Fora de escopo
- Chamados/mapa no modo superadmin (acompanhamento de serviços não entra).
