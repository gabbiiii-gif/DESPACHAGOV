import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, Alert } from "@/components/ui/Card";
import { listarErros, analisarErros } from "@/services/monitor";
import { agruparErros, type GrupoErro, type AnaliseErros } from "@/lib/monitor";

export function SaudePage() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<GrupoErro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState<AnaliseErros | null>(null);
  const [analisando, setAnalisando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const e = await listarErros();
        if (ativo) setGrupos(agruparErros(e));
      } catch (ex) {
        if (ativo) setErro(ex instanceof Error ? ex.message : "Erro");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  async function analisar() {
    setAnalisando(true); setErro(null);
    const { analise: a, error } = await analisarErros();
    setAnalisando(false);
    if (error) { setErro(error); return; }
    setAnalise(a);
  }

  return (
    <AppShell titulo="Saúde do sistema">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/superadmin")} className="px-3 py-1.5 text-xs">← Secretarias</Button>
          <p className="text-sm text-cinza-secundario">{grupos.length} tipo(s) de erro recente(s)</p>
        </div>
        <Button variant="acento" onClick={() => void analisar()} loading={analisando} disabled={grupos.length === 0}>
          Analisar com IA
        </Button>
      </div>

      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {analise && (
        <Card className="mb-4 border-azul-principal/30 bg-azul-principal/5">
          <h2 className="mb-1 text-sm font-semibold text-cinza-texto">Análise do agente IA</h2>
          <p className="text-sm text-cinza-texto">{analise.resumo}</p>
          {analise.riscos.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cinza-secundario">Riscos futuros</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-cinza-texto">
                {analise.riscos.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {analise.recomendacoes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cinza-secundario">Recomendações</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-cinza-texto">
                {analise.recomendacoes.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      {carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : grupos.length === 0 ? (
        <Card><p className="text-cinza-secundario">Nenhum erro registrado. 🎉</p></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Erro</th>
                <th className="px-4 py-2.5 font-medium">Fonte</th>
                <th className="px-4 py-2.5 font-medium">Ocorrências</th>
                <th className="px-4 py-2.5 font-medium">Última</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={`${g.fonte}:${g.mensagem}`} className="border-t border-cinza-borda">
                  <td className="max-w-md px-4 py-2.5 text-cinza-texto"><span className="line-clamp-2">{g.mensagem}</span></td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{g.fonte}</td>
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{g.ocorrencias}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{new Date(g.ultima).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
}
