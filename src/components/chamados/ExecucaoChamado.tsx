import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Card";
import { SignaturePad } from "./SignaturePad";
import { useAuth } from "@/hooks/useAuth";
import { transicionarChamado, type Chamado } from "@/services/chamados";
import { anexarArquivo, listarAnexos, urlAnexo, salvarAssinatura, type Anexo, type TipoAnexo } from "@/services/execucao";
import { gerarComprovantePdf } from "@/lib/comprovante";

async function urlParaDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.readAsDataURL(blob);
  });
}

export function ExecucaoChamado({
  chamado, contexto, onAtualizado,
}: {
  chamado: Chamado;
  contexto: { unidadeNome: string; empresaNome?: string | undefined; tecnicoNome?: string | undefined };
  onAtualizado: () => void;
}) {
  const { session, profile, tenantId } = useAuth();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<TipoAnexo | null>(null);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [signatario, setSignatario] = useState("");
  const [concluindo, setConcluindo] = useState(false);
  const inAntes = useRef<HTMLInputElement>(null);
  const inDepois = useRef<HTMLInputElement>(null);

  async function carregar() {
    const lista = await listarAnexos(chamado.id);
    const map: Record<string, string> = {};
    await Promise.all(lista.filter((a) => a.tipo.startsWith("foto")).map(async (a) => {
      const u = await urlAnexo(a.storage_path);
      if (u) map[a.id] = u;
    }));
    return { lista, map };
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const { lista, map } = await carregar();
      if (!ativo) return;
      setAnexos(lista);
      setThumbs(map);
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamado.id]);

  async function recarregar() {
    const { lista, map } = await carregar();
    setAnexos(lista);
    setThumbs(map);
  }

  async function enviarFoto(tipo: TipoAnexo, file: File | undefined) {
    if (!file || !tenantId || !session) return;
    setErro(null); setEnviando(tipo);
    const { error } = await anexarArquivo({ tenantId, chamadoId: chamado.id, atorId: session.user.id, tipo, file });
    setEnviando(null);
    if (error) { setErro(error); return; }
    await recarregar();
  }

  async function concluir() {
    if (!session || !profile || !tenantId) return;
    if (!assinatura) { setErro("Colete a assinatura do responsável."); return; }
    if (signatario.trim().length < 3) { setErro("Informe o nome de quem assina."); return; }
    setConcluindo(true); setErro(null);
    try {
      await salvarAssinatura({ tenantId, chamadoId: chamado.id, nome: signatario.trim(), dataUrl: assinatura });
      const { error } = await transicionarChamado(chamado, "concluido", { id: session.user.id, nome: profile.nome });
      if (error) { setErro(error); setConcluindo(false); return; }

      const fotos = await Promise.all(
        anexos.filter((a) => a.tipo.startsWith("foto")).map(async (a) => ({
          tipo: a.tipo,
          dataUrl: thumbs[a.id] ? await urlParaDataUrl(thumbs[a.id]!) : "",
        })),
      );
      await gerarComprovantePdf({
        protocolo: chamado.numero_protocolo,
        unidade: contexto.unidadeNome,
        descricao: chamado.descricao,
        urgencia: chamado.urgencia,
        empresa: contexto.empresaNome,
        tecnico: contexto.tecnicoNome,
        aberturaISO: chamado.data_solicitacao,
        conclusaoISO: new Date().toISOString(),
        assinaturaDataUrl: assinatura,
        signatarioNome: signatario.trim(),
        fotos: fotos.filter((f) => f.dataUrl),
      });
      onAtualizado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao concluir");
    } finally {
      setConcluindo(false);
    }
  }

  const fotosAntes = anexos.filter((a) => a.tipo === "foto_antes");
  const fotosDepois = anexos.filter((a) => a.tipo === "foto_depois");

  return (
    <div className="rounded-lg border border-cinza-borda p-3">
      <p className="mb-2 text-sm font-semibold text-cinza-texto">Execução em campo</p>
      {erro && <div className="mb-2"><Alert tipo="erro">{erro}</Alert></div>}

      <div className="grid grid-cols-2 gap-3">
        {([["foto_antes", "Antes", inAntes, fotosAntes], ["foto_depois", "Depois", inDepois, fotosDepois]] as const).map(
          ([tipo, label, ref, lista]) => (
            <div key={tipo}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-cinza-secundario">{label}</span>
                <button type="button" onClick={() => ref.current?.click()} className="text-xs text-azul-principal hover:underline" disabled={enviando === tipo}>
                  {enviando === tipo ? "Enviando…" : "+ Foto"}
                </button>
              </div>
              <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void enviarFoto(tipo, e.target.files?.[0])} />
              <div className="flex flex-wrap gap-1">
                {lista.map((a) => thumbs[a.id] && (
                  <img key={a.id} src={thumbs[a.id]} alt={label} className="h-14 w-14 rounded border border-cinza-borda object-cover" />
                ))}
                {lista.length === 0 && <span className="text-xs text-cinza-desabilitado">Sem foto</span>}
              </div>
            </div>
          ),
        )}
      </div>

      <hr className="my-3 border-cinza-borda" />
      <p className="mb-2 text-sm font-semibold text-cinza-texto">Concluir com atesto</p>
      <div className="mb-2"><Input label="Nome de quem assina" value={signatario} onChange={(e) => setSignatario(e.target.value)} placeholder="Responsável da unidade" /></div>
      <SignaturePad onChange={setAssinatura} />
      <Button onClick={() => void concluir()} loading={concluindo} className="mt-3 w-full">
        Concluir + gerar comprovante PDF
      </Button>
    </div>
  );
}
