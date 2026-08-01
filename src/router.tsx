import { createBrowserRouter, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoginPage } from "./pages/LoginPage";
import { RecoverPage } from "./pages/RecoverPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { SemAcessoPage } from "./pages/SemAcessoPage";
import { PoliticaPrivacidadePage } from "./pages/PoliticaPrivacidadePage";
import { TermosUsoPage } from "./pages/TermosUsoPage";
import { PrivacidadePage } from "./pages/conta/PrivacidadePage";
import { TenantsPage } from "./pages/superadmin/TenantsPage";
import { SaudePage } from "./pages/superadmin/SaudePage";
import { SecretariaShell } from "./components/layout/SecretariaShell";
import { SuperadminTenantScope } from "./components/layout/SuperadminTenantScope";
import { UnidadesPage } from "./pages/secretaria/UnidadesPage";
import { EmpresasPage } from "./pages/secretaria/EmpresasPage";
import { ChamadosPage } from "./pages/secretaria/ChamadosPage";
import { PainelPage } from "./pages/secretaria/PainelPage";
import { RelatoriosPage } from "./pages/secretaria/RelatoriosPage";
import { MapaPage } from "./pages/secretaria/MapaPage";
import { UsuariosPage } from "./pages/secretaria/UsuariosPage";
import { UnidadeChamadosPage } from "./pages/unidade/UnidadeChamadosPage";
import { EmpresaShell } from "./components/layout/EmpresaShell";
import { EmpresaChamadosPage } from "./pages/empresa/EmpresaChamadosPage";
import { ContratoPage } from "./pages/empresa/ContratoPage";
import { TecnicosPage } from "./pages/empresa/TecnicosPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const SECRETARIA_ROLES = [
  "admin_secretaria", "gestor_secretaria", "secretaria_semed", "engenheiro", "arquiteto",
] as const;
const EMPRESA_ROLES = [
  "empresa_admin", "manutencao_predial", "manutencao_refrigeracao",
  "manutencao_ar_condicionado", "instalacao_ar_condicionado",
] as const;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/recuperar-senha", element: <RecoverPage /> },
  { path: "/redefinir-senha", element: <ResetPasswordPage /> },
  { path: "/politica-privacidade", element: <PoliticaPrivacidadePage /> },
  { path: "/termos-de-uso", element: <TermosUsoPage /> },

  { path: "/", element: <ProtectedRoute><HomeRedirect /></ProtectedRoute> },
  { path: "/sem-acesso", element: <ProtectedRoute><SemAcessoPage /></ProtectedRoute> },
  { path: "/conta/privacidade", element: <ProtectedRoute><PrivacidadePage /></ProtectedRoute> },

  {
    path: "/superadmin",
    element: <ProtectedRoute roles={["superadmin"]}><ErrorBoundary feature="Superadmin"><TenantsPage /></ErrorBoundary></ProtectedRoute>,
  },
  {
    path: "/superadmin/saude",
    element: <ProtectedRoute roles={["superadmin"]}><ErrorBoundary feature="Saúde"><SaudePage /></ErrorBoundary></ProtectedRoute>,
  },
  {
    path: "/superadmin/secretaria/:tenantId",
    element: <ProtectedRoute roles={["superadmin"]}><SuperadminTenantScope /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="unidades" replace /> },
      { path: "unidades", element: <ErrorBoundary feature="Unidades"><UnidadesPage /></ErrorBoundary> },
      { path: "empresas", element: <ErrorBoundary feature="Empresas"><EmpresasPage /></ErrorBoundary> },
      { path: "usuarios", element: <ErrorBoundary feature="Usuários"><UsuariosPage /></ErrorBoundary> },
    ],
  },

  {
    path: "/secretaria",
    element: <ProtectedRoute roles={[...SECRETARIA_ROLES]}><SecretariaShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/secretaria/painel" replace /> },
      { path: "painel", element: <ErrorBoundary feature="Painel"><PainelPage /></ErrorBoundary> },
      { path: "relatorios", element: <ErrorBoundary feature="Relatórios"><RelatoriosPage /></ErrorBoundary> },
      { path: "chamados", element: <ErrorBoundary feature="Chamados"><ChamadosPage /></ErrorBoundary> },
      { path: "mapa", element: <ErrorBoundary feature="Mapa"><MapaPage /></ErrorBoundary> },
      { path: "unidades", element: <ErrorBoundary feature="Unidades"><UnidadesPage /></ErrorBoundary> },
      { path: "empresas", element: <ErrorBoundary feature="Empresas"><EmpresasPage /></ErrorBoundary> },
      // Só o Chefe de divisão (admin_secretaria) cadastra usuários.
      { path: "usuarios", element: <ProtectedRoute roles={["admin_secretaria"]}><ErrorBoundary feature="Usuários"><UsuariosPage /></ErrorBoundary></ProtectedRoute> },
    ],
  },

  {
    path: "/unidade",
    element: <ProtectedRoute roles={["responsavel_unidade"]}><ErrorBoundary feature="Meus chamados"><UnidadeChamadosPage /></ErrorBoundary></ProtectedRoute>,
  },
  {
    path: "/empresa",
    element: <ProtectedRoute roles={[...EMPRESA_ROLES]}><EmpresaShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/empresa/chamados" replace /> },
      { path: "chamados", element: <ErrorBoundary feature="Chamados"><EmpresaChamadosPage /></ErrorBoundary> },
      { path: "contrato", element: <ErrorBoundary feature="Contrato"><ContratoPage /></ErrorBoundary> },
      { path: "tecnicos", element: <ErrorBoundary feature="Técnicos"><TecnicosPage /></ErrorBoundary> },
    ],
  },
]);
