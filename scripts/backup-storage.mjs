// ─── DespachaGov · Backup dos buckets do Storage ─────────────────────────────
// Snapshot completo de `contratos` e `chamado-anexos`, cifrado, para storage
// S3-compatível. Fecha a última lacuna de perda irreversível: o dump do
// Postgres guarda a LINHA de chamado_anexos (storage_path, mime, tamanho) mas
// não o ARQUIVO. Sem isto, um desastre no Storage apaga para sempre as fotos de
// antes/depois e os PDFs de contrato — a prova de execução do serviço público.
//
// ATENÇÃO — ESTE REPOSITÓRIO É PÚBLICO.
// O snapshot contém fotos de unidades e documentos com dado pessoal. Nunca pode
// virar artifact do GitHub Actions, anexo de issue ou arquivo commitado.
//
// FORMATO: mesmo do backup do banco (tar.gz → gpg → S3, nomeado por data).
// Restaurar é decifrar, descompactar e reenviar — sem ferramenta especial e sem
// depender deste script. Ver docs/RESTORE.md.
//
// SNAPSHOT COMPLETO, NÃO INCREMENTAL: é o que mantém a restauração trivial. O
// custo é baixar tudo a cada execução, o que é adequado no volume de piloto.
// Quando o total passar de ~5 GB ou a execução de ~20 min, troque por
// incremental com manifesto — o aviso está no fim da execução.
//
// USO:
//   export SUPABASE_URL=https://<ref>.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=...        # precisa ler buckets privados
//   export BACKUP_S3_BUCKET=s3://despachagov-backups
//   export BACKUP_GPG_PASSPHRASE=...            # a MESMA do backup do banco
//   export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
//   export AWS_ENDPOINT_URL=...                 # só p/ R2/B2/MinIO
//   node scripts/backup-storage.mjs

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const BUCKETS = ["contratos", "chamado-anexos"];
const PAGINA = 1000;
const LIMITE_AVISO_BYTES = 5 * 1024 ** 3;

const env = (nome) => {
  const v = process.env[nome];
  if (!v) {
    console.error(`ERRO: defina ${nome}.`);
    process.exitCode = 1;
    return null;
  }
  return v;
};

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: ["pipe", "pipe", "inherit"], ...opts });
}

// Storage não tem "list recursive": list() pagina e marca pastas com id === null.
// Sem recursão pegaríamos só o primeiro nível, e os caminhos aqui são
// {tenant}/{chamado}/arquivo — ou seja, nenhum arquivo está no topo.
async function listarRecursivo(storage, bucket, prefixo = "") {
  const encontrados = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await storage.from(bucket).list(prefixo, { limit: PAGINA, offset });
    if (error) throw new Error(`list ${bucket}/${prefixo}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (item.id === null) {
        encontrados.push(...(await listarRecursivo(storage, bucket, caminho)));
      } else {
        encontrados.push(caminho);
      }
    }

    if (data.length < PAGINA) break;
    offset += PAGINA;
  }

  return encontrados;
}

async function main() {
  const url = env("SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  const destino = env("BACKUP_S3_BUCKET");
  const senha = env("BACKUP_GPG_PASSPHRASE");
  if (!url || !chave || !destino || !senha) return 1;

  for (const bin of ["tar", "gpg", "aws"]) {
    try {
      sh(bin, ["--version"], { stdio: "ignore" });
    } catch {
      console.error(`ERRO: '${bin}' não encontrado no PATH.`);
      return 1;
    }
  }

  const { storage } = createClient(url, chave, { auth: { persistSession: false } });

  // 700 + remoção no finally: os arquivos em claro não sobrevivem ao script.
  const trabalho = mkdtempSync(join(tmpdir(), "dgov-storage-"));
  const carimbo = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
  const base = `despachagov-storage_${carimbo}`;
  const raiz = join(trabalho, base);

  try {
    let total = 0;
    let bytes = 0;

    for (const bucket of BUCKETS) {
      process.stdout.write(`· ${bucket}: listando… `);
      const caminhos = await listarRecursivo(storage, bucket);
      console.log(`${caminhos.length} objeto(s)`);

      for (const caminho of caminhos) {
        const { data, error } = await storage.from(bucket).download(caminho);
        if (error) throw new Error(`download ${bucket}/${caminho}: ${error.message}`);
        const destinoArquivo = join(raiz, bucket, caminho);
        mkdirSync(dirname(destinoArquivo), { recursive: true });
        const buf = Buffer.from(await data.arrayBuffer());
        writeFileSync(destinoArquivo, buf);
        total++;
        bytes += buf.length;
      }
    }

    if (total === 0) {
      // Buckets realmente vazios são plausíveis num piloto novo, mas subir um
      // arquivo vazio mascararia uma falha de credencial que devolve lista vazia.
      console.error("ERRO: nenhum objeto encontrado nos dois buckets. Confira SUPABASE_SERVICE_ROLE_KEY.");
      return 1;
    }

    console.log(`\n${total} objeto(s), ${(bytes / 1024 ** 2).toFixed(1)} MB. Compactando…`);
    const tar = `${raiz}.tar.gz`;
    sh("tar", ["-czf", tar, "-C", trabalho, base]);

    console.log("Criptografando (AES-256)…");
    const cifrado = `${tar}.gpg`;
    sh("gpg", [
      "--batch", "--yes", "--quiet",
      "--passphrase-fd", "0",
      "--symmetric", "--cipher-algo", "AES256",
      "--output", cifrado, tar,
    ], { input: senha });

    rmSync(tar, { force: true });

    const mes = carimbo.slice(0, 6);
    const alvo = `${destino.replace(/\/$/, "")}/storage/${mes.slice(0, 4)}/${mes.slice(4, 6)}/${base}.tar.gz.gpg`;
    console.log(`Enviando para ${alvo}…`);
    const args = ["s3", "cp", cifrado, alvo];
    if (process.env.AWS_ENDPOINT_URL) args.push("--endpoint-url", process.env.AWS_ENDPOINT_URL);
    sh("aws", args, { stdio: "inherit" });

    console.log(`\n✓ Backup concluído: ${(statSync(cifrado).size / 1024 ** 2).toFixed(1)} MB cifrados.`);

    if (bytes > LIMITE_AVISO_BYTES) {
      console.log(
        "\nAVISO: o volume passou de 5 GB. O snapshot completo começa a ficar caro em\n" +
        "tempo e egress — avalie migrar para backup incremental com manifesto.",
      );
    }
    console.log("\nLEMBRETE: backup sem restauração testada não é backup (docs/RESTORE.md).");
    return 0;
  } finally {
    rmSync(trabalho, { recursive: true, force: true });
  }
}

main()
  .then((codigo) => { process.exitCode = codigo; })
  .catch((e) => {
    console.error(`\nERRO: ${e.message}`);
    process.exitCode = 1;
  });
