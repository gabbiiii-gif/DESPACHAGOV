// Geocoding via Nominatim (OpenStreetMap) — sem chave de API.
// Política de uso: ~1 req/s, identifique a aplicação. Uso esperado: pontual
// (botão "buscar coordenadas" na abertura de cadastro), não em massa.

export async function geocodeEndereco(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
  const resp = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
  if (!resp.ok) return null;
  const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
  const hit = data[0];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}
