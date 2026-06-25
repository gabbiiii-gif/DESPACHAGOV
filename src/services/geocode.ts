// Geocoding de endereços → lat/lng.
// Usa Google Geocoding se VITE_GOOGLE_MAPS_API_KEY estiver definido (mais
// preciso); senão cai no Nominatim (OpenStreetMap, sem chave).
// Uso esperado: pontual (botão no cadastro), não em massa.

export async function geocodeEndereco(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (key) {
    try {
      const r = await geocodeGoogle(q, key);
      if (r) return r;
    } catch {
      // ignora e cai no fallback
    }
  }
  return geocodeNominatim(q);
}

async function geocodeGoogle(q: string, key: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?language=pt-BR&region=br&address=${encodeURIComponent(q)}&key=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    status: string;
    results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
  };
  if (data.status !== "OK") return null;
  const loc = data.results[0]?.geometry.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

async function geocodeNominatim(q: string): Promise<{ lat: number; lng: number } | null> {
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
