# Spec — Épico: papéis novos + anexos + relatório

> Data: 2026-07-02. Status: em implementação. Origem: pedido do cliente (6 itens).

Épico dividido em 4 PRs. Este doc cobre o modelo e detalha o **PR A (papéis)**;
B/C/D ficam em esboço (specs próprias ao implementar).

## Modelo de papéis (decisões confirmadas)

Estratégia: **manter os valores internos do enum** e só trocar o rótulo na UI;
adicionar os papéis novos. Nada de renomear identificadores (RLS intacta).

| Rótulo (UI) | Valor interno | Base | Poder |
|---|---|---|---|
| Secretaria (SEMED) | `secretaria_semed` *(novo)* | — | **só leitura** (chamados + relatório). Zero escrita. |
| Chefe de divisão | `admin_secretaria` *(rótulo)* | topo | tudo, **incl. cadastrar usuários** |
| Engenheiro | `engenheiro` *(novo)* | = Chefe − usuários | tudo, menos user CRUD |
| Arquiteto | `arquiteto` *(novo)* | = Chefe − usuários | idem Engenheiro (papel à parte) |
| Gestor de unidade | `responsavel_unidade` *(rótulo)* | diretores | abrir chamado etc. |
| Manutenção predial | `manutencao_predial` *(novo)* | empresa | age nos chamados da empresa dele |
| Manutenção de refrigeração | `manutencao_refrigeracao` *(novo)* | empresa | idem |
| Manutenção de ar-condicionado | `manutencao_ar_condicionado` *(novo)* | empresa | idem |
| Instalação de ar-condicionado | `instalacao_ar_condicionado` *(novo)* | empresa | idem |

`gestor_secretaria` continua existindo (legado), fora da UI de cadastro.
Os 4 papéis de empresa agem como `empresa_admin` (escopo por `empresa_id` do JWT);
diferença é só rótulo. A ESPECIALIDADE da empresa (para triagem, item #3) é tratada
no **PR B**, não aqui.

## PR A — implementação

### Banco
- `0017_papeis_novos.sql`: `alter type public.user_role add value if not exists` para
  os 7 valores novos. Migração isolada (add-value não pode ser usado como enum na
  mesma transação; aqui as policies usam `current_app_role()` que é **text**, não enum).
- `0018_papeis_rls.sql`: drop+recreate das policies, incluindo os papéis novos.
  Conjuntos:
  - **CADASTRO_WRITE** = admin_secretaria, engenheiro, arquiteto (escrita em
    unidades/empresas/equipamentos/tecnicos/contratos + storage contratos).
  - **CHAMADO_SEC** = admin_secretaria, gestor_secretaria, engenheiro, arquiteto
    (read/update de chamados como secretaria).
  - **secretaria_semed**: adicionado só nas policies de SELECT (chamados, eventos,
    anexos, assinaturas, notificacoes). Nunca em insert/update.
  - **EMPRESA_ALL** = empresa_admin, tecnico_empresa + os 4 novos (branch de empresa
    em chamados/eventos).
  - **EMPRESA_ADMIN_LIKE** = empresa_admin + os 4 novos (gestão de tecnicos).
  - `users_admin_*` **inalteradas** (só `admin_secretaria`) — é o que separa Chefe de
    Engenheiro/Arquiteto.
  - `pode_acessar_chamado`: branch secretaria ganha engenheiro/arquiteto (NÃO semed,
    pois a função também porteia inserts). SEMED lê anexos/assinaturas por cláusula
    extra só-select.

### Front
- `database.types.ts`: enum `user_role` ganha os 7 valores.
- `permissions.ts`: `ROLES` + `MATRIX`:
  - `secretaria_semed`: `chamado:[read]`, `relatorio:[read]`, `unidade:[read]`, `empresa:[read]`, `contrato:[read]`.
  - `engenheiro`/`arquiteto`: cópia de admin_secretaria **sem** `user`.
  - 4 empresa: cópia de `empresa_admin`.
- `auth.ts` `homeRouteForRole`: semed/engenheiro/arquiteto → `/secretaria`; 4 empresa → `/empresa`.
- `router.tsx`: `SECRETARIA_ROLES` += semed, engenheiro, arquiteto; `/empresa` roles += 4;
  rota `/secretaria/usuarios` com guarda extra `roles={[admin_secretaria]}`.
- `SecretariaShell`: nav "Usuários" já é `adminOnly` (só admin_secretaria) — ok.
- `invite-user`: `ROLES_SECRETARIA` += semed, engenheiro, arquiteto; `ROLES_EMPRESA` += 4
  (exigem `empresa_id`). `unidade_ids` obrigatório só p/ `responsavel_unidade`.
- `UsuariosPage`: botão/título **"Cadastrar usuário"** (era Convidar); `ROLE_LABEL` +
  `ROLES_CONVIDAVEIS` + `ROLES_EMPRESA` + `schema` atualizados com os papéis novos.

### Fora do PR A (itens do épico)
- **PR B (#3)**: especialidade da empresa (4 termos) no cadastro + uso na triagem.
- **PR C (#1,#4,#5)**: baixar ofícios; empresa manda 5 fotos antes/5 depois ao concluir;
  comprovante baixável por Chefe/Engenheiro/Arquiteto; corrigir upload de foto do diretor.
- **PR D (#6)**: relatório "por chamado" (Escola · Em andamento · Concluídos · %) no
  lugar de "por unidade" + "por urgência".

## Verificação (PR A)
- `npm run build` + `eslint .` + `vitest run` verdes (front).
- ⚠️ RLS **não testável** sem banco — validar `0017`/`0018` num branch Supabase
  (`supabase db push`) antes de produção. Checar: SEMED não escreve; Engenheiro/Arquiteto
  fazem tudo menos usuários; 4 papéis de empresa enxergam só os chamados da empresa.
