import { useEffect, type ReactNode } from "react";

// Modal acessível. Fecha só pelo ✕ ou Esc — toque fora NÃO fecha (evita
// perder dados de formulário por toque acidental no fundo).
// Overlay rola por inteiro: conteúdo mais alto que a tela fica 100% acessível
// (o topo nunca corta). Mobile = bottom-sheet; desktop = card centralizado.
export function Modal({ aberto, titulo, onClose, children }: { aberto: boolean; titulo: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Trava o scroll do body enquanto o modal está aberto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto, onClose]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="w-full rounded-t-2xl bg-cinza-card p-6 shadow-xl sm:max-w-lg sm:rounded-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-cinza-texto">{titulo}</h2>
            <button onClick={onClose} aria-label="Fechar" className="shrink-0 text-cinza-secundario hover:text-cinza-texto">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
