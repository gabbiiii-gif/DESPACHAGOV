import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RecoverPage } from "./pages/RecoverPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { PlaceholderDashboard } from "./pages/PlaceholderDashboard";
import { TenantsPage } from "./pages/superadmin/TenantsPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/recuperar-senha", element: <RecoverPage /> },
  { path: "/redefinir-senha", element: <ResetPasswordPage /> },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomeRedirect />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superadmin",
    element: (
      <ProtectedRoute roles={["superadmin"]}>
        <TenantsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/secretaria",
    element: (
      <ProtectedRoute roles={["admin_secretaria", "gestor_secretaria"]}>
        <PlaceholderDashboard titulo="Painel da Secretaria" proximo="Cadastros, chamados e KPIs chegam nos Sprints 2–6." />
      </ProtectedRoute>
    ),
  },
  {
    path: "/unidade",
    element: (
      <ProtectedRoute roles={["responsavel_unidade"]}>
        <PlaceholderDashboard titulo="Minha Unidade" proximo="Abertura de chamados em 3 cliques chega no Sprint 3." />
      </ProtectedRoute>
    ),
  },
  {
    path: "/empresa",
    element: (
      <ProtectedRoute roles={["empresa_admin"]}>
        <PlaceholderDashboard titulo="Empresa prestadora" proximo="Inbox de chamados e atribuição de técnico chegam no Sprint 3." />
      </ProtectedRoute>
    ),
  },
  {
    path: "/tecnico",
    element: (
      <ProtectedRoute roles={["tecnico_empresa", "tecnico_secretaria"]}>
        <PlaceholderDashboard titulo="Execução em campo" proximo="App do técnico com fotos e assinatura chega no Sprint 4." />
      </ProtectedRoute>
    ),
  },
]);
