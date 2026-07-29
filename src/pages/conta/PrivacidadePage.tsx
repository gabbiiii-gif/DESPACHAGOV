import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, Alert } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import {
  montarExportacao, camposPessoais, nomeArquivoExport,
  confirmacaoExclusaoValida, CONFIRMACAO_EXCLUSAO,
  type ConsentimentoResumo, type ChamadoResumoExport,
} from "@/lib/privacidade";
import { obterConsentimentos, obterMeusChamados, excluirMinhaConta } from "@/services/privacidade";

export function PrivacidadePage() {
  const { profile, session, signOut } = useAuth();
  const [consentimentos, setConsentimentos] = useState<ConsentimentoResumo[]>([]);
  const [chamados, setChamados] = useState<ChamadoResumoExport[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

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

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExclusao(null);
    const { error } = await excluirMinhaConta(confirmacao);
    if (error) {
      setExcluindo(false);
      setErroExclusao(error);
      return;
    }
    // A sessão foi revogada no servidor. O signOut local limpa o storage e o
    // ProtectedRoute redireciona para /login — sem ele a UI ficaria com um
    // perfil em memória que não existe mais.
    await signOut();
  }

  const campos = profile ? camposPessoais(profile) : [];
  const podeConfirmar = confirmacaoExclusaoValida(confirmacao);

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
            Você pode <b>acessar</b> e <b>baixar</b> seus dados nesta tela (portabilidade) e{" "}
            <b>excluir</b> seus dados pessoais abaixo. Para <b>correção</b>, procure o administrador
            da sua Secretaria. Detalhes em{" "}
            <Link to="/politica-privacidade" className="text-azul-principal underline">Política de Privacidade</Link>.
          </p>
        </Card>

        <Card className="border-vermelho-critico/30">
          <h2 className="mb-1 text-sm font-semibold text-vermelho-critico">Excluir meus dados</h2>
          <p className="text-sm text-cinza-secundario">
            Seus dados pessoais — nome, e-mail, CPF, telefone, cargo e matrícula — são apagados e seu
            acesso é encerrado permanentemente.
          </p>
          <p className="mt-2 text-sm text-cinza-secundario">
            Os chamados que você abriu <b>continuam existindo sem o seu nome</b>. São registro de
            serviço público e a lei obriga a Secretaria a mantê-los (LGPD, art. 16, I) — mas eles
            deixam de estar ligados a você.
          </p>
          <p className="mt-2 text-sm font-medium text-cinza-texto">Esta ação não pode ser desfeita.</p>
          <Button
            variant="outline"
            onClick={() => { setConfirmacao(""); setErroExclusao(null); setModalAberto(true); }}
            className="mt-3 border-vermelho-critico/40 px-3 py-1.5 text-xs text-vermelho-critico hover:bg-vermelho-critico/5"
          >
            Excluir meus dados
          </Button>
        </Card>
      </div>

      <Modal aberto={modalAberto} titulo="Excluir meus dados" onClose={() => setModalAberto(false)}>
        <div className="flex flex-col gap-4">
          {erroExclusao && <Alert tipo="erro">{erroExclusao}</Alert>}
          <p className="text-sm text-cinza-secundario">
            Você perderá o acesso ao DespachaGov imediatamente e não será possível recuperar a conta.
            Se quiser guardar uma cópia, feche esta janela e use <b>Baixar meus dados (JSON)</b> antes.
          </p>
          <Input
            label={`Digite "${CONFIRMACAO_EXCLUSAO}" para confirmar`}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="off"
            disabled={excluindo}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalAberto(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              variant="acento"
              onClick={() => void confirmarExclusao()}
              loading={excluindo}
              disabled={!podeConfirmar}
            >
              Excluir definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
