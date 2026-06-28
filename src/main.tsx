import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { router } from "./router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { instalarReporterErros } from "./services/monitor";
import "./styles/globals.css";

instalarReporterErros();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Elemento #root não encontrado.");

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
