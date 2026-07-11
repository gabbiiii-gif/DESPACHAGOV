import { Component, type ErrorInfo, type ReactNode } from "react";
import { supabase } from "@/services/supabase";
import { redigirTexto, redigirValor } from "@/lib/lgpd";

interface Props {
  children: ReactNode;
  // Nome da feature (ex.: "Chamados", "Relatorios"). Usado no fallback e no
  // log — permite localizar a origem sem ler stack.
  feature?: string;
  // Opcional: fallback customizado. Se ausente, usa o padrao ThemeGov.
  fallback?: (ctx: { erro: Error | null; resetar: () => void; feature?: string }) => ReactNode;
}
interface State {
  erro: Error | null;
}

// Captura erros de render do React, registra em error_log (Edge Function
// log-erro) e mostra um fallback amigavel em vez de tela branca.
//
// Pode ser aninhado: um boundary global cobre a app inteira, boundaries
// menores em cada feature (Chamados, Relatorios, etc.) permitem que uma
// falha isolada NAO derrube a navegacao completa — o usuario ainda pode
// mudar de secao pela sidebar. O "Tentar de novo" reseta o estado do
// boundary; se o erro era transitorio (rede/cold start), a re-renderizacao
// resolve sem recarregar a pagina.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Redige PII eventualmente presente na mensagem/stack antes de logar.
    void supabase.functions
      .invoke("log-erro", {
        body: {
          fonte: "front-boundary",
          nivel: "error",
          mensagem: redigirTexto(error.message || "Erro de render"),
          contexto: redigirValor({
            feature: this.props.feature ?? "global",
            stack: error.stack?.slice(0, 1500),
            componente: info.componentStack?.slice(0, 1500),
            url: typeof location !== "undefined" ? location.pathname : "",
          }) as Record<string, unknown>,
        },
      })
      .catch(() => {});
  }

  private resetar = () => this.setState({ erro: null });

  render(): ReactNode {
    if (this.state.erro) {
      if (this.props.fallback) {
        return this.props.fallback({ erro: this.state.erro, resetar: this.resetar, feature: this.props.feature });
      }
      return (
        <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div aria-hidden className="mb-1 text-3xl">⚠️</div>
          <p className="font-display text-lg font-bold text-cinza-texto">
            {this.props.feature ? `Falha em ${this.props.feature}.` : "Algo deu errado."}
          </p>
          <p className="max-w-md text-sm text-cinza-secundario">
            A falha foi registrada. Você pode tentar de novo — se persistir, recarregue a página ou avise a equipe.
          </p>
          <div className="flex gap-2">
            <button
              onClick={this.resetar}
              className="rounded-lg bg-azul-principal px-4 py-2 text-sm font-semibold text-white hover:bg-azul-escuro"
            >
              Tentar de novo
            </button>
            <button
              onClick={() => location.reload()}
              className="rounded-lg border border-cinza-borda bg-white px-4 py-2 text-sm font-semibold text-cinza-texto hover:bg-cinza-fundo"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
