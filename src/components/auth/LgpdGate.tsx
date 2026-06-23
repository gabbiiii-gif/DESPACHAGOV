import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { consentiuVersaoVigente, registrarConsentimento } from "@/services/lgpd";
import { TERMO_LGPD_VERSAO } from "@/lib/auth";
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
      <AuthShell titulo="Termo de Uso e Privacidade" subtitulo={`Versão ${TERMO_LGPD_VERSAO}`}>
        <div className="flex flex-col gap-4">
          {erro && <Alert tipo="erro">{erro}</Alert>}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-cinza-borda bg-cinza-fundo p-3 text-xs leading-relaxed text-cinza-secundario">
            <p>
              Ao continuar, você concorda com o tratamento de dados pessoais conforme a Lei nº 13.709/2018 (LGPD),
              exclusivamente para a gestão de demandas de manutenção das unidades públicas. Os dados são isolados por
              órgão contratante e usados para fins de execução contratual, auditoria e prestação de contas.
            </p>
            <p className="mt-2">
              Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pela tela “Meus dados”.
            </p>
          </div>
          <Button onClick={aceitar} loading={salvando} className="w-full">
            Li e aceito o termo
          </Button>
        </div>
      </AuthShell>
    );
  }

  return <>{children}</>;
}
