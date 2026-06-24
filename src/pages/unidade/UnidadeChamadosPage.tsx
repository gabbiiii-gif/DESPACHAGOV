import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, UrgenciaBadge } from "@/components/chamados/Badges";
import { Timeline } from "@/components/chamados/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { URGENCIAS, URGENCIA_META, type Urgencia } from "@/lib/chamados";
import { listarUnidades, type Unidade } from "@/services/cadastros";
import {
  listarChamados, abrirChamado, listarEventos, type Chamado, type ChamadoEvento,
} from "@/services/chamados";

export function UnidadeChamadosPage() {
  const { tenantId, session, profile } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // form abrir
  const [abrir, setAbrir] = useState(false);
  const [unidadeId, setUnidadeId] = useState("");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // detalhe
  const [detalhe, setDetalhe] = useState<Chamado | null>(null);
  const [eventos, setEventos] = useState<ChamadoEvento[]>([]);

  async function recarregar() {
    try {
      const [ch, un] = await Promise.all([listarChamados(), listarUnidades()]);
      setChamados(ch); setUnidades(un);
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro"); }
    finally { setCarregando(false); }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [ch, un] = await Promise.all([listarChamados(), listarUnidades()]);
        if (ativo) { setChamados(ch); setUnidades(un); }
      } catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, []);

  async function onAbrir() {
    setErro(null);
    if (!tenantId || !session || !profile) return;
    if (!unidadeId) { setErro("Selecione a unidade."); return; }
    if (descricao.trim().length < 5) { setErro("Descreva o problema (mín. 5 caracteres)."); return; }
    setSalvando(true);
    const { error } = await abrirChamado({
      tenant_id: tenantId,
      unidade_id: unidadeId,
      urgencia,
      descricao: descricao.trim(),
      solicitante_id: session.user.id,
      solicitante_nome: profile.nome,
    });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setAbrir(false); setDescricao(""); setUrgencia("media");
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
          <Select label="1. Unidade" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
            <option value="">Selecione…</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-cinza-texto">2. Urgência</span>
            <div className="grid grid-cols-4 gap-2">
              {URGENCIAS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgencia(u)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${urgencia === u ? "border-transparent text-white" : "border-cinza-borda text-cinza-texto"}`}
                  style={urgencia === u ? { background: URGENCIA_META[u].cor } : undefined}
                >
                  {URGENCIA_META[u].label}
                </button>
              ))}
            </div>
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
