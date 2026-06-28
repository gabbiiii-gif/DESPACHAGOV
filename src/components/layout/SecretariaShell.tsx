import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/visual/PageTransition";

const NAV = [
  { to: "/secretaria/painel", label: "Painel" },
  { to: "/secretaria/chamados", label: "Chamados" },
  { to: "/secretaria/mapa", label: "Mapa ao vivo" },
  { to: "/secretaria/unidades", label: "Unidades" },
  { to: "/secretaria/empresas", label: "Empresas" },
  { to: "/secretaria/usuarios", label: "Usuários", adminOnly: true },
];

// Casca da área da Secretaria: nav (sidebar no desktop, topo no mobile) + Outlet.
export function SecretariaShell() {
  const { profile, role, signOut } = useAuth();
  const nav = NAV.filter((n) => !n.adminOnly || role === "admin_secretaria");
  return (
    <div className="min-h-dvh sm:flex">
      <aside className="border-b border-cinza-borda bg-cinza-card sm:w-60 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <Logo className="h-8 w-8" />
          <span className="dg-wordmark text-lg">
            <span className="text-azul-principal">Despacha</span>
            <span className="text-laranja-acento">Gov</span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:flex-col sm:overflow-visible sm:px-3">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-azul-principal text-white"
                    : "text-cinza-texto hover:bg-cinza-fundo"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-cinza-borda bg-cinza-card px-4 py-3 sm:px-6">
          <span className="text-sm text-cinza-secundario">{profile?.nome}</span>
          <div className="flex items-center gap-3">
            <NavLink to="/conta/privacidade" className="text-xs font-medium text-cinza-secundario hover:text-azul-principal">Meus dados</NavLink>
            <Button variant="outline" onClick={() => void signOut()} className="px-3 py-1.5 text-xs">
              Sair
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <PageTransition><Outlet /></PageTransition>
        </main>
      </div>
    </div>
  );
}
