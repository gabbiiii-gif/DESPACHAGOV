# Restauração do banco — DespachaGov

> **Status: NÃO TESTADO.** Este procedimento foi escrito a partir do esquema real
> do projeto, mas **nenhum drill de restauração foi executado até 2026-07-28**.
> Backup sem restauração testada não é backup — é esperança. Faça o drill da
> seção 4 antes de considerar este item resolvido e anote o tempo real na tabela
> do fim do documento.

## 0. Antes de tudo: qual é o desastre?

| Situação | Use | Tempo esperado |
|---|---|---|
| Alguém apagou dados há minutos/horas; projeto Supabase saudável | **PITR** (seção 2) | minutos |
| Migration ruim aplicada; projeto saudável | **PITR** para o instante anterior | minutos |
| Projeto Supabase excluído, conta perdida, provedor inacessível | **Dump off-provider** (seção 3) | horas |
| Tenant único excluído por engano via `delete-tenant` | **PITR** — o cascade é irreversível | minutos |

Escolher errado custa tempo no pior momento. PITR é sempre a primeira tentativa
quando o projeto ainda existe.

## 1. Contatos e acessos necessários

- Painel Supabase → projeto `evdjijvxllhrlkkhrcdi` (org `cokcjnpqorerqufshodu`)
- Credenciais do bucket de backup (S3-compatível)
- `BACKUP_GPG_PASSPHRASE` — **guardada fora do GitHub**. Se a única cópia estiver
  nos secrets do repositório e a conta do GitHub for o que se perdeu, o backup
  é indecifrável. Confirme hoje onde está a segunda cópia.

## 2. Restauração via PITR (caminho normal)

1. Painel → **Database → Backups → Point in Time**.
2. Escolha o timestamp **imediatamente anterior** ao incidente (em UTC — confira
   o fuso, Altamira é UTC-3).
3. Confirme. O projeto fica indisponível durante a operação.
4. Vá para a seção 5 (validação).

> Se a aba **Point in Time** não aparecer, o plano do projeto não inclui PITR.
> Nesse caso o único caminho é a seção 3, e o RPO passa a ser de até 24h — a
> distância até o último backup diário.

## 3. Restauração a partir do dump off-provider

### 3.1 Baixar e decifrar

```bash
# Liste o que existe e pegue o mais recente
aws s3 ls s3://despachagov-backups/ --recursive | sort | tail -5

aws s3 cp s3://despachagov-backups/2026/07/despachagov_20260728T060000Z.dump.gpg .

# Decifra em diretório restrito — o arquivo em claro tem CPF de cidadãos
mkdir -p ~/restore && chmod 700 ~/restore && cd ~/restore
gpg --batch --passphrase-fd 0 --decrypt \
    --output despachagov.dump ../despachagov_20260728T060000Z.dump.gpg
```

### 3.2 Conferir antes de restaurar

```bash
# Índice do dump: confirma que não está corrompido e mostra o que será restaurado
pg_restore --list despachagov.dump | head -40

# As 16 tabelas esperadas devem aparecer
pg_restore --list despachagov.dump | grep -c "TABLE DATA public"
```

### 3.3 Restaurar num projeto NOVO

**Nunca restaure por cima do projeto atual sem antes tirar um dump do estado
corrente.** Se o diagnóstico estiver errado, o dump atual é o único caminho de
volta.

```bash
# 1) Rede de segurança do estado atual, mesmo que pareça perdido
pg_dump "$URL_ATUAL" -Fc --no-owner --no-acl -f pre-restauracao.dump

# 2) Restaurar no destino
pg_restore \
  --dbname "$URL_DESTINO" \
  --no-owner --no-acl \
  --clean --if-exists \
  --jobs 4 \
  despachagov.dump
```

Erros esperados e que **podem ser ignorados**: falhas em objetos dos schemas
`auth`, `storage` e `extensions` que o Supabase já criou no projeto novo, e
`role "..." does not exist`. O dump é gerado com `--no-owner --no-acl`
justamente porque esses papéis não existem no destino.

