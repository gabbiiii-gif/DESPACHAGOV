import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { empresaSchema } from "@/lib/cadastros";
import { listarEmpresas, criarEmpresa, excluirEmpresa, type Empresa } from "@/services/cadastros";

export function EmpresasPage() {
  const { tenantId } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    try { setEmpresas(await listarEmpresas()); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro"); }
    finally { setCarregando(false); }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try { const d = await listarEmpresas(); if (ativo) setEmpresas(d); }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!tenantId) return;
    const parsed = empresaSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setSalvando(true);
    const especialidades = (parsed.data.especialidades ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await criarEmpresa({
      tenant_id: tenantId,
      razao_social: parsed.data.razao_social,
      cnpj: parsed.data.cnpj || null,
      telefone: parsed.data.telefone || null,
      email: parsed.data.email || null,
      especialidades,
    });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setModal(false);
    void recarregar();
  }

  async function remover(id: string) {
    if (!confirm("Excluir esta empresa?")) return;
    const { error } = await excluirEmpresa(id);
    if (error) setErro(error); else void recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Empresas prestadoras</h1>
        <Button variant="acento" onClick={() => setModal(true)}>Nova empresa</Button>
      </div>
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Razão social</th>
                <th className="px-4 py-2.5 font-medium">CNPJ</th>
                <th className="px-4 py-2.5 font-medium">Especialidades</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-cinza-secundario">Nenhuma empresa.</td></tr>}
              {empresas.map((e) => (
                <tr key={e.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{e.razao_social}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{e.cnpj ?? "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{e.especialidades.join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => void remover(e.id)} className="text-xs text-vermelho-critico hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo="Nova empresa" onClose={() => setModal(false)}>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input name="razao_social" label="Razão social" /></div>
          <Input name="cnpj" label="CNPJ" />
          <Input name="telefone" label="Telefone" />
          <Input name="email" label="E-mail" type="email" />
          <div className="sm:col-span-2"><Input name="especialidades" label="Especialidades (separadas por vírgula)" placeholder="climatização, elétrica" /></div>
          <div className="sm:col-span-2"><Button type="submit" loading={salvando} className="w-full">Salvar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
