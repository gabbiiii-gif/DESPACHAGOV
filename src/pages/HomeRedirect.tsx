import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { homeRouteForRole } from "@/lib/auth";

// Rota "/" autenticada: redireciona para a home do papel do usuário.
export function HomeRedirect() {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  return <Navigate to={homeRouteForRole(role)} replace />;
}
