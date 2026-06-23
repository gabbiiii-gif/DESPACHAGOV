import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/permissions";
import { LgpdGate } from "./LgpdGate";

// Guarda de rota: exige sessão + perfil. Opcionalmente restringe por papéis.
// Envolve o conteúdo no LgpdGate (aceite obrigatório antes de usar o sistema).
export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, profile, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-cinza-secundario">Carregando…</div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Sessão sem perfil = conta órfã (sem linha em users). Bloqueia.
  if (!profile || !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-cinza-secundario">
        Conta sem perfil vinculado. Contate o administrador da Secretaria.
      </div>
    );
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <LgpdGate>{children}</LgpdGate>;
}
