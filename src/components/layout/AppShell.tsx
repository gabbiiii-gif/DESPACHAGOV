import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

// Casca mínima das áreas internas: header com marca + usuário + sair.
export function AppShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-cinza-borda bg-cinza-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="dg-wordmark text-lg">
            <span className="text-azul-principal">Despacha</span>
            <span className="text-laranja-acento">Gov</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-cinza-secundario sm:inline">{profile?.nome}</span>
          <Link to="/conta/privacidade" className="text-xs font-medium text-cinza-secundario hover:text-azul-principal">
            Meus dados
          </Link>
          <Button variant="outline" onClick={() => void signOut()} className="px-3 py-1.5 text-xs">
            Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="mb-5 font-display text-2xl font-bold text-cinza-texto">{titulo}</h1>
        {children}
      </main>
    </div>
  );
}
