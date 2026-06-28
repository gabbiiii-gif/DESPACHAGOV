import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/visual/PageTransition";
import { supabase } from "@/services/supabase";

// Superadmin gerindo os cadastros de UMA secretaria (tenant em foco).
const ITENS = ["unidades", "empresas", "usuarios"] as const;
const LABEL: Record<string, string> = {
  unidades: "Unidades",
  empresas: "Empresas",
  usuarios: "Usuários",
};

export function SuperadminTenantScope() {
  const { tenantId: param } = useParams();
  const { tenantId, setFocoTenant, signOut } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState<string | null>(null);

  // Aplica/limpa o tenant em foco conforme o :tenantId da URL.
  useEffect(() => {
    setFocoTenant(param ?? null);
    return () => setFocoTenant(null);
  }, [param, setFocoTenant]);

  // Nome da secretaria para o banner.
  useEffect(() => {
    if (!param) return;
    let ativo = true;
    void (async () => {
      const { data } = await supabase.from("tenants").select("nome_secretaria").eq("id", param).maybeSingle();
      if (ativo) setNome((data?.nome_secretaria as string | undefined) ?? null);
    })();
    return () => { ativo = false; };
  }, [param]);

  // Espera o foco ser aplicado antes de montar os filhos (efeito do filho roda
  // antes do efeito do pai; sem isso a 1ª busca sairia sem filtro de tenant).
  if (!param || tenantId !== param) {
    return <div className="grid min-h-dvh place-items-center text-cinza-secundario">Carregando…</div>;
  }

  return (
    <div className="min-h-dvh sm:flex">
      <aside className="border-b border-cinza-borda bg-cinza-card sm:w-60 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <Logo className="h-8 w-8" />
          <span className="dg-wordmark text-lg">
            <span className="text-azul-principal">Despacha</span>
            <span className="text-laranja-acento">Gov</span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:flex-col sm:overflow-visible sm:px-3">
          {ITENS.map((it) => (
            <NavLink
              key={it}
              to={`/superadmin/secretaria/${param}/${it}`}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-azul-principal text-white" : "text-cinza-texto hover:bg-cinza-fundo"
                }`
              }
            >
              {LABEL[it]}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-cinza-borda bg-laranja-acento/10 px-4 py-3 sm:px-6">
          <span className="text-sm text-cinza-texto">
            <span className="font-semibold text-laranja-acento">Modo superadmin</span>
            {" — gerenciando "}
            <span className="font-medium">{nome ?? "secretaria"}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/superadmin")} className="px-3 py-1.5 text-xs">
              Voltar
            </Button>
            <Button variant="outline" onClick={() => void signOut()} className="px-3 py-1.5 text-xs">
              Sair
            </Button>
          </div>
        </header>
        <main key={param} className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <PageTransition><Outlet /></PageTransition>
        </main>
      </div>
    </div>
  );
}
