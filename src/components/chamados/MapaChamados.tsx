import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { supabase } from "@/services/supabase";
import { listarChamadosAtivosComGeo, type ChamadoAtivoGeo } from "@/services/chamados";
import { URGENCIA_META, type Urgencia } from "@/lib/chamados";

const CENTRO_ALTAMIRA = { lat: -3.2031, lng: -52.2095 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

type OverlayCtor = new (pos: google.maps.LatLng, cor: string, c: ChamadoAtivoGeo) => google.maps.OverlayView;

// Normaliza qualquer cor CSS (inclusive var(--...) e oklch) para rgb().
function corCss(valor: string): string {
  const el = document.createElement("span");
  el.style.color = valor;
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c || "#2563eb";
}

// CSS dos pinos pulsantes + tooltip — injetado uma vez.
function garantirCss() {
  if (document.getElementById("dg-mapa-css")) return;
  const s = document.createElement("style");
  s.id = "dg-mapa-css";
  s.textContent = `
.dg-pin{position:absolute;transform:translate(-50%,-50%);width:16px;height:16px}
.dg-pin-dot{position:absolute;inset:0;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)}
.dg-pin-pulse{position:absolute;inset:0;border-radius:9999px;animation:dg-pulse 1.6s ease-out infinite}
@keyframes dg-pulse{0%{transform:scale(1);opacity:.65}70%{transform:scale(2.6);opacity:0}100%{opacity:0}}
.dg-tip{position:absolute;left:50%;bottom:150%;transform:translateX(-50%);display:none;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:10px;padding:8px 11px;font-size:12px;line-height:1.4;box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:50;pointer-events:none;min-width:170px;max-width:240px}
.dg-tip strong{display:block;margin-bottom:2px;color:#111827}
.dg-tip .dg-tip-l{color:#6b7280}
.dg-pin:hover{z-index:60}
.dg-pin:hover .dg-tip{display:block}
@media (prefers-reduced-motion: reduce){.dg-pin-pulse{animation:none}}
`;
  document.head.appendChild(s);
}

function linha(rotulo: string, valor: string): HTMLDivElement {
  const d = document.createElement("div");
  const r = document.createElement("span");
  r.className = "dg-tip-l";
  r.textContent = `${rotulo}: `;
  d.appendChild(r);
  d.appendChild(document.createTextNode(valor));
  return d;
}

// Cria a classe do overlay (precisa do google.maps já carregado).
function criarOverlayCtor(): OverlayCtor {
  return class PulseOverlay extends google.maps.OverlayView {
    private pos: google.maps.LatLng;
    private el: HTMLDivElement;
    constructor(pos: google.maps.LatLng, cor: string, c: ChamadoAtivoGeo) {
      super();
      this.pos = pos;
      const wrap = document.createElement("div");
      wrap.className = "dg-pin";
      const pulse = document.createElement("div");
      pulse.className = "dg-pin-pulse";
      pulse.style.background = cor;
      const dot = document.createElement("div");
      dot.className = "dg-pin-dot";
      dot.style.background = cor;
      const tip = document.createElement("div");
      tip.className = "dg-tip";
      const titulo = document.createElement("strong");
      titulo.textContent = c.unidade_nome;
      tip.appendChild(titulo);
      tip.appendChild(linha("Diretora", c.diretora_nome ?? "—"));
      tip.appendChild(linha("Contato", c.diretora_telefone ?? "—"));
      tip.appendChild(linha("Urgência", URGENCIA_META[c.urgencia as Urgencia]?.label ?? c.urgencia ?? "—"));
      wrap.append(pulse, dot, tip);
      this.el = wrap;
    }
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.el);
    }
    draw() {
      const p = this.getProjection()?.fromLatLngToDivPixel(this.pos);
      if (p) {
        this.el.style.left = `${p.x}px`;
        this.el.style.top = `${p.y}px`;
      }
    }
    onRemove() {
      this.el.remove();
    }
  };
}

// Mapa ao vivo: plota chamados em andamento na localização da unidade.
// Atualiza via Supabase Realtime — quando o chamado é concluído/cancelado,
// sai da lista de ativos e o ponto some.
export function MapaChamados({ tenantId }: { tenantId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayCtorRef = useRef<OverlayCtor | null>(null);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);
  const [pronto, setPronto] = useState(false);
  const [ativos, setAtivos] = useState<ChamadoAtivoGeo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Init do mapa (SDK do Google).
  useEffect(() => {
    if (!API_KEY) return;
    let cancelado = false;
    garantirCss();
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
        overlayCtorRef.current = criarOverlayCtor();
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

  // Redesenha os pinos pulsantes quando a lista muda.
  useEffect(() => {
    const map = mapRef.current;
    const Ctor = overlayCtorRef.current;
    if (!pronto || !map || !Ctor) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    for (const c of ativos) {
      const cor = corCss(URGENCIA_META[c.urgencia as Urgencia]?.cor ?? "var(--color-azul-info)");
      const pos = new google.maps.LatLng(c.lat, c.lng);
      const ov = new Ctor(pos, cor, c);
      ov.setMap(map);
      overlaysRef.current.push(ov);
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
