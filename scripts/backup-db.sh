#!/usr/bin/env bash
# ─── DespachaGov · Backup do banco ───────────────────────────────────────────
# Cópia off-provider do Postgres de produção, criptografada, para storage
# S3-compatível (R2 / B2 / S3).
#
# ATENÇÃO — ESTE REPOSITÓRIO É PÚBLICO.
# O dump contém dados pessoais de cidadãos e servidores (CPF, e-mail, telefone).
# Ele NUNCA pode virar artifact do GitHub Actions, anexo de issue, ou arquivo
# commitado: em repositório público esses destinos são de leitura aberta.
# Por isso este script só escreve em diretório temporário com permissão 700 e
# só publica no destino S3 configurado por secret.
#
# ── ESTE BACKUP NÃO SUBSTITUI O PITR ──────────────────────────────────────────
# O Point-in-Time Recovery do Supabase é a primeira linha (RPO de segundos) e é
# quem você usa para "voltar 20 minutos". Este script cobre o que o PITR não
# cobre: perda da conta Supabase, exclusão acidental do projeto, ou necessidade
# de restaurar em outro provedor. Rodar um sem o outro deixa buraco.
#
# ── USO ───────────────────────────────────────────────────────────────────────
#   export SUPABASE_DB_URL="postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres"
#   export BACKUP_S3_BUCKET="s3://despachagov-backups"
#   export BACKUP_GPG_PASSPHRASE="..."          # simétrica, guardada FORA do GitHub
#   export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
#   export AWS_ENDPOINT_URL="https://<conta>.r2.cloudflarestorage.com"  # se R2/B2
#   ./scripts/backup-db.sh
#
# Requer: pg_dump (client 17+, mesma major do servidor), gpg, aws-cli.

set -Eeuo pipefail

fatal() { echo "ERRO: $*" >&2; exit 1; }

# ─── Pré-condições ───────────────────────────────────────────────────────────
# Falha ANTES de tocar no banco. Um backup que roda pela metade e "passa" é
# pior que nenhum: cria confiança falsa.
: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL}"
: "${BACKUP_S3_BUCKET:?defina BACKUP_S3_BUCKET}"
: "${BACKUP_GPG_PASSPHRASE:?defina BACKUP_GPG_PASSPHRASE}"

for bin in pg_dump gpg aws; do
  command -v "$bin" >/dev/null 2>&1 || fatal "'$bin' não encontrado no PATH"
done

# Client mais antigo que o servidor gera dump incompleto/incompatível.
SERVIDOR_MAJOR="$(psql "$SUPABASE_DB_URL" -tAc 'show server_version_num' 2>/dev/null | cut -c1-2 || echo '')"
CLIENTE_MAJOR="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
if [[ -n "$SERVIDOR_MAJOR" && "$CLIENTE_MAJOR" -lt "$SERVIDOR_MAJOR" ]]; then
  fatal "pg_dump $CLIENTE_MAJOR é mais antigo que o servidor $SERVIDOR_MAJOR — dump seria inválido"
fi

# ─── Área de trabalho ────────────────────────────────────────────────────────
# 700 + trap: o dump em claro não sobrevive ao fim do script nem a uma falha.
TRABALHO="$(mktemp -d)"
chmod 700 "$TRABALHO"
trap 'rm -rf "$TRABALHO"' EXIT INT TERM

CARIMBO="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="despachagov_${CARIMBO}"
DUMP="${TRABALHO}/${BASE}.dump"
CIFRADO="${DUMP}.gpg"

echo "→ Dump (formato custom, comprimido)…"
# -Fc: permite restauração seletiva por tabela com pg_restore, e é o formato
# que docs/RESTORE.md assume. --no-owner/--no-acl: os papéis do Supabase não
# existem num destino novo e quebrariam a restauração.
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --file="$DUMP"

# Dump vazio ou truncado passa despercebido sem esta checagem.
TAMANHO="$(stat -c%s "$DUMP" 2>/dev/null || stat -f%z "$DUMP")"
[[ "$TAMANHO" -gt 10240 ]] || fatal "dump suspeito: apenas ${TAMANHO} bytes"
echo "  dump: ${TAMANHO} bytes"

echo "→ Verificando integridade do dump…"
# Lê o índice do arquivo. Pega corrupção antes de subir lixo para o destino.
pg_restore --list "$DUMP" >/dev/null || fatal "dump ilegível por pg_restore"

echo "→ Criptografando (AES-256)…"
printf '%s' "$BACKUP_GPG_PASSPHRASE" | gpg \
  --batch --yes --quiet \
  --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 \
  --output "$CIFRADO" "$DUMP"

# O dump em claro morre aqui, não só no trap.
shred -u "$DUMP" 2>/dev/null || rm -f "$DUMP"

echo "→ Enviando para ${BACKUP_S3_BUCKET}…"
DESTINO="${BACKUP_S3_BUCKET%/}/$(date -u +%Y/%m)/${BASE}.dump.gpg"
AWS_ARGS=()
[[ -n "${AWS_ENDPOINT_URL:-}" ]] && AWS_ARGS+=(--endpoint-url "$AWS_ENDPOINT_URL")
aws "${AWS_ARGS[@]}" s3 cp "$CIFRADO" "$DESTINO"

echo "✓ Backup concluído: ${DESTINO}"
echo
echo "LEMBRETE: backup sem restauração testada não é backup."
echo "Faça o drill de docs/RESTORE.md pelo menos uma vez por trimestre."
