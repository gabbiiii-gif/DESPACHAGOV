import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { tecnicoSchema } from "@/lib/cadastros";
import {
  listarTecnicos, criarTecnico, atualizarTecnico, inativarTecnico, type Tecnico,
} from "@/services/cadastros";

export function TecnicosPage() {
  const { tenantId, empresaId } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Tecnico | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    if (!empresaId) { setCarregando(false); return; }
    try { setTecnicos(await listarTecnicos(empresaId)); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao carregar"); }
    finally { setCarregando(false); }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      if (!empresaId) { if (ativo) setCarregando(false); return; }
      try { const d = await listarTecnicos(empresaId); if (ativo) setTecnicos(d); }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [empresaId]);

  function abrirNovo() { setEditando(null); setMsg(null); setErro(null); setModal(true); }
  function abrirEdicao(t: Tecnico) { setEditando(t); setMsg(null); setErro(null); setModal(true); }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!tenantId || !empresaId) { setErro("Seu acesso não está vinculado a uma empresa."); return; }
    const parsed = tecnicoSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    const d = parsed.data;
    const patch = {
      nome: d.nome,
      cpf: d.cpf || null,
      telefone: d.telefone || null,
      email: d.email || null,
      especialidade: d.especialidade || null,
    };
    setSalvando(true);
    const { error } = editando
      ? await atualizarTecnico(editando.id, patch)
      : await criarTecnico({ tenant_id: tenantId, empresa_id: empresaId, ...patch });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setMsg(editando ? "Técnico atualizado." : "Técnico cadastrado.");
    setModal(false);
    void recarregar();
  }

  async function remover(t: Tecnico) {
    if (!confirm(`Inativar o técnico ${t.nome}?`)) return;
    const { error } = await inativarTecnico(t.id);
    if (error) setErro(error); else void recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Técnicos</h1>
        <Button variant="acento" onClick={abrirNovo}>Novo técnico</Button>
      </div>

      {msg && <div className="mb-3"><Alert tipo="sucesso">{msg}</Alert></div>}
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      {!empresaId ? (
        <Card><p className="text-cinza-secundario">Seu acesso não está vinculado a uma empresa.</p></Card>
      ) : carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Especialidade</th>
                <th className="px-4 py-2.5 font-medium">Telefone</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-cinza-secundario">Nenhum técnico.</td></tr>
              )}
              {tecnicos.map((t) => (
                <tr key={t.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{t.nome}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{t.especialidade ?? "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{t.telefone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{t.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => abrirEdicao(t)} className="mr-3 text-xs text-azul-principal hover:underline">Editar</button>
                    <button onClick={() => void remover(t)} className="text-xs text-vermelho-critico hover:underline">Inativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo={editando ? "Editar técnico" : "Novo técnico"} onClose={() => setModal(false)}>
        <form key={editando?.id ?? "novo"} onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input name="nome" label="Nome" defaultValue={editando?.nome ?? ""} placeholder="João da Silva" /></div>
          <Input name="especialidade" label="Especialidade" defaultValue={editando?.especialidade ?? ""} />
          <Input name="cpf" label="CPF" defaultValue={editando?.cpf ?? ""} />
          <Input name="telefone" label="Telefone" defaultValue={editando?.telefone ?? ""} />
          <Input name="email" label="E-mail" defaultValue={editando?.email ?? ""} />
          <div className="sm:col-span-2"><Button type="submit" loading={salvando} className="w-full">Salvar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
