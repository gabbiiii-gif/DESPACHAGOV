import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, Alert } from "@/components/ui/Card";
import { SpotlightCard } from "@/components/visual/SpotlightCard";
import { GradientText } from "@/components/visual/GradientText";
import { CountUp } from "@/components/visual/CountUp";
import { useAuth } from "@/hooks/useAuth";
import { listarChamados, type Chamado } from "@/services/chamados";
import { listarUnidades, listarEmpresas, type Unidade, type Empresa } from "@/services/cadastros";
import { listarUsuariosTenant } from "@/services/usuarios";
import { passosOnboarding, onboardingCompleto, progressoOnboarding } from "@/lib/onboarding";
import { useStagger } from "@/hooks/useEntrada";
import { STATUS, STATUS_META, URGENCIAS, URGENCIA_META } from "@/lib/chamados";
import {
  contarPorStatus, contarPorUrgencia, taxaConclusao, tempoMedioConclusaoHoras, serieMensal,
} from "@/lib/kpis";
import { linhasRelatorio, nomeArquivoRelatorio } from "@/lib/relatorios";
import { gerarRelatorioPdf } from "@/lib/relatorioPdf";

function fmtHoras(h: number | null): string {
  if (h == null) return "—";
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}

function baixar(conteudo: string, nomeArquivo: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

const ACOES = [
  { to: "/secretaria/chamados", icone: "🗂️", titulo: "Chamados", desc: "Triar e acompanhar" },
  { to: "/secretaria/mapa", icone: "📍", titulo: "Mapa ao vivo", desc: "Chamados no mapa" },
  { to: "/secretaria/relatorios", icone: "📊", titulo: "Relatórios", desc: "Gerar e exportar" },
  { to: "/secretaria/unidades", icone: "🏫", titulo: "Unidades", desc: "Escolas e endereços" },
];

export function PainelPage() {
  const { tenantId, profile } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nUsuarios, setNUsuarios] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [ch, un, emp, us] = await Promise.all([
          listarChamados(),
          listarUnidades(tenantId ?? undefined),
          listarEmpresas(tenantId ?? undefined),
          listarUsuariosTenant(tenantId ?? undefined),
        ]);
        if (ativo) { setChamados(ch); setUnidades(un); setEmpresas(emp); setNUsuarios(us.length); }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [tenantId]);

  const porStatus = useMemo(() => contarPorStatus(chamados), [chamados]);
  const porUrgencia = useMemo(() => contarPorUrgencia(chamados), [chamados]);
  const serie = useMemo(() => serieMensal(chamados), [chamados]);
  const taxaPct = Math.round(taxaConclusao(chamados) * 100);
  const tMedio = tempoMedioConclusaoHoras(chamados);
  const emAndamento = porStatus.aberto + porStatus.atribuido + porStatus.em_campo;

  const dadosStatus = STATUS.map((s) => ({ nome: STATUS_META[s].label, n: porStatus[s], cor: STATUS_META[s].cor }));
  const dadosUrgencia = [
    ...URGENCIAS.map((u) => ({ nome: URGENCIA_META[u].label, n: porUrgencia[u], cor: URGENCIA_META[u].cor })),
    { nome: "Sem triagem", n: porUrgencia.sem_triagem, cor: "var(--color-cinza-secundario)" },
  ].filter((d) => d.n > 0);
  const kpiRef = useStagger<HTMLDivElement>(carregando);

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeEmpresa = (id: string | null) => (id ? empresas.find((e) => e.id === id)?.razao_social ?? "—" : "—");
  const contagens = { unidades: unidades.length, empresas: empresas.length, usuarios: nUsuarios };

  function exportarCsv() {
    const linhas = linhasRelatorio(chamados, nomeUnidade, nomeEmpresa);
    baixar(Papa.unparse(linhas), `${nomeArquivoRelatorio("chamados")}.csv`, "text/csv;charset=utf-8;");
  }

  function exportarPdf() {
    void gerarRelatorioPdf({
      secretaria: profile?.nome ?? "Secretaria",
      total: chamados.length,
      concluidos: porStatus.concluido,
      taxaConclusaoPct: taxaPct,
      tempoMedioConclusaoHoras: tMedio,
      porStatus: STATUS.map((s) => ({ label: STATUS_META[s].label, n: porStatus[s] })),
      porUrgencia: [
        ...URGENCIAS.map((u) => ({ label: URGENCIA_META[u].label, n: porUrgencia[u] })),
        { label: "Sem triagem", n: porUrgencia.sem_triagem },
      ],
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">
            <GradientText>Painel</GradientText>
          </h1>
          <p className="mt-1 text-sm text-cinza-secundario">
            {profile?.nome ? `Olá, ${profile.nome.split(" ")[0]} · ` : ""}visão geral da manutenção
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={chamados.length === 0} className="px-3 py-1.5 text-xs">Exportar CSV</Button>
          <Button variant="outline" onClick={exportarPdf} disabled={chamados.length === 0} className="px-3 py-1.5 text-xs">Exportar PDF</Button>
        </div>
      </div>

      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {/* ações rápidas */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACOES.map((a) => (
          <Link key={a.to} to={a.to}>
            <SpotlightCard className="flex h-full items-center gap-3 rounded-xl border border-cinza-borda bg-cinza-card p-4 transition-shadow hover:shadow-md">
              <span className="text-2xl">{a.icone}</span>
              <span>
                <span className="block text-sm font-semibold text-cinza-texto">{a.titulo}</span>
                <span className="block text-xs text-cinza-secundario">{a.desc}</span>
              </span>
            </SpotlightCard>
          </Link>
        ))}
      </div>

      {!carregando && !onboardingCompleto(contagens) && (
        <Card className="mb-5 border-azul-principal/30 bg-azul-principal/5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-cinza-texto">Primeiros passos</h2>
            <span className="text-xs text-cinza-secundario">
              {progressoOnboarding(contagens).feitos}/{progressoOnboarding(contagens).total} concluídos
            </span>
          </div>
          <ul className="space-y-2">
            {passosOnboarding(contagens).map((p) => (
              <li key={p.chave} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${p.concluido ? "bg-verde-sucesso text-white" : "border border-cinza-borda text-cinza-secundario"}`}>
                  {p.concluido ? "✓" : ""}
                </span>
                <div>
                  <Link to={p.to} className={`font-medium ${p.concluido ? "text-cinza-secundario line-through" : "text-azul-principal hover:underline"}`}>{p.titulo}</Link>
                  <p className="text-xs text-cinza-secundario">{p.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : chamados.length === 0 ? (
        <Card><p className="text-cinza-secundario">Nenhum chamado ainda. Os indicadores aparecem quando houver movimento.</p></Card>
      ) : (
        <div className="grid gap-4">
          <div ref={kpiRef} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Total de chamados" numero={chamados.length} />
            <Kpi titulo="Em andamento" numero={emAndamento} cor="text-azul-principal" />
            <Kpi titulo="Concluídos" numero={porStatus.concluido} sufixoTexto={` · ${taxaPct}%`} cor="text-verde-sucesso" />
            <Kpi titulo="Tempo médio" texto={fmtHoras(tMedio)} sub="até conclusão" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-cinza-texto">Chamados por status</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosStatus} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cinza-borda)" />
                    <XAxis dataKey="nome" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="n" name="Chamados" radius={[4, 4, 0, 0]}>
                      {dadosStatus.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-cinza-texto">Chamados por urgência</h2>
              <div className="h-64">
                {dadosUrgencia.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-cinza-secundario">Sem dados de urgência.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dadosUrgencia} dataKey="n" nameKey="nome" innerRadius={50} outerRadius={88} paddingAngle={2}>
                        {dadosUrgencia.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-cinza-texto">Volume mensal (últimos 6 meses)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cinza-borda)" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Abertos" fill="var(--color-azul-principal)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="concluidos" name="Concluídos" fill="var(--color-verde-sucesso)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ titulo, numero, texto, sufixoTexto, sub, cor }: {
  titulo: string; numero?: number; texto?: string; sufixoTexto?: string; sub?: string; cor?: string;
}) {
  return (
    <SpotlightCard className="rounded-xl border border-cinza-borda bg-cinza-card p-4">
      <p className="text-xs text-cinza-secundario">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor ?? "text-cinza-texto"}`}>
        {numero != null ? <CountUp to={numero} /> : texto}
        {sufixoTexto && <span className="text-base font-semibold text-cinza-secundario">{sufixoTexto}</span>}
      </p>
      {sub && <p className="text-xs text-cinza-secundario">{sub}</p>}
    </SpotlightCard>
  );
}
