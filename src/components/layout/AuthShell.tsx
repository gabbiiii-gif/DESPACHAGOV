import { Suspense, lazy, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { useEntrada } from "@/hooks/useEntrada";

// Three.js só aqui e lazy-loaded (chunk separado) — não pesa o resto do app.
const HeroCanvas = lazy(() => import("@/components/visual/HeroCanvas"));

// Moldura das telas de autenticação: marca + card centralizado, mobile-first.
export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  const cardRef = useEntrada<HTMLDivElement>();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-5 py-10">
      <Suspense fallback={null}><HeroCanvas /></Suspense>

      <div className="flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <span className="dg-wordmark text-2xl">
          <span className="text-azul-principal">Despacha</span>
          <span className="text-laranja-acento">Gov</span>
        </span>
      </div>

      <div ref={cardRef} className="w-full max-w-sm">
        <div className="rounded-xl border border-cinza-borda bg-cinza-card/95 p-6 shadow-sm backdrop-blur-sm">
          <h1 className="font-display text-xl font-bold text-cinza-texto">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-cinza-secundario">{subtitulo}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>

      <p className="text-xs text-cinza-secundario">Menos papel, mais ação.</p>
    </main>
  );
}
