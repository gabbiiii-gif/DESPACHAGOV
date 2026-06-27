import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, Alert } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import {
  montarExportacao, camposPessoais, nomeArquivoExport,
  type ConsentimentoResumo, type ChamadoResumoExport,
} from "@/lib/privacidade";
import { obterConsentimentos, obterMeusChamados } from "@/services/privacidade";

export function PrivacidadePage() {
  const { profile, session } = useAuth();
  const [consentimentos, setConsentimentos] = useState<ConsentimentoResumo[]>([]);
  const [chamados, setChamados] = useState<ChamadoResumoExport[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const uid = session?.user.id;
    if (!uid) return;
    void (async () => {
      try {
        const [cs, ch] = await Promise.all([obterConsentimentos(uid), obterMeusChamados(uid)]);
        if (ativo) { setConsentimentos(cs); setChamados(ch); }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [session]);

  function baixar() {
    if (!profile) return;
    const pacote = montarExportacao(profile, consentimentos, chamados);
    const url = URL.createObjectURL(new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivoExport();
    a.click();
    URL.revokeObjectURL(url);
  }

  const campos = profile ? camposPessoais(profile) : [];

  return (
    <AppShell titulo="Meus dados (LGPD)">
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      <div className="grid gap-4">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-cinza-texto">Dados pessoais</h2>
            <Button variant="outline" onClick={baixar} disabled={!profile} className="px-3 py-1.5 text-xs">
              Baixar meus dados (JSON)
            </Button>
          </div>
          <dl className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            {campos.map((c) => (
              <div key={c.rotulo} className="flex justify-between gap-2 border-b border-cinza-borda/60 py-1">
                <dt className="text-cinza-secundario">{c.rotulo}</dt>
                <dd className="text-right font-medium text-cinza-texto">{c.valor}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-cinza-texto">Consentimentos</h2>
          {carregando ? (
            <p className="text-sm text-cinza-secundario">Carregando…</p>
          ) : consentimentos.length === 0 ? (
            <p className="text-sm text-cinza-secundario">Nenhum aceite registrado.</p>
          ) : (
            <ul className="space-y-1 text-sm text-cinza-texto">
              {consentimentos.map((c) => (
                <li key={c.aceito_em} className="flex justify-between gap-2 border-b border-cinza-borda/60 py-1">
                  <span>Termo {c.versao_termo}</span>
                  <span className="text-cinza-secundario">{new Date(c.aceito_em).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-cinza-texto">Seus direitos</h2>
          <p className="text-sm text-cinza-secundario">
            Você pode <b>acessar</b> e <b>baixar</b> seus dados nesta tela (portabilidade). Para
            <b> correção</b> ou <b>exclusão</b> (direito ao esquecimento), solicite ao administrador da
            sua Secretaria — a exclusão é mediada para preservar a integridade dos registros públicos.
            Detalhes em <Link to="/politica-privacidade" className="text-azul-principal underline">Política de Privacidade</Link>.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
