import { Link } from "react-router-dom";

// Rodapé global com os documentos públicos.
//
// Antes, o único link para a Política de Privacidade vivia dentro da tela
// "Meus dados" — ou seja, só existia para quem já estava logado. Quem chega na
// tela de login não tinha como ler os termos ANTES de entrar, que é justamente
// quando a leitura importa.
//
// Usa os mesmos tokens de cor em fundo claro (AppShell) e escuro (AuthShell):
// cinza-secundario tem contraste suficiente nos dois.
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`flex flex-col items-center gap-1.5 text-xs text-cinza-secundario ${className}`}>
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link to="/termos-de-uso" className="underline underline-offset-2 hover:text-cinza-texto">
          Termo de Uso
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/politica-privacidade" className="underline underline-offset-2 hover:text-cinza-texto">
          Política de Privacidade
        </Link>
      </nav>
      <p>Menos papel, mais ação.</p>
    </footer>
  );
}
