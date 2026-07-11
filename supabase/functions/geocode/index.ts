// Edge Function: geocode
// Proxy server-side do Google Geocoding + Places. Chave (GOOGLE_MAPS_API_KEY)
// fica como secret — NUNCA vai no bundle. verify_jwt=true.
//
// Modos:
//   mode: "address" (default) → Geocoding API pelo endereço (compatível com
//     o comportamento antigo — front cai no Nominatim se der null).
//   mode: "place" → Places Text Search pelo NOME da escola + cidade. Retorna
//     o ponto do próprio edifício (rooftop), muito mais preciso do que
//     geocode de endereço, especialmente para escolas públicas já mapeadas.
//
// Resposta: { lat, lng, precisao: "rooftop"|"aproximada"|null, origem: string }
//           ou null quando nada bate.
import { comCaptura, logErro } from "../_shared/erros.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Resp = { lat: number; lng: number; precisao: "rooftop" | "aproximada" | null; origem: string } | null;

async function viaAddress(q: string, key: string): Promise<Resp> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?language=pt-BR&region=br` +
    `&address=${encodeURIComponent(q)}&key=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    status: string;
    results?: Array<{ geometry: { location: { lat: number; lng: number }; location_type?: string } }>;
  };
  if (data.status !== "OK") return null;
  const r = data.results?.[0];
  if (!r) return null;
  const t = r.geometry.location_type;
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    precisao: t === "ROOFTOP" ? "rooftop" : "aproximada",
    origem: "google-geocode",
  };
}

async function viaPlace(q: string, key: string): Promise<Resp> {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json?language=pt-BR&region=br` +
    `&query=${encodeURIComponent(q)}&key=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    status: string;
    results?: Array<{ geometry: { location: { lat: number; lng: number } }; name?: string; formatted_address?: string }>;
  };
  if (data.status !== "OK") return null;
  const r = data.results?.[0];
  if (!r) return null;
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    precisao: "rooftop", // Places aponta pro edifício
    origem: "google-places",
  };
}

Deno.serve(comCaptura("geocode", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { q?: string; mode?: "address" | "place" };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const q = (body.q ?? "").trim();
  const mode = body.mode === "place" ? "place" : "address";
  if (!q) return json(null);

  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return json(null); // sem chave → front usa Nominatim

  try {
    if (mode === "place") {
      const r = await viaPlace(q, key);
      if (r) return json(r);
      // Places não achou → tenta endereço como fallback (a `q` pode ter
      // vindo com "nome cidade", ainda dá pra tentar o geocode).
      return json(await viaAddress(q, key));
    }
    return json(await viaAddress(q, key));
  } catch (e) {
    await logErro({ fonte: "geocode", nivel: "warn", mensagem: e instanceof Error ? e.message : "fetch falhou" });
    return json(null);
  }
}));
