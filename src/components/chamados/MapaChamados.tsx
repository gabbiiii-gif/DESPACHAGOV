import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/services/supabase";
import { listarChamadosAtivosComGeo, type ChamadoAtivoGeo } from "@/services/chamados";
import { URGENCIA_META, STATUS_META, type Urgencia, type Status } from "@/lib/chamados";

const CENTRO_ALTAMIRA: [number, number] = [-3.2031, -52.2095];

// Mapa ao vivo: plota chamados em andamento na localização da unidade.
// Atualiza via Supabase Realtime — quando o chamado é concluído/cancelado,
// sai da lista de ativos e o ponto some.
export function MapaChamados({ tenantId }: { tenantId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [ativos, setAtivos] = useState<ChamadoAtivoGeo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Init do mapa.
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView(CENTRO_ALTAMIRA, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
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
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const pontos: [number, number][] = [];
    for (const c of ativos) {
      const cor = URGENCIA_META[c.urgencia as Urgencia]?.cor ?? "var(--color-azul-info)";
      const ll: [number, number] = [c.lat, c.lng];
      pontos.push(ll);
      L.circleMarker(ll, { radius: 9, color: "#fff", weight: 2, fillColor: cor, fillOpacity: 0.95 })
        .bindPopup(
          `<strong>${c.unidade_nome}</strong><br>${c.numero_protocolo}<br>${STATUS_META[c.status as Status]?.label ?? c.status} · ${URGENCIA_META[c.urgencia as Urgencia]?.label ?? c.urgencia}`,
        )
        .addTo(layer);
    }
    if (pontos.length) map.fitBounds(pontos, { padding: [50, 50], maxZoom: 14 });
  }, [ativos]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-cinza-secundario">{ativos.length} chamado(s) em andamento · ao vivo</span>
        <span className="flex items-center gap-1.5 text-xs text-cinza-secundario">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-verde-sucesso" /> tempo real
        </span>
      </div>
      {erro && <p className="mb-2 text-sm text-vermelho-critico">{erro}</p>}
      <div ref={ref} className="relative z-0 isolate h-[28rem] w-full overflow-hidden rounded-xl border border-cinza-borda" aria-label="Mapa ao vivo de chamados" />
    </div>
  );
}
