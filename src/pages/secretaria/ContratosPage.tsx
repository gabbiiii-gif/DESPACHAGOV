import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { contratoSchema } from "@/lib/cadastros";
import {
  listarContratos, criarContrato, excluirContrato, definirPdfContrato,
  uploadContratoPdf, urlAssinadaContrato, listarEmpresas,
  type Contrato, type Empresa,
} from "@/services/cadastros";

const STATUS_LABEL: Record<string, string> = { vigente: "Vigente", encerrado: "Encerrado", suspenso: "Suspenso" };

export function ContratosPage() {
  const { tenantId } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pdf, setPdf] = useState<File | null>(null);

  async function recarregar() {
    try {
      const [c, e] = await Promise.all([listarContratos(), listarEmpresas()]);
      setContratos(c); setEmpresas(e);
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro"); }
    finally { setCarregando(false); }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [c, e] = await Promise.all([listarContratos(), listarEmpresas()]);
        if (ativo) { setContratos(c); setEmpresas(e); }
      } catch (err) { if (ativo) setErro(err instanceof Error ? err.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, []);

  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.razao_social ?? "—";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!tenantId) return;
    const parsed = contratoSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (pdf && pdf.type !== "application/pdf") { setErro("Anexo deve ser PDF."); return; }
    setSalvando(true);
    const { error, id } = await criarContrato({
      tenant_id: tenantId,
      empresa_id: parsed.data.empresa_id || null,
      numero_processo: parsed.data.numero_processo || null,
      objeto: parsed.data.objeto || null,
      vigencia_inicio: parsed.data.vigencia_inicio || null,
      vigencia_fim: parsed.data.vigencia_fim || null,
      valor: parsed.data.valor ?? null,
      status: parsed.data.status,
    });
    if (error || !id) { setSalvando(false); setErro(error ?? "Falha ao criar"); return; }
    if (pdf) {
      const up = await uploadContratoPdf(tenantId, id, pdf);
      if (up.error) { setSalvando(false); setErro(`Contrato criado, mas o PDF falhou: ${up.error}`); void recarregar(); return; }
      if (up.path) await definirPdfContrato(id, up.path);
    }
    setSalvando(false);
    setPdf(null);
    setModal(false);
    void recarregar();
  }

  async function abrirPdf(path: string) {
    const url = await urlAssinadaContrato(path);
    if (url) window.open(url, "_blank", "noopener");
    else setErro("Não foi possível gerar o link do PDF.");
  }

  async function remover(id: string) {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await excluirContrato(id);
    if (error) setErro(error); else void recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Contratos</h1>
        <Button variant="acento" onClick={() => setModal(true)}>Novo contrato</Button>
      </div>
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Processo</th>
                <th className="px-4 py-2.5 font-medium">Empresa</th>
                <th className="px-4 py-2.5 font-medium">Vigência</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">PDF</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {contratos.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-cinza-secundario">Nenhum contrato.</td></tr>}
              {contratos.map((c) => (
                <tr key={c.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{c.numero_processo ?? "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{nomeEmpresa(c.empresa_id)}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{[c.vigencia_inicio, c.vigencia_fim].filter(Boolean).join(" → ") || "—"}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-azul-info/10 px-2 py-0.5 text-xs font-medium text-azul-info">{STATUS_LABEL[c.status] ?? c.status}</span></td>
                  <td className="px-4 py-2.5">
                    {c.pdf_url
                      ? <button onClick={() => void abrirPdf(c.pdf_url as string)} className="text-xs text-azul-principal hover:underline">Ver</button>
                      : <span className="text-xs text-cinza-desabilitado">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => void remover(c.id)} className="text-xs text-vermelho-critico hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo="Novo contrato" onClose={() => setModal(false)}>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input name="numero_processo" label="Nº do processo" />
          <Select name="empresa_id" label="Empresa" defaultValue="">
            <option value="">—</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
          </Select>
          <div className="sm:col-span-2"><Input name="objeto" label="Objeto" placeholder="Manutenção de climatização" /></div>
          <Input name="vigencia_inicio" label="Vigência início" type="date" />
          <Input name="vigencia_fim" label="Vigência fim" type="date" />
          <Input name="valor" label="Valor (R$)" type="number" step="0.01" />
          <Select name="status" label="Status" defaultValue="vigente">
            <option value="vigente">Vigente</option>
            <option value="encerrado">Encerrado</option>
            <option value="suspenso">Suspenso</option>
          </Select>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-cinza-texto">PDF do contrato</label>
            <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          <div className="sm:col-span-2"><Button type="submit" loading={salvando} className="w-full">Salvar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
