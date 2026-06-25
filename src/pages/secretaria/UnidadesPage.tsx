import { useEffect, useRef, useState, type FormEvent } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MapaUnidades } from "@/components/cadastros/MapaUnidades";
import { useAuth } from "@/hooks/useAuth";
import { unidadeSchema, normalizarLinhaUnidade } from "@/lib/cadastros";
import {
  listarUnidades, criarUnidade, criarUnidadesLote, excluirUnidade, type Unidade,
} from "@/services/cadastros";

export function UnidadesPage() {
  const { tenantId } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function recarregar() {
    try {
      setUnidades(await listarUnidades(tenantId ?? undefined));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const d = await listarUnidades(tenantId ?? undefined);
        if (ativo) setUnidades(d);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!tenantId) return;
    const parsed = unidadeSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSalvando(true);
    const d = parsed.data;
    const { error } = await criarUnidade({
      tenant_id: tenantId,
      nome: d.nome,
      codigo_inep: d.codigo_inep ?? null,
      endereco: d.endereco ?? null,
      bairro: d.bairro ?? null,
      zona: d.zona ?? null,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      responsavel: d.responsavel ?? null,
    });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setMsg("Unidade cadastrada.");
    setModal(false);
    void recarregar();
  }

  function onCsv(e: FormEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file || !tenantId) return;
    setErro(null);
    setMsg(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const linhas = res.data.map(normalizarLinhaUnidade);
        const validas = linhas.flatMap((l) => (l.ok ? [l.data] : []));
        const invalidas = linhas.filter((l) => !l.ok).length;
        if (!validas.length) { setErro("Nenhuma linha válida no CSV (coluna 'nome' obrigatória)."); return; }
        const { error, count } = await criarUnidadesLote(
          validas.map((v) => ({
            tenant_id: tenantId,
            nome: v.nome,
            codigo_inep: v.codigo_inep ?? null,
            endereco: v.endereco ?? null,
            bairro: v.bairro ?? null,
            zona: v.zona ?? null,
            lat: v.lat ?? null,
            lng: v.lng ?? null,
            responsavel: v.responsavel ?? null,
          })),
        );
        if (error) { setErro(error); return; }
        setMsg(`${count} unidade(s) importada(s).${invalidas ? ` ${invalidas} linha(s) ignorada(s).` : ""}`);
        void recarregar();
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remover(id: string) {
    if (!confirm("Excluir esta unidade?")) return;
    const { error } = await excluirUnidade(id);
    if (error) setErro(error);
    else void recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Unidades</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={onCsv} className="hidden" id="csv-unidades" />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Importar CSV</Button>
          <Button variant="acento" onClick={() => { setMsg(null); setModal(true); }}>Nova unidade</Button>
        </div>
      </div>

      {msg && <div className="mb-3"><Alert tipo="sucesso">{msg}</Alert></div>}
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}

      <p className="mb-2 text-xs text-cinza-secundario">
        CSV com colunas: <code>nome, codigo_inep, endereco, bairro, zona, lat, lng, responsavel</code> (só <code>nome</code> é obrigatório).
      </p>

      <div className="mb-5"><MapaUnidades unidades={unidades} /></div>

      {carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Bairro</th>
                <th className="px-4 py-2.5 font-medium">Zona</th>
                <th className="px-4 py-2.5 font-medium">Geo</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {unidades.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-cinza-secundario">Nenhuma unidade.</td></tr>
              )}
              {unidades.map((u) => (
                <tr key={u.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{u.nome}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{u.bairro ?? "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{u.zona ?? "—"}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{u.lat != null && u.lng != null ? "✓" : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => void remover(u.id)} className="text-xs text-vermelho-critico hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo="Nova unidade" onClose={() => setModal(false)}>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input name="nome" label="Nome" placeholder="EMEF Tancredo Neves" /></div>
          <Input name="codigo_inep" label="Código INEP" />
          <Input name="responsavel" label="Responsável" />
          <Input name="endereco" label="Endereço" />
          <Input name="bairro" label="Bairro" />
          <Select name="zona" label="Zona" defaultValue="">
            <option value="">—</option>
            <option value="urbana">Urbana</option>
            <option value="rural">Rural</option>
          </Select>
          <div />
          <Input name="lat" label="Latitude" placeholder="-3.2031" />
          <Input name="lng" label="Longitude" placeholder="-52.2095" />
          <div className="sm:col-span-2"><Button type="submit" loading={salvando} className="w-full">Salvar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
