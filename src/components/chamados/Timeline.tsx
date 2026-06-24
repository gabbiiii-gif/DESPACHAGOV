import { STATUS_META, type Status } from "@/lib/chamados";
import type { ChamadoEvento } from "@/services/chamados";

const EVENTO_LABEL: Record<string, string> = {
  aberto: "Chamado aberto",
  atribuido: "Atribuído à empresa",
  tecnico_designado: "Técnico designado",
  em_campo: "Técnico em campo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function Timeline({ eventos }: { eventos: ChamadoEvento[] }) {
  if (eventos.length === 0) return <p className="text-sm text-cinza-secundario">Sem eventos.</p>;
  return (
    <ol className="relative ml-2 border-l border-cinza-borda">
      {eventos.map((e) => {
        const cor = STATUS_META[e.evento as Status]?.cor ?? "var(--color-azul-info)";
        return (
          <li key={e.id} className="mb-4 ml-4">
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white" style={{ background: cor }} />
            <p className="text-sm font-medium text-cinza-texto">{EVENTO_LABEL[e.evento] ?? e.evento}</p>
            <p className="text-xs text-cinza-secundario">
              {fmt(e.created_at)}{e.ator_nome ? ` · ${e.ator_nome}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
