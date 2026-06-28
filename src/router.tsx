import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RecoverPage } from "./pages/RecoverPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { SemAcessoPage } from "./pages/SemAcessoPage";
import { PoliticaPrivacidadePage } from "./pages/PoliticaPrivacidadePage";
import { PrivacidadePage } from "./pages/conta/PrivacidadePage";
import { TenantsPage } from "./pages/superadmin/TenantsPage";
import { SecretariaShell } from "./components/layout/SecretariaShell";
import { SuperadminTenantScope } from "./components/layout/SuperadminTenantScope";
import { UnidadesPage } from "./pages/secretaria/UnidadesPage";
import { EmpresasPage } from "./pages/secretaria/EmpresasPage";
import { ChamadosPage } from "./pages/secretaria/ChamadosPage";
import { PainelPage } from "./pages/secretaria/PainelPage";
import { MapaPage } from "./pages/secretaria/MapaPage";
import { UsuariosPage } from "./pages/secretaria/UsuariosPage";
import { UnidadeChamadosPage } from "./pages/unidade/UnidadeChamadosPage";
import { EmpresaShell } from "./components/layout/EmpresaShell";
import { EmpresaChamadosPage } from "./pages/empresa/EmpresaChamadosPage";
import { ContratoPage } from "./pages/empresa/ContratoPage";
import { TecnicosPage } from "./pages/empresa/TecnicosPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const SECRETARIA_ROLES = ["admin_secretaria", "gestor_secretaria"] as const;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/recuperar-senha", element: <RecoverPage /> },
  { path: "/redefinir-senha", element: <ResetPasswordPage /> },
  { path: "/politica-privacidade", element: <PoliticaPrivacidadePage /> },

  { path: "/", element: <ProtectedRoute><HomeRedirect /></ProtectedRoute> },
  { path: "/sem-acesso", element: <ProtectedRoute><SemAcessoPage /></ProtectedRoute> },
  { path: "/conta/privacidade", element: <ProtectedRoute><PrivacidadePage /></ProtectedRoute> },

  {
    path: "/superadmin",
    element: <ProtectedRoute roles={["superadmin"]}><TenantsPage /></ProtectedRoute>,
  },
  {
    path: "/superadmin/secretaria/:tenantId",
    element: <ProtectedRoute roles={["superadmin"]}><SuperadminTenantScope /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="unidades" replace /> },
      { path: "unidades", element: <UnidadesPage /> },
      { path: "empresas", element: <EmpresasPage /> },
      { path: "usuarios", element: <UsuariosPage /> },
    ],
  },

  {
    path: "/secretaria",
    element: <ProtectedRoute roles={[...SECRETARIA_ROLES]}><SecretariaShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/secretaria/painel" replace /> },
      { path: "painel", element: <PainelPage /> },
      { path: "chamados", element: <ChamadosPage /> },
      { path: "mapa", element: <MapaPage /> },
      { path: "unidades", element: <UnidadesPage /> },
      { path: "empresas", element: <EmpresasPage /> },
      { path: "usuarios", element: <UsuariosPage /> },
    ],
  },

  {
    path: "/unidade",
    element: <ProtectedRoute roles={["responsavel_unidade"]}><UnidadeChamadosPage /></ProtectedRoute>,
  },
  {
    path: "/empresa",
    element: <ProtectedRoute roles={["empresa_admin"]}><EmpresaShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/empresa/chamados" replace /> },
      { path: "chamados", element: <EmpresaChamadosPage /> },
      { path: "contrato", element: <ContratoPage /> },
      { path: "tecnicos", element: <TecnicosPage /> },
    ],
  },
]);
