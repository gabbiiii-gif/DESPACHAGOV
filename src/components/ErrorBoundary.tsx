import { Component, type ErrorInfo, type ReactNode } from "react";
import { supabase } from "@/services/supabase";

interface Props {
  children: ReactNode;
}
interface State {
  erro: boolean;
}

// Captura erros de render do React, registra em error_log (Edge Function
// log-erro) e mostra um fallback amigável em vez de tela branca.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false };

  static getDerivedStateFromError(): State {
    return { erro: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void supabase.functions
      .invoke("log-erro", {
        body: {
          fonte: "front-boundary",
          nivel: "error",
          mensagem: error.message || "Erro de render",
          contexto: {
            stack: error.stack?.slice(0, 1000),
            componente: info.componentStack?.slice(0, 1000),
            url: typeof location !== "undefined" ? location.pathname : "",
          },
        },
      })
      .catch(() => {});
  }

  render(): ReactNode {
    if (this.state.erro) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-lg font-bold text-cinza-texto">Algo deu errado.</p>
          <p className="text-sm text-cinza-secundario">A falha foi registrada. Tente recarregar a página.</p>
          <button
            onClick={() => location.reload()}
            className="rounded-lg bg-azul-principal px-4 py-2 text-sm font-semibold text-white hover:bg-azul-escuro"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
