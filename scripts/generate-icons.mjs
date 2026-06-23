// Gera ícones PWA (192, 512, 512-maskable) a partir de public/favicon.svg.
// Uso: npm run icons
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "public/favicon.svg"));
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const AZUL = { r: 0x24, g: 0x56, b: 0xa6, alpha: 1 };

async function gen(size, name, { maskable = false } = {}) {
  // Maskable precisa de safe-zone (~80%) + fundo sólido azul da marca.
  const pad = maskable ? Math.round(size * 0.1) : Math.round(size * 0.18);
  const glyph = await sharp(svg)
    .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: maskable ? AZUL : { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: glyph, top: pad, left: pad }])
    .png()
    .toFile(resolve(outDir, name));
  console.log("✓", name);
}

await gen(192, "icon-192.png");
await gen(512, "icon-512.png");
await gen(512, "icon-512-maskable.png", { maskable: true });
console.log("Ícones PWA gerados em public/icons/");
