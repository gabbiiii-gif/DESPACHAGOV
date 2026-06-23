// Resolução de subdomínio do tenant a partir do hostname.
// Produção: semed-altamira.despachagov.com.br → "semed-altamira".
// Dev: localhost (sem subdomínio) → null; suporta override ?tenant=slug.

const BASE_HOSTS = ["despachagov.com.br", "localhost", "127.0.0.1"];
const RESERVADOS = new Set(["www", "app", "admin", "api"]);

export function resolverSubdomain(
  hostname: string = window.location.hostname,
  search: string = window.location.search,
): string | null {
  // Override de dev: ?tenant=slug
  const q = new URLSearchParams(search).get("tenant");
  if (q) return normalizar(q);

  const host = hostname.toLowerCase();
  const base = BASE_HOSTS.find((b) => host === b || host.endsWith(`.${b}`));
  if (!base || host === base) return null;

  const sub = host.slice(0, host.length - base.length - 1); // remove ".base"
  if (!sub || RESERVADOS.has(sub)) return null;
  // Pega só o primeiro rótulo (ex.: a.b.despachagov.com.br → "a")
  const first = sub.split(".")[0] ?? "";
  return first ? normalizar(first) : null;
}

function normalizar(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}
