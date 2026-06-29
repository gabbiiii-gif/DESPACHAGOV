import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Alert } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { listarChamados, type Chamado } from "@/services/chamados";
import { listarUnidades, type Unidade } from "@/services/cadastros";
import { agregar, filtrar, dataBR, type ChamadoRel } from "@/lib/relatorioModelo";
import { RelatorioDoc } from "@/components/relatorios/RelatorioDoc";
import { exportarRelatorio, FORMATOS, type FormatoRelatorio } from "@/lib/exportarRelatorio";

type Tipo = "mensal" | "unidade" | "personalizado";

const TABS: { id: Tipo; label: string }[] = [
  { id: "mensal", label: "Mensal" },
  { id: "unidade", label: "Por unidade" },
  { id: "personalizado", label: "Personalizado" },
];

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function rotuloMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const s = new Date(a!, m! - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (s.charAt(0).toUpperCase() + s.slice(1)).replace(" de ", " / ");
}
function limitesMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a!, m!, 0).getDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, "0")}` };
}
// Evita "Rua RUA CUMARU": só prefixa o tipo se o logradouro já não começar com ele.
function montarLogradouro(tipo: string | null | undefined, logradouro: string | null | undefined): string {
  const log = (logradouro ?? "").trim();
  const t = (tipo ?? "").trim();
  if (!log) return t;
  if (!t) return log;
  return log.toLowerCase().startsWith(t.toLowerCase()) ? log : `${t} ${log}`;
}

export function RelatoriosPage() {
  const { tenantId, profile } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [tipo, setTipo] = useState<Tipo>("mensal");
  const [mes, setMes] = useState(mesAtual);
  const [unidadeId, setUnidadeId] = useState("");
  const [de, setDe] = useState(limitesMes(mesAtual()).de);
  const [ate, setAte] = useState(limitesMes(mesAtual()).ate);
  const [exportando, setExportando] = useState<FormatoRelatorio | null>(null);

  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [ch, un] = await Promise.all([listarChamados(), listarUnidades(tenantId ?? undefined)]);
        if (ativo) { setChamados(ch); setUnidades(un); if (un[0]) setUnidadeId(un[0].id); }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [tenantId]);

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";

  const filtrados = useMemo(() => {
    const base = chamados as ChamadoRel[];
    if (tipo === "mensal") { const l = limitesMes(mes); return filtrar(base, l); }
    if (tipo === "unidade") { const l = limitesMes(mes); return filtrar(base, { ...l, unidadeId }); }
    return filtrar(base, unidadeId ? { de, ate, unidadeId } : { de, ate });
  }, [chamados, tipo, mes, unidadeId, de, ate]);

  const dados = useMemo(() => agregar(filtrados, nomeUnidade), [filtrados]); // eslint-disable-line react-hooks/exhaustive-deps

  const props = useMemo(() => {
    const hoje = dataBR(new Date().toISOString());
    const u = unidades.find((x) => x.id === unidadeId);
    const ano = mes.slice(0, 4), mm = mes.slice(5, 7);
    if (tipo === "mensal") {
      return {
        tipo, titulo: "Prestação de contas — Manutenção",
        subtitulo: "Consolidado dos chamados de manutenção e serviços executados nas unidades da Secretaria de Educação no período de referência.",
        periodoRotulo: "Relatório Mensal", periodoValor: rotuloMes(mes),
        docNum: `DG-${ano}-${mm}-EDU`, emitidoEm: hoje, secretariaNome: profile?.nome ?? "Secretaria", dados,
      } as const;
    }
    if (tipo === "unidade") {
      const logr = montarLogradouro(u?.logradouro_tipo, u?.logradouro);
      const endereco = [logr, u?.numero].filter(Boolean).join(", ");
      const diretora = u?.diretora_nome ? `Diretora: ${u.diretora_nome}` : "";
      const info = [endereco, u?.bairro, diretora].filter(Boolean).join(" · ");
      return {
        tipo, titulo: "Relatório por unidade",
        subtitulo: "Detalhamento dos chamados de manutenção da unidade no período selecionado.",
        periodoRotulo: "Relatório por Unidade", periodoValor: u?.nome ?? "—",
        unidadeInfo: info || "—", docNum: `DG-${ano}-${mm}-UNI`, emitidoEm: hoje,
        secretariaNome: profile?.nome ?? "Secretaria", dados,
      } as const;
    }
    return {
      tipo, titulo: "Relatório consolidado",
      subtitulo: "Chamados de manutenção no período e filtros selecionados.",
      periodoRotulo: "Período personalizado",
      periodoValor: `${dataBR(`${de}T00:00:00`)} – ${dataBR(`${ate}T00:00:00`)}`,
      filtrosLinha: `Filtros: ${unidadeId ? nomeUnidade(unidadeId) : "todas as unidades"}`,
      docNum: `DG-custom-${de}`, emitidoEm: hoje, secretariaNome: profile?.nome ?? "Secretaria", dados,
    } as const;
  }, [tipo, mes, de, ate, unidadeId, unidades, profile, dados]); // eslint-disable-line react-hooks/exhaustive-deps

  async function exportar(formato: FormatoRelatorio) {
    setExportando(formato);
    try {
      await exportarRelatorio(formato, {
        el: docRef.current,
        nome: `relatorio-${tipo}-${tipo === "personalizado" ? de : mes}`,
        dados,
        meta: {
          periodo: tipo === "personalizado" ? `${dataBR(`${de}T00:00:00`)} a ${dataBR(`${ate}T00:00:00`)}` : rotuloMes(mes),
          orgao: "Secretaria Municipal de Educação",
        },
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setExportando(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Relatórios</h1>
        <div className="inline-flex rounded-full bg-cinza-fundo p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${tipo === t.id ? "bg-azul-principal text-white" : "text-cinza-secundario hover:text-cinza-texto"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {/* filtros */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tipo === "personalizado" ? (
            <>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-cinza-texto">De</span>
                <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-full rounded-lg border border-cinza-borda bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-cinza-texto">Até</span>
                <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-full rounded-lg border border-cinza-borda bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-cinza-texto">Unidade</span>
                <select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} className="w-full rounded-lg border border-cinza-borda bg-white px-3 py-2 text-sm">
                  <option value="">Todas</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-cinza-texto">Mês</span>
                <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-full rounded-lg border border-cinza-borda bg-white px-3 py-2 text-sm" />
              </label>
              {tipo === "unidade" && (
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-cinza-texto">Unidade</span>
                  <select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} className="w-full rounded-lg border border-cinza-borda bg-white px-3 py-2 text-sm">
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </label>
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cinza-borda pt-3">
          <span className="text-xs font-medium text-cinza-secundario">Exportar:</span>
          {FORMATOS.map((f) => (
            <Button
              key={f.id}
              variant="outline"
              onClick={() => void exportar(f.id)}
              loading={exportando === f.id}
              disabled={exportando != null}
              className="px-3 py-1.5 text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </Card>

      {carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cinza-borda bg-cinza-fundo p-4">
          <div className="mx-auto w-fit shadow-lg">
            <RelatorioDoc ref={docRef} {...props} />
          </div>
        </div>
      )}
    </div>
  );
}
