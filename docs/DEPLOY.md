# Deploy — DespachaGov

## O erro que já quase aconteceu duas vezes

A Vercel publica a `main` **automaticamente**. Migrations e Edge Functions são
**manuais**. Entre um e outro existe uma janela em que o frontend novo conversa
com um backend velho.

Nas ondas de correção de julho/2026 isso apareceu duas vezes, e a segunda teria
derrubado a operação inteira: a versão do termo mudou, todo usuário passou a cair
no gate de aceite, e o insert do aceite referenciava uma coluna que a migration
ainda não tinha criado. Gate que não grava aceite não deixa ninguém entrar.

**Regra que sai disso:** toda mudança que acopla frontend novo a schema ou função
nova precisa de degradação graciosa no cliente — ou de deploy do backend
**antes** do merge. Ver o fallback duplo em `src/services/lgpd.ts`.

## Ordem correta

```
1. migrations   →  supabase db push
2. functions    →  supabase functions deploy <nome>
3. frontend     →  merge na main (Vercel publica sozinha)
```

Backend primeiro, sempre. Backend novo com frontend velho é compatível (colunas
e endpoints a mais são ignorados); o contrário não é.

Se a ordem não puder ser respeitada, o código do cliente precisa tolerar as duas
formas do backend, e isso tem que estar comentado no ponto exato.

## ⚠️ `supabase db push` NÃO funciona neste repositório

Os arquivos aqui se chamam `0001_auth_multitenant.sql`. O histórico em produção
registra `version = 20260623233538`, `name = 0001_auth_multitenant` — ou seja, os
arquivos originais eram `20260623233538_0001_auth_multitenant.sql` e perderam o
prefixo de timestamp ao entrar no repositório.

O CLI deriva a versão do prefixo numérico do nome do arquivo. Ele leria as
versões locais como `0001`…`0023`, não encontraria nenhuma delas no histórico
remoto, e trataria **todas** como pendentes — tentando recriar tabelas que já
existem, com dados de cidadãos dentro.

Confirme antes de qualquer coisa (somente leitura):

```bash
npx supabase migration list --project-ref evdjijvxllhrlkkhrcdi
```

Se as colunas Local e Remote não casarem, `db push` está descartado e vale o
procedimento manual abaixo.

Corrigir o descasamento de vez (renomear os 23 arquivos para o timestamp real de
cada um, ou usar `supabase migration repair`) é trabalho à parte, que deve ser
feito com staging disponível — não no meio de um deploy.

## Aplicar migrations — procedimento manual

Uma de cada vez, na ordem, conferindo entre elas. Pelo SQL Editor do painel
(Database → SQL Editor) ou por `psql`:

```bash
psql "$SUPABASE_DB_URL" -1 -f supabase/migrations/0021_exclusao_titular.sql
psql "$SUPABASE_DB_URL" -1 -f supabase/migrations/0022_consentimento_prova.sql
psql "$SUPABASE_DB_URL" -1 -f supabase/migrations/0023_tenants_publicos_minimo.sql
```

`-1` envolve cada arquivo numa transação: erro no meio desfaz tudo daquele
arquivo, em vez de deixar o schema pela metade.

Depois, registre no histórico para que o descasamento não cresça:

```sql
insert into supabase_migrations.schema_migrations (version, name) values
  ('20260729000021', '0021_exclusao_titular'),
  ('20260729000022', '0022_consentimento_prova'),
  ('20260729000023', '0023_tenants_publicos_minimo');
```

## Publicar as Edge Functions

Isto é independente das migrations e não sofre do problema acima:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...    # Painel → Account → Access Tokens
REF=evdjijvxllhrlkkhrcdi

npx supabase functions deploy health         --project-ref $REF
npx supabase functions deploy record-consent --project-ref $REF
npx supabase functions deploy delete-account --project-ref $REF
npx supabase functions deploy delete-tenant  --project-ref $REF
```

`supabase/config.toml` fixa o `verify_jwt` de cada função. Antes dele, esse ajuste
existia só no painel, e um redeploy de outra máquina podia derrubar o login sem
deixar rastro no repositório.

⚠️ **Nunca rode `supabase config push` com o config.toml atual.** Ele declara
apenas `project_id` e `[functions.*]` de propósito. `config push` sobrescreve a
configuração remota inteira, e a ausência de `[auth]` resetaria templates de
e-mail, SMTP e expiração de token para o default do CLI.

## Verificação pós-deploy

```sql
-- 0021: função e coluna existem
select proname from pg_proc where proname = 'anonimizar_titular';
select column_name from information_schema.columns
 where table_name = 'users' and column_name = 'anonimizado_em';

