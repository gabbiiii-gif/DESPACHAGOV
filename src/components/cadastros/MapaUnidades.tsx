import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Unidade } from "@/services/cadastros";

// Corrige ícones padrão do Leaflet sob bundler (paths quebram no Vite).
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CENTRO_ALTAMIRA: [number, number] = [-3.2031, -52.2095];

export function MapaUnidades({ unidades }: { unidades: Unidade[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView(CENTRO_ALTAMIRA, 12);

    // Camada de ruas (OpenStreetMap).
    const ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    });

    // Satélite do Google (lyrs=y = híbrido: imagem + ruas/rótulos). Melhor
    // cobertura em Altamira/Amazônia que o Esri.
    const satelite = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "Imagery © Google",
      maxZoom: 20,
    });

    // Esri World Imagery (grátis, sem chave) — alternativa; cobertura irregular
    // no interior da Amazônia.
    const satEsri = L.layerGroup([
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
        maxZoom: 19,
        maxNativeZoom: 17,
      }),
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        maxNativeZoom: 17,
      }),
    ]);

    satelite.addTo(map); // satélite (Google) por padrão
    L.control.layers(
      { "Satélite": satelite, "Satélite (Esri)": satEsri, "Ruas": ruas },
      undefined,
      { position: "topright" },
    ).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const comGeo = unidades.filter((u) => u.lat != null && u.lng != null);
    const pontos: [number, number][] = [];
    for (const u of comGeo) {
      const ll: [number, number] = [u.lat as number, u.lng as number];
      pontos.push(ll);
      L.marker(ll, { icon }).bindPopup(`<strong>${u.nome}</strong><br>${u.bairro ?? ""}`).addTo(layer);
    }
    if (pontos.length) map.fitBounds(pontos, { padding: [40, 40], maxZoom: 14 });
  }, [unidades]);

  return <div ref={ref} className="relative z-0 isolate h-72 w-full overflow-hidden rounded-xl border border-cinza-borda sm:h-80 lg:h-96" aria-label="Mapa de unidades" />;
}
