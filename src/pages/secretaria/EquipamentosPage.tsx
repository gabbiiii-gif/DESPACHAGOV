import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { QrCode } from "@/components/cadastros/QrCode";
import { useAuth } from "@/hooks/useAuth";
import { equipamentoSchema } from "@/lib/cadastros";
import {
  listarEquipamentos, criarEquipamento, excluirEquipamento, listarUnidades,
  type Equipamento, type Unidade,
} from "@/services/cadastros";

export function EquipamentosPage() {
  const { tenantId } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [qr, setQr] = useState<Equipamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    try {
      const [eq, un] = await Promise.all([listarEquipamentos(tenantId ?? undefined), listarUnidades(tenantId ?? undefined)]);
      setEquipamentos(eq); setUnidades(un);
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro"); }
    finally { setCarregando(false); }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [eq, un] = await Promise.all([listarEquipamentos(tenantId ?? undefined), listarUnidades(tenantId ?? undefined)]);
        if (ativo) { setEquipamentos(eq); setUnidades(un); }
      } catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, []);

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!tenantId) return;
    const parsed = equipamentoSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setSalvando(true);
    const { error } = await criarEquipamento({
      tenant_id: tenantId,
      unidade_id: parsed.data.unidade_id,
      tipo: parsed.data.tipo,
      marca: parsed.data.marca || null,
      modelo: parsed.data.modelo || null,
      numero_serie: parsed.data.numero_serie || null,
      btu: parsed.data.btu ?? null,
    });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setModal(false);
    void recarregar();
  }

  async function remover(id: string) {
    if (!confirm("Excluir este equipamento?")) return;
    const { error } = await excluirEquipamento(id);
    if (error) setErro(error); else void recarregar();
  }

  const qrValue = qr ? `${window.location.origin}/eq/${qr.id}` : "";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Equipamentos</h1>
        <Button variant="acento" onClick={() => setModal(true)} disabled={unidades.length === 0}>Novo equipamento</Button>
      </div>
      {unidades.length === 0 && !carregando && <div className="mb-3"><Alert tipo="info">Cadastre uma unidade antes de adicionar equipamentos.</Alert></div>}
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Unidade</th>
                <th className="px-4 py-2.5 font-medium">Marca/Modelo</th>
                <th className="px-4 py-2.5 font-medium">BTU</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cinza-secundario">Nenhum equipamento.</td></tr>}
              {equipamentos.map((eq) => (
                <tr key={eq.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{eq.tipo}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{nomeUnidade(eq.unidade_id)}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{[eq.marca, eq.modelo].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{eq.btu ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setQr(eq)} className="mr-3 text-xs text-azul-principal hover:underline">QR</button>
                    <button onClick={() => void remover(eq.id)} className="text-xs text-vermelho-critico hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo="Novo equipamento" onClose={() => setModal(false)}>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select name="unidade_id" label="Unidade" defaultValue="">
              <option value="" disabled>Selecione…</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </div>
          <Input name="tipo" label="Tipo" placeholder="Ar-condicionado split" />
          <Input name="btu" label="BTU" type="number" />
          <Input name="marca" label="Marca" />
          <Input name="modelo" label="Modelo" />
          <div className="sm:col-span-2"><Input name="numero_serie" label="Nº de série" /></div>
          <div className="sm:col-span-2"><Button type="submit" loading={salvando} className="w-full">Salvar</Button></div>
        </form>
      </Modal>

      <Modal aberto={!!qr} titulo="QR do equipamento" onClose={() => setQr(null)}>
        {qr && (
          <div className="flex flex-col items-center gap-3">
            <QrCode value={qrValue} />
            <p className="text-center text-sm text-cinza-texto"><strong>{qr.tipo}</strong> — {nomeUnidade(qr.unidade_id)}</p>
            <code className="break-all text-center text-xs text-cinza-secundario">{qrValue}</code>
            <Button variant="outline" onClick={() => window.print()} className="text-xs">Imprimir</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
