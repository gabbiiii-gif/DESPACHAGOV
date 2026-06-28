// Edge Function: geocode
// Proxy server-side do Google Geocoding. A chave (GOOGLE_MAPS_API_KEY) fica como
// secret do projeto — NÃO vai no bundle do front. verify_jwt=true: só usuário
// autenticado geocodifica. Retorna { lat, lng } ou null (front cai no Nominatim).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { q?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const q = (body.q ?? "").trim();
  if (!q) return json(null);

  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return json(null); // sem chave → front usa Nominatim

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?language=pt-BR&region=br` +
    `&address=${encodeURIComponent(q)}&key=${key}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return json(null);
    const data = (await resp.json()) as {
      status: string;
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status !== "OK") return json(null);
    const loc = data.results?.[0]?.geometry.location;
    return json(loc ? { lat: loc.lat, lng: loc.lng } : null);
  } catch {
    return json(null);
  }
});
