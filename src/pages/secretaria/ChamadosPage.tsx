import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, UrgenciaBadge } from "@/components/chamados/Badges";
import { Timeline } from "@/components/chamados/Timeline";
import { useAuth } from "@/hooks/useAuth";
import { proximosEstados, type Status } from "@/lib/chamados";
import { listarUnidades, listarEmpresas, listarTecnicos, type Unidade, type Empresa, type Tecnico } from "@/services/cadastros";
import {
  listarChamados, listarEventos, atribuirChamado, transicionarChamado,
  type Chamado, type ChamadoEvento,
} from "@/services/chamados";

export function ChamadosPage() {
  const { session, profile } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Status | "">("");

  const [detalhe, setDetalhe] = useState<Chamado | null>(null);
  const [eventos, setEventos] = useState<ChamadoEvento[]>([]);
  const [empresaSel, setEmpresaSel] = useState("");
  const [tecnicoSel, setTecnicoSel] = useState("");
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  async function carregarTudo() {
    const [ch, un, em, te] = await Promise.all([listarChamados(), listarUnidades(), listarEmpresas(), listarTecnicos()]);
    setChamados(ch); setUnidades(un); setEmpresas(em); setTecnicos(te);
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try { await carregarTudo(); if (!ativo) return; }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, []);

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.razao_social ?? "—";
  const visiveis = filtro ? chamados.filter((c) => c.status === filtro) : chamados;

  async function abrirDetalhe(c: Chamado) {
    setDetalhe(c);
    setAcaoErro(null);
    setEmpresaSel(c.empresa_id ?? "");
    setTecnicoSel(c.tecnico_id ?? "");
    setEventos(await listarEventos(c.id));
  }

  async function recarregarDetalhe(id: string) {
    await carregarTudo();
    const atual = (await listarChamados()).find((c) => c.id === id) ?? null;
    setDetalhe(atual);
    if (atual) setEventos(await listarEventos(atual.id));
  }

  async function atribuir() {
    if (!detalhe || !session || !profile) return;
    if (!empresaSel) { setAcaoErro("Selecione a empresa."); return; }
    setProcessando(true); setAcaoErro(null);
    const { error } = await atribuirChamado(detalhe, empresaSel, tecnicoSel || null, { id: session.user.id, nome: profile.nome });
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Chamados</h1>
        <Select label="" aria-label="Filtrar status" value={filtro} onChange={(e) => setFiltro(e.target.value as Status | "")} className="py-1.5">
          <option value="">Todos</option>
          <option value="aberto">Abertos</option>
          <option value="atribuido">Atribuídos</option>
          <option value="em_campo">Em campo</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </Select>
      </div>
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Protocolo</th>
                <th className="px-4 py-2.5 font-medium">Unidade</th>
                <th className="px-4 py-2.5 font-medium">Urgência</th>
                <th className="px-4 py-2.5 font-medium">Empresa</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cinza-secundario">Nenhum chamado.</td></tr>}
              {visiveis.map((c) => (
                <tr key={c.id} onClick={() => void abrirDetalhe(c)} className="cursor-pointer border-t border-cinza-borda hover:bg-cinza-fundo">
                  <td className="px-4 py-2.5 font-mono text-xs text-cinza-texto">{c.numero_protocolo}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{nomeUnidade(c.unidade_id)}</td>
                  <td className="px-4 py-2.5"><UrgenciaBadge urgencia={c.urgencia} /></td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{nomeEmpresa(c.empresa_id)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={!!detalhe} titulo={detalhe ? `Chamado ${detalhe.numero_protocolo}` : ""} onClose={() => setDetalhe(null)}>
        {detalhe && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><StatusBadge status={detalhe.status} /><UrgenciaBadge urgencia={detalhe.urgencia} /></div>
            <p className="text-sm text-cinza-texto">{detalhe.descricao}</p>
            <p className="text-xs text-cinza-secundario">{nomeUnidade(detalhe.unidade_id)} · solicitado por {detalhe.solicitante_nome ?? "—"}</p>

            {acaoErro && <Alert tipo="erro">{acaoErro}</Alert>}

            {/* Atribuição */}
            {detalhe.status !== "concluido" && detalhe.status !== "cancelado" && (
              <div className="rounded-lg border border-cinza-borda p-3">
                <p className="mb-2 text-sm font-semibold text-cinza-texto">Atribuir</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select label="Empresa" value={empresaSel} onChange={(e) => { setEmpresaSel(e.target.value); setTecnicoSel(""); }}>
                    <option value="">Selecione…</option>
                    {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
                  </Select>
                  <Select label="Técnico (opcional)" value={tecnicoSel} onChange={(e) => setTecnicoSel(e.target.value)}>
                    <option value="">—</option>
                    {tecnicos.filter((t) => t.empresa_id === empresaSel).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </Select>
                </div>
                <Button onClick={() => void atribuir()} loading={processando} className="mt-2 w-full">Atribuir empresa</Button>
              </div>
            )}

            {/* Transições de status válidas */}
            <div className="flex flex-wrap gap-2">
              {proximosEstados(detalhe.status as Status).map((s) => (
                <Button key={s} variant={s === "cancelado" ? "outline" : "primary"} onClick={() => void transicionar(s)} loading={processando} className="text-xs">
                  Marcar “{s}”
                </Button>
              ))}
            </div>

            <hr className="border-cinza-borda" />
            <h3 className="text-sm font-semibold text-cinza-texto">Timeline</h3>
            <Timeline eventos={eventos} />
          </div>
        )}
      </Modal>
    </div>
  );
}
