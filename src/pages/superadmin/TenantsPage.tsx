import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import { listarTenants, criarTenant } from "@/services/tenants";
import type { Tenant } from "@/lib/auth";

const schema = z.object({
  nome_secretaria: z.string().min(3, "Informe o nome da Secretaria"),
  subdomain: z.string().min(2).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  municipio: z.string().optional(),
  estado: z.string().length(2, "UF com 2 letras").optional().or(z.literal("")),
  cnpj: z.string().optional(),
  valor_mensal: z.coerce.number().nonnegative().optional(),
  admin_nome: z.string().min(3, "Nome do administrador"),
  admin_email: z.string().email("E-mail do administrador inválido"),
});

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    try {
      const data = await listarTenants();
      setTenants(data);
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
        const data = await listarTenants();
        if (ativo) setTenants(data);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSalvando(true);
    const { error } = await criarTenant(parsed.data);
    setSalvando(false);
    if (error) {
      setErro(error);
      return;
    }
    setOk("Secretaria criada. Convite enviado ao administrador.");
    setAberto(false);
    e.currentTarget.reset();
    void recarregar();
  }

  return (
    <AppShell titulo="Painel interno — Secretarias contratantes">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-cinza-secundario">{tenants.length} contrato(s) ativo(s)</p>
        <Button variant="acento" onClick={() => setAberto((v) => !v)}>
          {aberto ? "Fechar" : "Nova Secretaria"}
        </Button>
      </div>

      {ok && <div className="mb-4"><Alert tipo="sucesso">{ok}</Alert></div>}
      {erro && <div className="mb-4"><Alert tipo="erro">{erro}</Alert></div>}

      {aberto && (
        <Card className="mb-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="nome_secretaria" label="Nome da Secretaria" placeholder="SEMED Altamira" />
            <Input name="subdomain" label="Subdomínio" placeholder="semed-altamira" />
            <Input name="municipio" label="Município" placeholder="Altamira" />
            <Input name="estado" label="UF" placeholder="PA" maxLength={2} />
            <Input name="cnpj" label="CNPJ" placeholder="00.000.000/0001-00" />
            <Input name="valor_mensal" label="Mensalidade (R$)" type="number" step="0.01" placeholder="0,00" />
            <Input name="admin_nome" label="Administrador — nome" placeholder="Fulano de Tal" />
            <Input name="admin_email" label="Administrador — e-mail" type="email" placeholder="admin@secretaria.gov.br" />
            <div className="sm:col-span-2">
              <Button type="submit" loading={salvando} className="w-full">
                Criar Secretaria + convidar administrador
              </Button>
            </div>
          </form>
        </Card>
      )}

      {carregando ? (
        <p className="text-cinza-secundario">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cinza-borda">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Secretaria</th>
                <th className="px-4 py-2.5 font-medium">Subdomínio</th>
                <th className="px-4 py-2.5 font-medium">Município/UF</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-cinza-secundario">Nenhuma Secretaria cadastrada.</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{t.nome_secretaria}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{t.subdomain}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{[t.municipio, t.estado].filter(Boolean).join("/") || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
