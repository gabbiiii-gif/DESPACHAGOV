import { useEffect, type ReactNode } from "react";

// Modal acessível simples (Esc fecha, backdrop fecha, foco contido no card).
export function Modal({ aberto, titulo, onClose, children }: { aberto: boolean; titulo: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto, onClose]);

  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-cinza-card p-6 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-cinza-texto">{titulo}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-cinza-secundario hover:text-cinza-texto">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
