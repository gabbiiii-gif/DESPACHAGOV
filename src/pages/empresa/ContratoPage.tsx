import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, Alert } from "@/components/ui/Card";
import { listarChamados, type Chamado } from "@/services/chamados";
import { resumoSlaMensal, taxaSlaGeral, type ChamadoSla } from "@/lib/sla";
import { tempoMedioConclusaoHoras } from "@/lib/kpis";
import { nomeArquivoRelatorio } from "@/lib/relatorios";

function fmtHoras(h: number | null): string {
  if (h == null) return "—";
  return h < 24 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} dias`;
}

function baixar(conteudo: string, nome: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function ContratoPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const ch = await listarChamados();
        if (ativo) setChamados(ch);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  // Chamado é estruturalmente compatível com ChamadoSla (RLS já escopa à empresa).
  const slaInput = chamados as unknown as ChamadoSla[];
  const serie = useMemo(() => resumoSlaMensal(slaInput), [slaInput]);
  const taxaPct = Math.round(taxaSlaGeral(slaInput) * 100);
  const concluidos = chamados.filter((c) => c.status === "concluido").length;
  const tMedio = tempoMedioConclusaoHoras(chamados);

  const dadosGrafico = serie.map((p) => ({ mes: p.mes, "% no prazo": Math.round(p.taxa * 100) }));

  function exportarCsv() {
    const linhas = serie.map((p) => ({
      mes: p.mes,
      concluidos: p.concluidos,
      no_prazo: p.no_prazo,
      taxa_sla_pct: Math.round(p.taxa * 100),
    }));
    baixar(Papa.unparse(linhas), `${nomeArquivoRelatorio("sla-mensal")}.csv`, "text/csv;charset=utf-8;");
  }

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl font-bold text-cinza-texto">Meu contrato — desempenho de SLA</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-cinza-secundario">Acompanhamento do cumprimento de prazos (base do faturamento)</p>
        <Button variant="outline" onClick={exportarCsv} disabled={chamados.length === 0} className="px-3 py-1.5 text-xs">
          Exportar CSV
        </Button>
      </div>

      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : chamados.length === 0 ? (
        <Card><p className="text-cinza-secundario">Nenhum chamado atribuído à sua empresa ainda.</p></Card>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Chamados recebidos" valor={String(chamados.length)} />
            <Kpi titulo="Concluídos" valor={String(concluidos)} />
            <Kpi titulo="SLA cumprido" valor={`${taxaPct}%`} sub="dos avaliáveis" />
            <Kpi titulo="Tempo médio" valor={fmtHoras(tMedio)} sub="até conclusão" />
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-cinza-texto">SLA por mês (% no prazo)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cinza-borda)" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                  <Tooltip />
                  <Bar dataKey="% no prazo" fill="var(--color-verde-sucesso)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-cinza-texto">Detalhe mensal</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-cinza-secundario">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Mês</th>
                    <th className="py-1.5 pr-4 font-medium">Concluídos</th>
                    <th className="py-1.5 pr-4 font-medium">No prazo</th>
                    <th className="py-1.5 font-medium">% SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.map((p) => (
                    <tr key={p.mes} className="border-t border-cinza-borda">
                      <td className="py-1.5 pr-4 text-cinza-texto">{p.mes}</td>
                      <td className="py-1.5 pr-4 text-cinza-secundario">{p.concluidos}</td>
                      <td className="py-1.5 pr-4 text-cinza-secundario">{p.no_prazo}</td>
                      <td className="py-1.5 font-medium text-cinza-texto">{Math.round(p.taxa * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-cinza-secundario">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-cinza-texto">{valor}</p>
      {sub && <p className="text-xs text-cinza-secundario">{sub}</p>}
    </Card>
  );
}