-- 0022: coluna de prova existe
select column_name from information_schema.columns
 where table_name = 'lgpd_consents' and column_name = 'texto_hash';

-- 0023: a RPC devolve UMA coluna só
select * from public.listar_tenants_publicos() limit 1;
```

E no app, ponta a ponta: entrar (o gate vai pedir aceite do termo `2026-07-v2`),
conferir que o aceite gravou `texto_hash` e `ip`, e abrir "Meus dados" para ver o
botão de exclusão respondendo.

```bash
curl -i https://evdjijvxllhrlkkhrcdi.supabase.co/functions/v1/health
```

## Rollback de migration

Cada migration a partir da 0021 tem par em `supabase/migrations/rollback/`.

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/rollback/0023_tenants_publicos_minimo.down.sql
```

**Convenção:** toda migration nova nasce com o `.down.sql` correspondente no
mesmo commit. Sem isso, reverter em produção vira improviso sob pressão.

Os arquivos de rollback desfazem **estrutura**, não **efeito**. Anonimização de
titular e sobrescrita de dado não voltam por DDL — só por restauração de backup
(`docs/RESTORE.md`). Cada `.down.sql` abre com o aviso do que se perde e o que
exportar antes.

Migrations 0001–0020 não têm rollback: foram aplicadas antes desta convenção, e
escrever o inverso delas de cabeça seria mais arriscado que útil.

## Staging — não existe ainda

Hoje só há o projeto de produção. Não há onde validar uma migration antes de ela
tocar dado de cidadão, e é por isso que a ordem de deploy acima é rígida.

Para montar, quando houver decisão:

1. Projeto Supabase novo, mesma região (`sa-east-1`), mesmo plano.
2. `supabase db push --project-ref <staging>` — valida as migrations do zero,
   que é o único teste real de que 0004 e 0006 foram reconstruídas direito.
3. Vercel → Preview Environment apontando para as chaves de staging.
4. CI passa a rodar `db push` contra staging em pull request.

Enquanto não existir, a mitigação é a ordem de deploy e a degradação graciosa.

## Monitoramento externo

A Edge Function `health` responde sem autenticação (declarado em `config.toml`) e
devolve **503** quando Postgres ou Storage não respondem — 503 é o que faz um
serviço de uptime alertar.

```
https://evdjijvxllhrlkkhrcdi.supabase.co/functions/v1/health
```

Aponte um monitor externo (UptimeRobot, Better Stack, healthchecks.io) para essa
URL, intervalo de 1 a 5 minutos, alerta por e-mail ou WhatsApp.

**Por que externo:** a observabilidade atual é a tabela `error_log`, que vive no
mesmo Postgres que ela monitora. Quando o banco cai, o incidente e o registro do
incidente somem juntos, e a descoberta depende de alguém abrir a tela de Saúde
por acaso.

### Sobre agregador de erro (Sentry e similares) — decisão pendente

A auditoria recomendou Sentry. **Não foi implementado de propósito**, porque a
escolha não é técnica:

- Um agregador externo recebe stack traces e contexto de erro de um sistema que
  trata CPF de cidadãos. Ele se torna **operador de dados** sob a LGPD, o que
  exige previsão contratual e cláusula de proteção de dados.
- A Política de Privacidade em `src/pages/PoliticaPrivacidadePage.tsx` afirma hoje
  que não há "compartilhamento com terceiros além dos subprocessadores de
  infraestrutura (hospedagem e e-mail transacional)". Ligar um agregador sem
  atualizar esse texto torna a política falsa.

Se a decisão for seguir: reaproveitar `redigirTexto`/`redigirValor` de
`src/lib/lgpd.ts` no `beforeSend` (a redação de CPF/e-mail/telefone já existe e é
testada), condicionar a inicialização a `VITE_SENTRY_DSN` presente, e atualizar a
Política de Privacidade **no mesmo commit**.
