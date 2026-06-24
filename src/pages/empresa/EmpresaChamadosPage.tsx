import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, UrgenciaBadge } from "@/components/chamados/Badges";
import { Timeline } from "@/components/chamados/Timeline";
import { ExecucaoChamado } from "@/components/chamados/ExecucaoChamado";
import { useAuth } from "@/hooks/useAuth";
import { proximosEstados, type Status } from "@/lib/chamados";
import { supabase } from "@/services/supabase";
import { listarTecnicos, listarUnidades, listarEmpresas, type Tecnico, type Unidade, type Empresa } from "@/services/cadastros";
import {
  listarChamados, listarEventos, designarTecnico, transicionarChamado,
  type Chamado, type ChamadoEvento,
} from "@/services/chamados";

export function EmpresaChamadosPage() {
  const { session, profile, role, empresaId } = useAuth();
  const podeGerir = role === "empresa_admin";
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [detalhe, setDetalhe] = useState<Chamado | null>(null);
  const [eventos, setEventos] = useState<ChamadoEvento[]>([]);
  const [tecnicoSel, setTecnicoSel] = useState("");
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  async function carregar() {
    const [ch, te, un, em] = await Promise.all([
      listarChamados(),
      empresaId ? listarTecnicos(empresaId) : Promise.resolve([]),
      listarUnidades(),
      listarEmpresas(),
    ]);
    setChamados(ch); setTecnicos(te); setUnidades(un); setEmpresas(em);
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try { await carregar(); }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();

    const channel = empresaId
      ? supabase
          .channel("empresa-chamados")
          .on("postgres_changes", { event: "*", schema: "public", table: "chamados", filter: `empresa_id=eq.${empresaId}` }, () => void carregar())
          .subscribe()
      : null;

    return () => {
      ativo = false;
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function abrirDetalhe(c: Chamado) {
    setDetalhe(c); setAcaoErro(null); setTecnicoSel(c.tecnico_id ?? "");
    setEventos(await listarEventos(c.id));
  }
  async function recarregarDetalhe(id: string) {
    await carregar();
    const atual = (await listarChamados()).find((c) => c.id === id) ?? null;
    setDetalhe(atual);
    if (atual) setEventos(await listarEventos(atual.id));
  }

  async function designar() {
    if (!detalhe || !session || !profile) return;
    if (!tecnicoSel) { setAcaoErro("Selecione o técnico."); return; }
    setProcessando(true); setAcaoErro(null);
    const { error } = await designarTecnico(detalhe, tecnicoSel, { id: session.user.id, nome: profile.nome });
    setProcessando(false);
    if (error) { setAcaoErro(error); return; }
    await recarregarDetalhe(detalhe.id);
  }
  async function transicionar(novo: Status) {
    if (!detalhe || !session || !profile) return;
    setProcessando(true); setAcaoErro(null);
    const { error } = await transicionarChamado(detalhe, novo, { id: session.user.id, nome: profile.nome });
    setProcessando(false);
    if (error) { setAcaoErro(error); return; }
    await recarregarDetalhe(detalhe.id);
  }

  const nomeTecnico = (id: string | null) => tecnicos.find((t) => t.id === id)?.nome ?? "—";
  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.razao_social ?? undefined;

  return (
    <AppShell titulo="Chamados recebidos">
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}
      <p className="mb-3 flex items-center gap-1.5 text-xs text-cinza-secundario">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-verde-sucesso" /> atualizando em tempo real
      </p>

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <div className="grid gap-3">
          {chamados.length === 0 && <Card><p className="text-cinza-secundario">Nenhum chamado atribuído à sua empresa.</p></Card>}
          {chamados.map((c) => (
            <button key={c.id} onClick={() => void abrirDetalhe(c)} className="text-left">
              <Card className="transition-colors hover:border-azul-claro">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-cinza-secundario">{c.numero_protocolo}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-cinza-texto">{c.descricao}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-cinza-secundario">Técnico: {nomeTecnico(c.tecnico_id)}</span>
                  <UrgenciaBadge urgencia={c.urgencia} />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Modal aberto={!!detalhe} titulo={detalhe ? `Chamado ${detalhe.numero_protocolo}` : ""} onClose={() => setDetalhe(null)}>
        {detalhe && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><StatusBadge status={detalhe.status} /><UrgenciaBadge urgencia={detalhe.urgencia} /></div>
            <p className="text-sm text-cinza-texto">{detalhe.descricao}</p>
            {acaoErro && <Alert tipo="erro">{acaoErro}</Alert>}

            {podeGerir && detalhe.status !== "concluido" && detalhe.status !== "cancelado" && (
              <div className="rounded-lg border border-cinza-borda p-3">
                <p className="mb-2 text-sm font-semibold text-cinza-texto">Designar técnico</p>
                <div className="flex gap-2">
                  <Select label="" aria-label="Técnico" value={tecnicoSel} onChange={(e) => setTecnicoSel(e.target.value)} className="flex-1">
                    <option value="">Selecione…</option>
                    {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </Select>
                  <Button onClick={() => void designar()} loading={processando} className="shrink-0">Designar</Button>
                </div>
                {tecnicos.length === 0 && <p className="mt-2 text-xs text-cinza-secundario">Nenhum técnico cadastrado para sua empresa.</p>}
              </div>
            )}

            {detalhe.status === "em_campo" ? (
              <ExecucaoChamado
                chamado={detalhe}
                contexto={{
                  unidadeNome: nomeUnidade(detalhe.unidade_id),
                  empresaNome: nomeEmpresa(detalhe.empresa_id),
                  tecnicoNome: nomeTecnico(detalhe.tecnico_id),
                }}
                onAtualizado={() => void recarregarDetalhe(detalhe.id)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {proximosEstados(detalhe.status as Status).map((s) => (
                  <Button key={s} variant={s === "cancelado" ? "outline" : "primary"} onClick={() => void transicionar(s)} loading={processando} className="text-xs">
                    Marcar “{s}”
                  </Button>
                ))}
              </div>
            )}

            <hr className="border-cinza-borda" />
            <h3 className="text-sm font-semibold text-cinza-texto">Timeline</h3>
            <Timeline eventos={eventos} />
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
