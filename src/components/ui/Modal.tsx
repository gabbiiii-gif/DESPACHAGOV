import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Modal acessível. Fecha só pelo ✕ ou Esc — toque fora NÃO fecha (evita
// perder dados de formulário por toque acidental no fundo).
// Layout: card limitado à altura da tela, com HEADER FIXO e CORPO ROLÁVEL —
// o título e o ✕ ficam sempre visíveis e o conteúdo longo rola por dentro.
// Mobile = bottom-sheet; desktop = card centralizado.
// Renderizado via portal no <body> — assim o position:fixed se ancora na
// viewport mesmo quando há um ancestral com transform (ex.: animações GSAP),
// garantindo a centralização correta.
export function Modal({ aberto, titulo, onClose, children }: { aberto: boolean; titulo: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto, onClose]);

  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="flex max-h-[100dvh] w-full flex-col rounded-t-2xl bg-cinza-card shadow-xl sm:max-h-[90dvh] sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-cinza-borda px-6 py-4">
          <h2 className="font-display text-lg font-bold text-cinza-texto">{titulo}</h2>
          <button onClick={onClose} aria-label="Fechar" className="shrink-0 text-xl leading-none text-cinza-secundario hover:text-cinza-texto">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
