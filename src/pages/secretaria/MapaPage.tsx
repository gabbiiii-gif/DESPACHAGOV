import { MapaChamados } from "@/components/chamados/MapaChamados";
import { URGENCIAS, URGENCIA_META } from "@/lib/chamados";
import { useAuth } from "@/hooks/useAuth";

export function MapaPage() {
  const { tenantId } = useAuth();
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold text-cinza-texto">Mapa ao vivo</h1>
      <p className="mb-3 text-sm text-cinza-secundario">
        Chamados em andamento por unidade. Some automaticamente quando concluído ou cancelado.
      </p>
      <div className="mb-3 flex flex-wrap gap-3">
        {URGENCIAS.map((u) => (
          <span key={u} className="flex items-center gap-1.5 text-xs text-cinza-secundario">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: URGENCIA_META[u].cor }} />
            {URGENCIA_META[u].label}
          </span>
        ))}
      </div>
      {tenantId ? <MapaChamados tenantId={tenantId} /> : <p className="text-cinza-secundario">Sem tenant.</p>}
    </div>
  );
}
