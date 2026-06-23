import { Logo } from "./components/ui/Logo";

// Landing placeholder do Sprint 0. Valida design tokens + fontes + build PWA.
export function App() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo className="h-20 w-20" />

      <div>
        <h1 className="dg-wordmark text-5xl sm:text-6xl">
          <span className="text-azul-principal">Despacha</span>
          <span className="text-laranja-acento">Gov</span>
        </h1>
        <p className="mt-3 text-lg text-cinza-secundario">Menos papel, mais ação.</p>
      </div>

      <p className="max-w-xl text-cinza-texto">
        Secretaria abre, empresa recebe, técnico executa e comprova. Tudo dentro do sistema.
      </p>

      <span className="rounded-full bg-azul-principal/10 px-4 py-1.5 text-sm font-semibold text-azul-principal">
        Sprint 0 — setup concluído
      </span>
    </main>
  );
}
