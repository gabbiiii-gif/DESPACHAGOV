import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { supabase } from "@/services/supabase";
import { listarChamadosAtivosComGeo, type ChamadoAtivoGeo } from "@/services/chamados";
import { URGENCIA_META, STATUS_META, type Urgencia, type Status } from "@/lib/chamados";

const CENTRO_ALTAMIRA = { lat: -3.2031, lng: -52.2095 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// Normaliza qualquer cor CSS (inclusive var(--...) e oklch) para rgb(), que o
// Google Maps aceita em ícones.
function corCss(valor: string): string {
  const el = document.createElement("span");
  el.style.color = valor;
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c || "#2563eb";
}

// Mapa ao vivo: plota chamados em andamento na localização da unidade.
// Atualiza via Supabase Realtime — quando o chamado é concluído/cancelado,
// sai da lista de ativos e o ponto some.
export function MapaChamados({ tenantId }: { tenantId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [pronto, setPronto] = useState(false);
  const [ativos, setAtivos] = useState<ChamadoAtivoGeo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Init do mapa (SDK do Google).
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
          mapTypeId: "hybrid",
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

  // Carga inicial + assinatura Realtime (refetch a cada mudança no tenant).
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const d = await listarChamadosAtivosComGeo();
        if (ativo) setAtivos(d);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro");
      }
    };
    void carregar();

    const channel = supabase
      .channel("mapa-chamados")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chamados", filter: `tenant_id=eq.${tenantId}` },
        () => void carregar(),
      )
      .subscribe();

    return () => {
      ativo = false;
      void supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Redesenha os marcadores quando a lista muda.
  useEffect(() => {
    const map = mapRef.current;
    if (!pronto || !map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    for (const c of ativos) {
      const cor = corCss(URGENCIA_META[c.urgencia as Urgencia]?.cor ?? "var(--color-azul-info)");
      const pos = { lat: c.lat, lng: c.lng };
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: c.unidade_nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: cor,
          fillOpacity: 0.95,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        const div = document.createElement("div");
        const t = document.createElement("strong");
        t.textContent = c.unidade_nome;
        div.appendChild(t);
        const det = `${c.numero_protocolo} · ${STATUS_META[c.status as Status]?.label ?? c.status} · ${URGENCIA_META[c.urgencia as Urgencia]?.label ?? c.urgencia}`;
        div.appendChild(document.createElement("br"));
        div.appendChild(document.createTextNode(det));
        infoRef.current?.setContent(div);
        infoRef.current?.open(map, marker);
      });
      markersRef.current.push(marker);
      bounds.extend(pos);
    }

    if (ativos.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    } else if (ativos.length > 1) {
      map.fitBounds(bounds, 56);
    }
  }, [ativos, pronto]);

  const aviso = !API_KEY
    ? "Mapa indisponível: defina VITE_GOOGLE_MAPS_API_KEY no ambiente."
    : erro;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-cinza-secundario">{ativos.length} chamado(s) em andamento · ao vivo</span>
        <span className="flex items-center gap-1.5 text-xs text-cinza-secundario">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-verde-sucesso" /> tempo real
        </span>
      </div>
      {aviso ? (
        <div className="flex h-[35rem] w-full items-center justify-center rounded-xl border border-cinza-borda bg-cinza-fundo p-4 text-center text-sm text-cinza-secundario">
          {aviso}
        </div>
      ) : (
        <div ref={ref} className="relative z-0 isolate h-[35rem] w-full overflow-hidden rounded-xl border border-cinza-borda" aria-label="Mapa ao vivo de chamados" />
      )}
    </div>
  );
}
