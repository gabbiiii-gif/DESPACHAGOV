import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";

// Rotas do Sprint 0: landing. Rotas por role (admin-secretaria, unidade,
// empresa, tecnico, superadmin) entram a partir do Sprint 1.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
]);