### 3.4 O que o dump NÃO traz

Isto é o que faz uma restauração "bem-sucedida" resultar num sistema quebrado:

| Item | Consequência | Como recuperar |
|---|---|---|
| **Usuários do `auth.users`** | Ninguém consegue entrar. `public.users` fica com FK apontando para nada. | Recriar via `create-tenant` / `invite-user`, ou restaurar o schema `auth` se o dump o incluir. |
| **Arquivos do Storage** (`contratos`, `chamado-anexos`) | Anexos e fotos de execução somem; comprovantes de obra ficam sem prova. | Backup separado dos buckets — **não existe hoje**. Ver "Lacunas conhecidas". |
| **Secrets das Edge Functions** | E-mail, IA e geocoding param. | `supabase secrets set` de novo (`RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `NOTIFY_WEBHOOK_SECRET`). |
| **Edge Functions** | Login, convite e notificação param. | `supabase functions deploy` a partir do repo. |
| **Config de `verify_jwt` por função** | `login` pode voltar exigindo JWT e quebrar a autenticação inteira. | Reconferir função a função no painel. Não há `config.toml` versionado. |
| **app_metadata (claims)** | RLS bloqueia tudo: `current_tenant_id()` volta null. | Reprovisionar claims via Edge Function. |

### 3.5 Após restaurar em projeto novo

1. Atualize `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel.
2. `supabase functions deploy` para as 11 funções.
3. `supabase secrets set` para todos os segredos.
4. Reconfira `verify_jwt` (especialmente `login`, que exige **false**).
5. Seção 5.

## 4. Drill trimestral (o que valida este documento)

Faça num projeto Supabase descartável, **nunca em produção**:

1. Crie um projeto novo no mesmo plano.
2. Restaure o backup mais recente seguindo a seção 3.
3. Aponte um build local para ele.
4. Verifique a seção 5 inteira.
5. **Cronometre** e registre abaixo.
6. Apague o projeto de teste.

## 5. Validação — a restauração só terminou quando tudo passa

```sql
-- 16 tabelas esperadas
select count(*) from pg_tables where schemaname = 'public';

-- RLS ativa em TODAS elas. Qualquer linha aqui = vazamento entre tenants.
select tablename from pg_tables
 where schemaname='public' and rowsecurity = false;

-- 46 policies (referência de 2026-07-28)
select count(*) from pg_policies where schemaname = 'public';

-- Realtime: chamados precisa estar publicado, senão o mapa e o painel da
-- empresa param de atualizar sozinhos (migration 0004)
select tablename from pg_publication_tables where pubname='supabase_realtime';

-- pode_acessar_chamado PRECISA ser INVOKER (migration 0006).
-- true aqui = furo de isolamento entre tenants.
select prosecdef from pg_proc where proname = 'pode_acessar_chamado';

-- Volumetria: compare com o dia anterior ao incidente
select
  (select count(*) from tenants)  as tenants,
  (select count(*) from users)    as usuarios,
  (select count(*) from chamados) as chamados;
```

Depois, no app: login → abrir um chamado → anexar arquivo → concluir com
assinatura. Se o anexo falhar, o problema é Storage (3.4), não banco.

## Lacunas conhecidas

- **Storage não tem backup.** Os buckets `contratos` e `chamado-anexos` não são
  copiados por nenhum processo. Um desastre no Storage é hoje **perda total** de
  anexos, fotos de execução e PDFs de contrato. Este é o próximo item a resolver.
- **Nenhum drill executado.** A tabela abaixo está vazia por isso.
- **Sem alerta de falha.** Se o workflow de backup quebrar, ninguém é avisado
  além do e-mail padrão do GitHub Actions.

## Registro de drills

| Data | Quem | Cenário | Tempo até operacional | Problemas encontrados |
|---|---|---|---|---|
| _(nenhum drill executado)_ | | | | |
