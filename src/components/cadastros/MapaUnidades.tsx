import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { Unidade } from "@/services/cadastros";

const CENTRO_ALTAMIRA = { lat: -3.2031, lng: -52.2095 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
// mapId é obrigatório para AdvancedMarkerElement (substituto do Marker
// legado, depreciado desde 21/02/2024). Se não houver Map ID próprio no
// Google Cloud, DEMO_MAP_ID é aceito para uso não-produção.
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) ?? "DEMO_MAP_ID";

interface Props {
  unidades: Unidade[];
  // Quando muda, centraliza no mapa e abre o info window da unidade focada
  // (usado ao clicar no nome da escola na lista). O `nonce` permite disparar
  // o efeito novamente ao clicar no mesmo item.
  focada?: { id: string; nonce: number } | null;
}

// AdvancedMarkerElement.position aceita LatLng | LatLngLiteral | LatLngAltitude.
// Normaliza para {lat, lng} numéricos.
function posComoLiteral(
  pos: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | null | undefined,
): google.maps.LatLngLiteral | null {
  if (!pos) return null;
  if (typeof (pos as google.maps.LatLng).lat === "function") {
    const p = pos as google.maps.LatLng;
    return { lat: p.lat(), lng: p.lng() };
  }
  const p = pos as google.maps.LatLngLiteral;
  return { lat: p.lat, lng: p.lng };
}

export function MapaUnidades({ unidades, focada }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega o SDK do Google Maps e cria o mapa (uma vez).
  useEffect(() => {
    if (!API_KEY) return;
    let cancelado = false;
    const loader = new Loader({ apiKey: API_KEY, version: "weekly" });
    Promise.all([loader.importLibrary("maps"), loader.importLibrary("marker")])
      .then(() => {
        if (cancelado || !ref.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(ref.current, {
          center: CENTRO_ALTAMIRA,
          zoom: 12,
          mapTypeId: "hybrid", // satélite + rótulos
          mapId: MAP_ID, // necessário para AdvancedMarkerElement
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });
        infoRef.current = new google.maps.InfoWindow();
        setPronto(true);
      })
      .catch(() => { if (!cancelado) setErro("Falha ao carregar o Google Maps."); });
    return () => { cancelado = true; };
  }, []);

  // Renderiza os marcadores das unidades com coordenadas.
  useEffect(() => {
    const map = mapRef.current;
    if (!pronto || !map) return;

    // Remove os markers antigos (AdvancedMarker: setar `.map = null`).
    markersRef.current.forEach((m) => { m.map = null; });
    markersRef.current.clear();

    const comGeo = unidades.filter((u) => u.lat != null && u.lng != null);
    const bounds = new google.maps.LatLngBounds();

    for (const u of comGeo) {
      const pos = { lat: u.lat as number, lng: u.lng as number };
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: pos, map, title: u.nome,
      });
      marker.addListener("click", () => {
        const div = document.createElement("div");
        const titulo = document.createElement("strong");
        titulo.textContent = u.nome;
        div.appendChild(titulo);
        if (u.bairro) {
          div.appendChild(document.createElement("br"));
          div.appendChild(document.createTextNode(u.bairro));
        }
        infoRef.current?.setContent(div);
        // AdvancedMarkerElement funciona como âncora do InfoWindow via
        // `anchor: marker` em vez do 2º argumento posicional.
        infoRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.set(u.id, marker);
      bounds.extend(pos);
    }

    if (comGeo.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(16);
    } else if (comGeo.length > 1) {
      map.fitBounds(bounds, 48);
    }
  }, [unidades, pronto]);

  // Foco em uma unidade específica (clique no nome da escola): centraliza,
  // abre o info window e rola o mapa para dentro da viewport.
  useEffect(() => {
    if (!pronto || !focada) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(focada.id);
    if (!map || !marker) return;
    const pos = posComoLiteral(marker.position);
    if (!pos) return;
    map.panTo(pos);
    map.setZoom(17);
    google.maps.event.trigger(marker, "click");
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focada, pronto]);

  const aviso = !API_KEY
    ? "Mapa indisponível: defina VITE_GOOGLE_MAPS_API_KEY no ambiente."
    : erro;
  if (aviso) {
    return (
      <div className="flex h-[22.5rem] w-full items-center justify-center rounded-xl border border-cinza-borda bg-cinza-fundo p-4 text-center text-sm text-cinza-secundario sm:h-[25rem] lg:h-[30rem]">
        {aviso}
      </div>
    );
  }

  return <div ref={ref} className="relative z-0 isolate h-[22.5rem] w-full overflow-hidden rounded-xl border border-cinza-borda sm:h-[25rem] lg:h-[30rem]" aria-label="Mapa de unidades" />;
}
