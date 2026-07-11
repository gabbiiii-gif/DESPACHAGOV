import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const CENTRO_ALTAMIRA = { lat: -3.2031, lng: -52.2095 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Props {
  lat: number | null;
  lng: number | null;
  // Callback chamado a cada arrasto/click no mapa — o pai grava lat/lng.
  onChange: (lat: number, lng: number) => void;
  altura?: string;
}

// Mapa compacto para o editor de unidade: mostra 1 marker arrastável na
// posição atual, permite mover ou clicar em qualquer ponto do satélite
// para reposicionar. Usado depois do "Localizar pelo nome/endereço" para
// ajuste fino em cima do prédio da escola.
export function PinPickerMap({ lat, lng, onChange, altura = "18rem" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Inicializa o SDK e o mapa uma vez.
  useEffect(() => {
    if (!API_KEY || !ref.current) return;
    let cancelado = false;
    const loader = new Loader({ apiKey: API_KEY, version: "weekly" });
    Promise.all([loader.importLibrary("maps"), loader.importLibrary("marker")])
      .then(() => {
        if (cancelado || !ref.current || mapRef.current) return;
        const center = lat != null && lng != null ? { lat, lng } : CENTRO_ALTAMIRA;
        mapRef.current = new google.maps.Map(ref.current, {
          center,
          zoom: lat != null && lng != null ? 18 : 13,
          mapTypeId: "hybrid",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
        });
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: center,
          draggable: true,
          title: "Arraste para ajustar a posição",
        });
        markerRef.current.addListener("dragend", () => {
          const pos = markerRef.current!.getPosition();
          if (pos) onChange(pos.lat(), pos.lng());
        });
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          markerRef.current!.setPosition(e.latLng);
          onChange(e.latLng.lat(), e.latLng.lng());
        });
      })
      .catch(() => { /* sem mapa → editor continua funcionando com os inputs */ });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reage a mudanças externas de lat/lng (ex.: clique no botão "Localizar
  // pelo nome" que preencheu novos valores) para reposicionar o pino.
  useEffect(() => {
    const map = mapRef.current, marker = markerRef.current;
    if (!map || !marker || lat == null || lng == null) return;
    const pos = { lat, lng };
    marker.setPosition(pos);
    map.panTo(pos);
    if (map.getZoom()! < 17) map.setZoom(18);
  }, [lat, lng]);

  if (!API_KEY) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-cinza-borda bg-cinza-fundo text-xs text-cinza-secundario">
        Mapa indisponível (VITE_GOOGLE_MAPS_API_KEY ausente).
      </div>
    );
  }
  return (
    <div>
      <div ref={ref} style={{ height: altura }} className="w-full overflow-hidden rounded-lg border border-cinza-borda" aria-label="Ajuste da posição no mapa" />
      <p className="mt-1 text-xs text-cinza-secundario">Arraste o pino ou clique no mapa (satélite) para posicionar exatamente sobre o prédio da escola.</p>
    </div>
  );
}
