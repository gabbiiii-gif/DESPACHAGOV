# Spec — empresa_admin cadastra próprios técnicos (#3)

> Data: 2026-06-24. Status: aprovado.

## Objetivo
empresa_admin gerencia os técnicos (funcionários) da PRÓPRIA empresa — registros usados
para designar a chamados. Técnico = registro (sem login; app do técnico descopado).

## Banco — migration `0011_tecnicos_empresa_rls`
Adiciona policy permissiva em `public.tecnicos` (a macro de 0002 só dá write à secretaria):
```sql
create policy tecnicos_empresa_admin_all on public.tecnicos
  for all to authenticated
  using (tenant_id = public.current_tenant_id()
         and empresa_id = public.current_empresa_id()
         and public.current_app_role() = 'empresa_admin')
  with check (tenant_id = public.current_tenant_id()
         and empresa_id = public.current_empresa_id()
         and public.current_app_role() = 'empresa_admin');
```

## Serviço — `src/services/cadastros.ts`
`criarTecnico(row)`, `atualizarTecnico(id, patch)`, `inativarTecnico(id)` (soft delete `ativo=false`).
`listarTecnicos(empresaId)` já existe (filtra `ativo=true`).

## Validação — `src/lib/cadastros.ts`
```ts
export const tecnicoSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  especialidade: z.string().optional(),
});
```

## Frontend
- `src/components/layout/EmpresaShell.tsx` — espelha `SecretariaShell`. Nav: Chamados · Técnicos (`adminOnly`, só empresa_admin).
- `src/pages/empresa/TecnicosPage.tsx` — lista + modal criar/editar (nome obrigatório; cpf/telefone/email/especialidade opcionais) + inativar. Escopo `empresaId` do `useAuth`.
- `EmpresaChamadosPage` — desembrulhar `AppShell` (linhas 101/175) → `<div>` + `<h1>Chamados recebidos</h1>` (o shell passa a dar o chrome).
- `src/router.tsx` — `/empresa` vira `EmpresaShell` com filhos: index→`chamados`, `chamados` (EmpresaChamadosPage), `tecnicos` (ProtectedRoute `empresa_admin`).

## Verificação
- `npm run build` + `eslint .` verdes.
- Smoke manual: empresa_admin cria/edita/inativa técnico; tecnico_empresa não vê a aba/rota.

## Fora de escopo
- #4 superadmin gere cadastros entrando numa secretaria.
