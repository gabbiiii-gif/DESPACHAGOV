import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, UrgenciaBadge } from "@/components/chamados/Badges";
import { Timeline } from "@/components/chamados/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { listarUnidades, type Unidade } from "@/services/cadastros";
import {
  listarChamados, abrirChamado, listarEventos, type Chamado, type ChamadoEvento,
} from "@/services/chamados";
import { anexarArquivo } from "@/services/execucao";
import { validarAnexosAbertura } from "@/lib/anexos";
import { resolverUnidadesAbertura } from "@/lib/unidadesAbertura";
import { useOutbox } from "@/hooks/useOutbox";
import { enfileirar } from "@/services/outbox";
import { criarJobAbertura, ehErroDeRede, rotuloPendentes } from "@/lib/outbox";

const CACHE_UNIDADES = "despachagov-unidades-cache";

// Unidades em cache p/ o select da abertura funcionar offline.
function lerCacheUnidades(): Unidade[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_UNIDADES) ?? "[]") as Unidade[];
  } catch {
    return [];
  }
}

export function UnidadeChamadosPage() {
  const { tenantId, session, profile } = useAuth();
  const { online, pendentes, sincronizando, sincronizarAgora } = useOutbox();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // form abrir
  const [abrir, setAbrir] = useState(false);
  const [unidadeId, setUnidadeId] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // detalhe
  const [detalhe, setDetalhe] = useState<Chamado | null>(null);
  const [eventos, setEventos] = useState<ChamadoEvento[]>([]);

  // Escolas do diretor: 1 → trava (sem escolher); 2+ → só as dele; 0 → todas (legado).
  const resolucao = useMemo(
    () => resolverUnidadesAbertura(unidades, profile?.id ?? ""),
    [unidades, profile?.id],
  );
  // No modo travado o id vem da única escola; senão, do que foi escolhido no select.
  const unidadeIdEfetivo = resolucao.modo === "travado" ? resolucao.unidade.id : unidadeId;

  async function recarregar() {
    try {
      const [ch, un] = await Promise.all([listarChamados(), listarUnidades()]);
      setChamados(ch); setUnidades(un);
      localStorage.setItem(CACHE_UNIDADES, JSON.stringify(un));
    } catch (e) {
      // Offline: mantém o select da abertura com as unidades em cache.
      const cache = lerCacheUnidades();
      if (cache.length) setUnidades(cache);
      setErro(e instanceof Error ? e.message : "Erro");
    } finally { setCarregando(false); }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [ch, un] = await Promise.all([listarChamados(), listarUnidades()]);
        if (ativo) {
          setChamados(ch); setUnidades(un);
          localStorage.setItem(CACHE_UNIDADES, JSON.stringify(un));
        }
      } catch (e) {
        const cache = lerCacheUnidades();
        if (ativo) {
          if (cache.length) setUnidades(cache);
          setErro(e instanceof Error ? e.message : "Erro");
        }
      } finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, []);

  function fecharEResetar() {
    setAbrir(false); setDescricao(""); setArquivos([]); setUnidadeId("");
  }

  async function onAbrir() {
    setErro(null); setAviso(null);
    if (!tenantId || !session || !profile) return;
    if (!unidadeIdEfetivo) { setErro("Selecione a unidade."); return; }
    if (descricao.trim().length < 5) { setErro("Descreva o problema (mín. 5 caracteres)."); return; }
    const val = validarAnexosAbertura(arquivos);
    if (!val.ok) { setErro(val.erro ?? "Anexo inválido."); return; }
    setSalvando(true);

    const dados = {
      tenant_id: tenantId,
      unidade_id: unidadeIdEfetivo,
      unidade_nome: nomeUnidade(unidadeIdEfetivo),
      descricao: descricao.trim(),
      solicitante_id: session.user.id,
      solicitante_nome: profile.nome,
    };
    const guardarOffline = async (msg: string) => {
      await enfileirar(
        criarJobAbertura(dados, arquivos.map((f) => ({ name: f.name, type: f.type, size: f.size, blob: f }))),
      );
      setSalvando(false);
      fecharEResetar();
      setAviso(msg);
    };

    // Sem rede: guarda na fila offline e encerra.
    if (!online) {
      try { await guardarOffline("Sem conexão — chamado salvo no aparelho e enviado ao reconectar."); }
      catch { setSalvando(false); setErro("Falha ao salvar offline."); }
      return;
    }

    const { error, chamado } = await abrirChamado({
      tenant_id: dados.tenant_id,
      unidade_id: dados.unidade_id,
      descricao: dados.descricao,
      solicitante_id: dados.solicitante_id,
      solicitante_nome: dados.solicitante_nome,
    });
    if (error || !chamado) {
      // Erro de rede → guarda offline p/ retry; erro de regra → mostra ao usuário.
      if (ehErroDeRede(error)) {
        try { await guardarOffline("Conexão instável — chamado salvo no aparelho e enviado depois."); return; }
        catch { /* cai no erro abaixo */ }
      }
      setSalvando(false); setErro(error ?? "Falha ao abrir."); return;
    }
    // Anexa ofício/foto/pdf ao chamado recém-criado.
    for (const file of arquivos) {
      const up = await anexarArquivo({
        tenantId, chamadoId: chamado.id, atorId: session.user.id, tipo: "oficio", file,
      });
      if (up.error) {
        setSalvando(false);
        setErro(`Chamado criado, mas falhou ao anexar "${file.name}": ${up.error}`);
        void recarregar();
        return;
      }
    }
    setSalvando(false);
    fecharEResetar();
    void recarregar();
  }

  async function verDetalhe(c: Chamado) {
    setDetalhe(c);
    setEventos(await listarEventos(c.id));
  }

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";

  return (
    <AppShell titulo="Meus chamados">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-cinza-secundario">{chamados.length} chamado(s)</p>
        <Button variant="acento" onClick={() => { setErro(null); setAbrir(true); }}>Abrir chamado</Button>
      </div>
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}
      {aviso && <div className="mb-3"><Alert tipo="info">{aviso}</Alert></div>}
      {(!online || pendentes > 0) && (
        <div className="mb-3">
          <Alert tipo="info">
            <div className="flex items-center justify-between gap-3">
              <span>
                {!online && "Você está offline. "}
                {pendentes > 0
                  ? `${rotuloPendentes(pendentes)}.`
                  : "Chamados abertos agora serão enviados ao reconectar."}
              </span>
              {pendentes > 0 && online && (
                <Button
                  variant="outline"
                  onClick={() => void sincronizarAgora()}
                  loading={sincronizando}
                  className="shrink-0 px-3 py-1.5"
                >
                  Enviar agora
                </Button>
              )}
            </div>
          </Alert>
        </div>
      )}

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <div className="grid gap-3">
          {chamados.length === 0 && <Card><p className="text-cinza-secundario">Nenhum chamado ainda. Clique em “Abrir chamado”.</p></Card>}
          {chamados.map((c) => (
            <button key={c.id} onClick={() => void verDetalhe(c)} className="text-left">
              <Card className="transition-colors hover:border-azul-claro">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-cinza-secundario">{c.numero_protocolo}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-cinza-texto">{c.descricao}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-cinza-secundario">{nomeUnidade(c.unidade_id)}</span>
                  <UrgenciaBadge urgencia={c.urgencia} />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Abrir chamado — 3 passos numa tela só */}
      <Modal aberto={abrir} titulo="Abrir chamado" onClose={() => setAbrir(false)}>
        <div className="flex flex-col gap-4">
          {resolucao.modo === "travado" ? (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-cinza-texto">1. Unidade</span>
              <p className="rounded-lg border border-cinza-borda bg-cinza-fundo px-3.5 py-2.5 text-sm text-cinza-texto">{resolucao.unidade.nome}</p>
            </div>
          ) : (
            <Select label="1. Unidade" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
              <option value="">Selecione…</option>
              {resolucao.unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          )}

          <div>
            <span className="mb-1.5 block text-sm font-medium text-cinza-texto">2. Ofício / foto (1 a 3 — PNG, JPG ou PDF)</span>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,application/pdf"
              onChange={(e) => setArquivos(Array.from(e.target.files ?? []).slice(0, 3))}
              className="block w-full text-sm text-cinza-texto file:mr-3 file:rounded-lg file:border-0 file:bg-azul-principal file:px-3 file:py-2 file:text-white"
            />
            {arquivos.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-cinza-secundario">
                {arquivos.map((f) => <li key={f.name}>{f.name} ({Math.ceil(f.size / 1024)} KB)</li>)}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="desc" className="mb-1.5 block text-sm font-medium text-cinza-texto">3. O que está acontecendo?</label>
            <textarea
              id="desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              placeholder="Ex.: Ar-condicionado da sala 3 parou de gelar."
              className="w-full rounded-lg border border-cinza-borda px-3.5 py-2.5 text-sm focus:border-azul-principal focus:outline-none"
            />
          </div>

          <Button onClick={() => void onAbrir()} loading={salvando} className="w-full">Enviar chamado</Button>
        </div>
      </Modal>

      {/* Detalhe + timeline */}
      <Modal aberto={!!detalhe} titulo={detalhe ? `Chamado ${detalhe.numero_protocolo}` : ""} onClose={() => setDetalhe(null)}>
        {detalhe && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2"><StatusBadge status={detalhe.status} /><UrgenciaBadge urgencia={detalhe.urgencia} /></div>
            <p className="text-sm text-cinza-texto">{detalhe.descricao}</p>
            <p className="text-xs text-cinza-secundario">{nomeUnidade(detalhe.unidade_id)}</p>
            <hr className="border-cinza-borda" />
            <h3 className="text-sm font-semibold text-cinza-texto">Acompanhamento</h3>
            <Timeline eventos={eventos} />
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
