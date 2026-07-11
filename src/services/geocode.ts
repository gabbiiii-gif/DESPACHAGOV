// Geocoding de endereços → lat/lng.
// Tenta o Google via Edge Function `geocode` (a chave fica server-side, fora do
// bundle); se não houver resultado, cai no Nominatim (OpenStreetMap, sem chave).
// Uso esperado: pontual (botão no cadastro), não em massa.
import { supabase } from "./supabase";

export interface GeoResultado {
  lat: number;
  lng: number;
  precisao?: "rooftop" | "aproximada" | null;
  origem?: string;
}

export async function geocodeEndereco(query: string): Promise<GeoResultado | null> {
  const q = query.trim();
  if (!q) return null;
  // 1) Google via proxy server-side (não expõe a chave).
  try {
    const { data } = await supabase.functions.invoke<GeoResultado | null>("geocode", {
      body: { q, mode: "address" },
    });
    if (data && typeof data.lat === "number" && typeof data.lng === "number") return data;
  } catch {
    // ignora e cai no fallback
  }
  // 2) Fallback Nominatim (grátis, sem chave).
  return geocodeNominatim(q);
}

// Geocoding pelo NOME da escola (Google Places Text Search) — muito mais
// preciso do que endereço para escolas públicas, pois retorna o ponto do
// próprio edifício em vez de um ponto na rua.
export async function geocodeEscolaPorNome(
  nome: string,
  cidade?: string | null,
): Promise<GeoResultado | null> {
  const q = [nome, cidade, "escola municipal"].filter(Boolean).join(" ").trim();
  if (!q) return null;
  try {
    const { data } = await supabase.functions.invoke<GeoResultado | null>("geocode", {
      body: { q, mode: "place" },
    });
    if (data && typeof data.lat === "number" && typeof data.lng === "number") return data;
  } catch {
    // ignora
  }
  return null;
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
