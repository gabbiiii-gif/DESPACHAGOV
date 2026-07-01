# Spec — Vínculo diretor↔escola (abertura sem escolher unidade)

> Data: 2026-07-01. Status: aprovado (design). Feature nova.

## Objetivo

Ligar diretor (`responsavel_unidade`) às suas escolas. Ao abrir chamado, o diretor
**não escolhe** a unidade — ela já vem do vínculo. Uma escola tem no máximo **1**
diretor; um diretor pode responder por **N** escolas (ex.: escola + anexa).

## Decisões (confirmadas)

- **Cardinalidade:** 1 escola → no máx. 1 diretor; 1 diretor → N escolas. Modelo = FK
  no lado "muitos" (`unidades.responsavel_user_id`). Sem tabela de junção.
- **Atribuição:** no convite (obrigatório ≥1 escola) **e** editável depois para
  diretores já existentes.
- **Abertura:** 1 escola → campo travado exibindo o nome; ≥2 → dropdown só das escolas
  dele; 0 (legado) → fallback com todas (não bloqueia).
- `users.unidade_id` (single, sem uso hoje) fica **deprecado** — não é removido
  (evita migração destrutiva).

## Banco — migration `0016_unidade_responsavel`

```sql
alter table public.unidades
  add column if not exists responsavel_user_id uuid
  references public.users (id) on delete set null;
create index if not exists unidades_responsavel_idx
  on public.unidades (responsavel_user_id);
```

- RLS **sem mudança**: `unidades_select` (membros do tenant) já deixa o diretor ler suas
  escolas; `unidades_admin_all` já deixa `admin_secretaria` escrever o novo campo.
- Regenerar `src/types/database.types.ts` (add `responsavel_user_id` em
  Row/Insert/Update de `unidades` + relação FK p/ `users`).

## Edge Function — `supabase/functions/invite-user/index.ts`

Aceitar `unidade_ids: string[]` (opcional para não-diretores).

- Se `role === 'responsavel_unidade'`: exigir `unidade_ids.length >= 1` (senão 400).
- Validar que **todas** as unidades pertencem ao `tenantId` (senão 400).
- Após inserir o perfil em `users`, executar:
  `update unidades set responsavel_user_id = <novo_id> where id = any(unidade_ids) and tenant_id = <tenant>`.
- Se o update falhar: `deleteUser` + retornar erro (mesmo padrão de rollback já usado
  quando o insert do perfil falha).

Reatribuição é esperada: se uma escola já tinha responsável, o novo assume.

## Serviços (`src/services`)

- `usuarios.ts` → `ConvidarUsuarioInput`: add `unidade_ids?: string[]`. Repassa no body.
- `usuarios.ts` → nova `definirEscolasDoResponsavel(userId, unidadeIds, tenantId)`:
  update direto no cliente (admin tem RLS de escrita em `unidades`):
  1. `update unidades set responsavel_user_id = null where responsavel_user_id = userId and tenant_id = tenant` (limpa antigas);
  2. se `unidadeIds.length`, `update unidades set responsavel_user_id = userId where id in unidadeIds and tenant_id = tenant`.
- `cadastros.ts` → `Unidade` type ganha `responsavel_user_id` via regeneração dos tipos.

## UI — Convite/Usuários (`src/pages/secretaria/UsuariosPage.tsx`)

- Carregar `listarUnidades(tenantId)` junto de usuários/empresas.
- Modal convidar: quando `roleSel === 'responsavel_unidade'`, mostrar **multi-select**
  (lista de checkboxes) de unidades do tenant. Ao lado de cada uma, se já tiver
  responsável, exibir o nome atual (aviso de reatribuição). Bloquear envio se nenhuma
  marcada. Enviar `unidade_ids` no `convidarUsuario`.
- Tabela: nova ação **"Escolas"** por linha, só para `responsavel_unidade`. Abre modal
  multi-select pré-marcado com as escolas atuais do diretor
  (`unidades.filter(u => u.responsavel_user_id === user.id)`). Salvar chama
  `definirEscolasDoResponsavel`. Recarregar após salvar.

## UI — Abertura (`src/pages/unidade/UnidadeChamadosPage.tsx`)

`minhasUnidades = unidades.filter(u => u.responsavel_user_id === profile.id)`:

- `minhasUnidades.length === 1`: sem `<Select>`. Renderiza "Unidade: `<nome>`" fixo.
  `unidadeId` = `minhasUnidades[0].id` (setar em efeito/derivado). Passo "1. Unidade"
  vira rótulo estático.
- `minhasUnidades.length >= 2`: `<Select>` só com `minhasUnidades`.
- `minhasUnidades.length === 0`: fallback = `<Select>` com todas (comportamento atual).
- Cache offline (`CACHE_UNIDADES`) já guarda a lista; o filtro roda sobre o cache.
  `nomeUnidade`/`unidade_nome` seguem funcionando.

## Verificação

- `npm run build` + `eslint .` verdes.
- Tipos: `database.types.ts` reflete `responsavel_user_id`.
- Smoke manual:
  1. Convidar diretor sem marcar escola → bloqueia.
  2. Convidar diretor com 1 escola → abertura mostra unidade travada, sem dropdown.
  3. Convidar/atribuir diretor com 2 escolas → abertura mostra dropdown só com as 2.
  4. Diretor legado sem vínculo → abertura cai no dropdown com todas.
  5. Editar "Escolas" de um diretor: marcar/desmarcar reflete no vínculo e na abertura.

## Fora de escopo

- Sincronizar `unidades.diretora_nome` / `unidades.responsavel` (texto livre) com o FK.
- Remover `users.unidade_id`.
- Atribuir responsável pela tela de Unidades (fica só pela tela de Usuários).
