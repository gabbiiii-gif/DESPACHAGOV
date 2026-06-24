import { STATUS_META, URGENCIA_META, type Status, type Urgencia } from "@/lib/chamados";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as Status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ background: meta?.cor ?? "var(--color-cinza-secundario)" }}
    >
      {meta?.label ?? status}
    </span>
  );
}

export function UrgenciaBadge({ urgencia }: { urgencia: string }) {
  const meta = URGENCIA_META[urgencia as Urgencia];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: meta?.cor }}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta?.cor }} />
      {meta?.label ?? urgencia}
    </span>
  );
}
