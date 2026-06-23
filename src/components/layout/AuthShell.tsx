import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

// Moldura das telas de autenticação: marca + card centralizado, mobile-first.
export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <span className="dg-wordmark text-2xl">
          <span className="text-azul-principal">Despacha</span>
          <span className="text-laranja-acento">Gov</span>
        </span>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-cinza-borda bg-cinza-card p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold text-cinza-texto">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-cinza-secundario">{subtitulo}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>

      <p className="text-xs text-cinza-secundario">Menos papel, mais ação.</p>
    </main>
  );
}
