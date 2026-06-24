import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RecoverPage } from "./pages/RecoverPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { PlaceholderDashboard } from "./pages/PlaceholderDashboard";
import { TenantsPage } from "./pages/superadmin/TenantsPage";
import { SecretariaShell } from "./components/layout/SecretariaShell";
import { UnidadesPage } from "./pages/secretaria/UnidadesPage";
import { EmpresasPage } from "./pages/secretaria/EmpresasPage";
import { EquipamentosPage } from "./pages/secretaria/EquipamentosPage";
import { ContratosPage } from "./pages/secretaria/ContratosPage";
import { ChamadosPage } from "./pages/secretaria/ChamadosPage";
import { MapaPage } from "./pages/secretaria/MapaPage";
import { UsuariosPage } from "./pages/secretaria/UsuariosPage";
import { UnidadeChamadosPage } from "./pages/unidade/UnidadeChamadosPage";
import { EmpresaShell } from "./components/layout/EmpresaShell";
import { EmpresaChamadosPage } from "./pages/empresa/EmpresaChamadosPage";
import { TecnicosPage } from "./pages/empresa/TecnicosPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const SECRETARIA_ROLES = ["admin_secretaria", "gestor_secretaria"] as const;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/recuperar-senha", element: <RecoverPage /> },
  { path: "/redefinir-senha", element: <ResetPasswordPage /> },

  { path: "/", element: <ProtectedRoute><HomeRedirect /></ProtectedRoute> },

  {
    path: "/superadmin",
    element: <ProtectedRoute roles={["superadmin"]}><TenantsPage /></ProtectedRoute>,
  },

  {
    path: "/secretaria",
    element: <ProtectedRoute roles={[...SECRETARIA_ROLES]}><SecretariaShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/secretaria/chamados" replace /> },
      { path: "chamados", element: <ChamadosPage /> },
      { path: "mapa", element: <MapaPage /> },
      { path: "unidades", element: <UnidadesPage /> },
      { path: "empresas", element: <EmpresasPage /> },
      { path: "equipamentos", element: <EquipamentosPage /> },
      { path: "contratos", element: <ContratosPage /> },
      { path: "usuarios", element: <UsuariosPage /> },
    ],
  },

  {
    path: "/unidade",
    element: <ProtectedRoute roles={["responsavel_unidade"]}><UnidadeChamadosPage /></ProtectedRoute>,
  },
  {
    path: "/empresa",
    element: <ProtectedRoute roles={["empresa_admin", "tecnico_empresa"]}><EmpresaShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/empresa/chamados" replace /> },
      { path: "chamados", element: <EmpresaChamadosPage /> },
      { path: "tecnicos", element: <ProtectedRoute roles={["empresa_admin"]}><TecnicosPage /></ProtectedRoute> },
    ],
  },
  {
    path: "/tecnico",
    element: <ProtectedRoute roles={["tecnico_empresa", "tecnico_secretaria"]}><PlaceholderDashboard titulo="Execução em campo" proximo="App do técnico com fotos e assinatura chega no Sprint 4." /></ProtectedRoute>,
  },
]);
