import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { Unidade } from "@/services/cadastros";

const CENTRO_ALTAMIRA = { lat: -3.2031, lng: -52.2095 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function MapaUnidades({ unidades }: { unidades: Unidade[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
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

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const comGeo = unidades.filter((u) => u.lat != null && u.lng != null);
    const bounds = new google.maps.LatLngBounds();

    for (const u of comGeo) {
      const pos = { lat: u.lat as number, lng: u.lng as number };
      const marker = new google.maps.Marker({ position: pos, map, title: u.nome });
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
        infoRef.current?.open(map, marker);
      });
      markersRef.current.push(marker);
      bounds.extend(pos);
    }

    if (comGeo.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(16);
    } else if (comGeo.length > 1) {
      map.fitBounds(bounds, 48);
    }
  }, [unidades, pronto]);

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
