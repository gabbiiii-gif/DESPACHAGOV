import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { TERMO_SECOES, TERMO_VERSAO } from "@/lib/termo";

// Termo de Uso — público. Renderiza a MESMA fonte que o LgpdGate exibe no
// aceite (TERMO_SECOES), então não existe risco de a página pública divergir do
// texto que o usuário efetivamente aceitou.
export function TermosUsoPage() {
  return (
    <div className="min-h-dvh bg-cinza-fundo">
      <header className="border-b border-cinza-borda bg-cinza-card px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="dg-wordmark text-lg">
            <span className="text-azul-principal">Despacha</span><span className="text-laranja-acento">Gov</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Termo de Uso</h1>
        <p className="mt-1 text-sm text-cinza-secundario">Versão {TERMO_VERSAO}</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-cinza-texto">
          {TERMO_SECOES.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="mb-1 font-semibold text-cinza-texto">{secao.titulo}</h2>
              {secao.paragrafos.map((p, i) => (
                <p key={i} className={i > 0 ? "mt-2" : undefined}>{p}</p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm">
          Como tratamos seus dados:{" "}
          <Link to="/politica-privacidade" className="text-azul-principal underline">Política de Privacidade</Link>
        </p>
        <p className="mt-2 text-sm">
          <Link to="/" className="text-azul-principal underline">Voltar</Link>
        </p>
      </main>
    </div>
  );
}
