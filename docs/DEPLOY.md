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

## Comandos

```bash
REF=evdjijvxllhrlkkhrcdi

supabase db push --project-ref $REF
supabase functions deploy health         --project-ref $REF
supabase functions deploy record-consent --project-ref $REF
supabase functions deploy delete-account --project-ref $REF
supabase functions deploy delete-tenant  --project-ref $REF
```

`supabase/config.toml` fixa o `verify_jwt` de cada função. Antes dele, esse ajuste
existia só no painel, e um redeploy de outra máquina podia derrubar o login sem
deixar rastro no repositório.

⚠️ **Nunca rode `supabase config push` com o config.toml atual.** Ele declara
apenas `project_id` e `[functions.*]` de propósito. `config push` sobrescreve a
configuração remota inteira, e a ausência de `[auth]` resetaria templates de
e-mail, SMTP e expiração de token para o default do CLI.

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
