import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { consentiuVersaoVigente, registrarConsentimento } from "@/services/lgpd";
import { TERMO_SECOES, TERMO_VERSAO } from "@/lib/termo";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/layout/AuthShell";
import { Alert } from "@/components/ui/Card";

// Bloqueia o app até o usuário aceitar a versão vigente do termo LGPD.
export function LgpdGate({ children }: { children: ReactNode }) {
  const { session, tenantId } = useAuth();
  const [estado, setEstado] = useState<"checando" | "pendente" | "ok">("checando");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!session) return;
    consentiuVersaoVigente(session.user.id).then((ok) => setEstado(ok ? "ok" : "pendente"));
  }, [session]);

  async function aceitar() {
    if (!session) return;
    setSalvando(true);
    setErro(null);
    const { error } = await registrarConsentimento(session.user.id, tenantId);
    setSalvando(false);
    if (error) setErro("Não foi possível registrar o aceite. Tente novamente.");
    else setEstado("ok");
  }

  if (estado === "checando") {
    return <div className="flex min-h-dvh items-center justify-center text-cinza-secundario">Carregando…</div>;
  }

  if (estado === "pendente") {
    return (
      <AuthShell titulo="Termo de Uso e Privacidade" subtitulo={`Versão ${TERMO_VERSAO}`}>
        <div className="flex flex-col gap-4">
          {erro && <Alert tipo="erro">{erro}</Alert>}
          {/* Renderiza a MESMA fonte que /termos-de-uso e que alimenta o hash
              gravado no aceite — o que a pessoa lê é exatamente o que fica
              provado no banco. */}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-cinza-borda bg-cinza-fundo p-3 text-xs leading-relaxed text-cinza-secundario">
            {TERMO_SECOES.map((secao) => (
              <section key={secao.titulo} className="mb-3 last:mb-0">
                <h2 className="font-semibold text-cinza-texto">{secao.titulo}</h2>
                {secao.paragrafos.map((p, i) => (
                  <p key={i} className="mt-1">{p}</p>
                ))}
              </section>
            ))}
          </div>
          <p className="text-xs text-cinza-secundario">
            Também disponível em{" "}
            <Link to="/termos-de-uso" target="_blank" className="text-azul-principal underline">
              página completa
            </Link>{" "}
            e{" "}
            <Link to="/politica-privacidade" target="_blank" className="text-azul-principal underline">
              Política de Privacidade
            </Link>.
          </p>
          <Button onClick={aceitar} loading={salvando} className="w-full">
            Li e aceito o termo
          </Button>
        </div>
      </AuthShell>
    );
  }

  return <>{children}</>;
}
