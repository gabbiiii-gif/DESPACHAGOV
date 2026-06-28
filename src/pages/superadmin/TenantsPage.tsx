import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { listarTenants, criarTenant, deletarTenant } from "@/services/tenants";
import type { Tenant } from "@/lib/auth";

const schema = z.object({
  nome_secretaria: z.string().min(3, "Informe o nome da Secretaria"),
  subdomain: z.string().min(2).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  municipio: z.string().optional(),
  estado: z.string().length(2, "UF com 2 letras").optional().or(z.literal("")),
  cnpj: z.string().optional(),
  admin_nome: z.string().min(3, "Nome do administrador"),
  admin_email: z.string().email("E-mail do administrador inválido"),
});

export function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [conviteLink, setConviteLink] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Exclusão (irreversível): confirmação por digitação do subdomínio.
  const [excluir, setExcluir] = useState<Tenant | null>(null);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  function abrirExcluir(t: Tenant) {
    setExcluir(t); setConfirmacao(""); setErro(null); setOk(null);
  }

  async function confirmarExcluir() {
    if (!excluir || confirmacao.trim() !== excluir.subdomain) return;
    setExcluindo(true);
    const { error } = await deletarTenant(excluir.id);
    setExcluindo(false);
    if (error) { setErro(error); return; }
    setOk(`Secretaria "${excluir.nome_secretaria}" excluída.`);
    setExcluir(null);
    void recarregar();
  }

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
    // Captura o form ANTES do await: após o await (e o setAberto que desmonta o
    // form) e.currentTarget vira null e .reset() lançaria erro.
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSalvando(true);
    setConviteLink(null);
    const { error, emailSent, actionLink } = await criarTenant(parsed.data);
    setSalvando(false);
    if (error) {
      setErro(error);
      return;
    }
    setOk(emailSent ? "Secretaria criada. Convite enviado por e-mail." : "Secretaria criada.");
    if (!emailSent && actionLink) setConviteLink(actionLink);
    form.reset();
    setAberto(false);
    void recarregar();
  }

  return (
    <AppShell titulo="Painel interno — Secretarias contratantes">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-cinza-secundario">{tenants.length} contrato(s) ativo(s)</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/superadmin/saude")}>Saúde do sistema</Button>
          <Button variant="acento" onClick={() => setAberto((v) => !v)}>
            {aberto ? "Fechar" : "Nova Secretaria"}
          </Button>
        </div>
      </div>

      {ok && <div className="mb-4"><Alert tipo="sucesso">{ok}</Alert></div>}
      {erro && <div className="mb-4"><Alert tipo="erro">{erro}</Alert></div>}
      {conviteLink && (
        <div className="mb-4">
          <Alert tipo="info">
            <p className="font-medium">E-mail não configurado (Resend). Repasse este link de convite ao administrador:</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={conviteLink}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded border border-cinza-borda bg-white px-2 py-1 text-xs text-cinza-texto"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 px-3 py-1 text-xs"
                onClick={() => void navigator.clipboard.writeText(conviteLink)}
              >
                Copiar
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {aberto && (
        <Card className="mb-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="nome_secretaria" label="Nome da Secretaria" placeholder="SEMED Altamira" />
            <Input name="subdomain" label="Subdomínio" placeholder="semed-altamira" />
            <Input name="municipio" label="Município" placeholder="Altamira" />
            <Input name="estado" label="UF" placeholder="PA" maxLength={2} />
            <Input name="cnpj" label="CNPJ" placeholder="00.000.000/0001-00" />
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
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Secretaria</th>
                <th className="px-4 py-2.5 font-medium">Subdomínio</th>
                <th className="px-4 py-2.5 font-medium">Município/UF</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-cinza-secundario">Nenhuma Secretaria cadastrada.</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{t.nome_secretaria}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{t.subdomain}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{[t.municipio, t.estado].filter(Boolean).join("/") || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">{t.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => navigate(`/superadmin/secretaria/${t.id}/unidades`)}>
                        Gerenciar
                      </Button>
                      <Button variant="outline" className="px-3 py-1 text-xs text-vermelho-critico" onClick={() => abrirExcluir(t)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exclusão irreversível — confirmação por digitação do subdomínio. */}
      <Modal aberto={!!excluir} titulo="Excluir Secretaria" onClose={() => setExcluir(null)}>
        {excluir && (
          <div className="flex flex-col gap-3">
            <Alert tipo="erro">
              Ação <b>irreversível</b>. Remove a Secretaria <b>{excluir.nome_secretaria}</b> e todos os dados
              vinculados: usuários, unidades, empresas, equipamentos, contratos, chamados e anexos.
            </Alert>
            <label htmlFor="confirma-sub" className="text-sm text-cinza-texto">
              Para confirmar, digite o subdomínio <code className="rounded bg-cinza-fundo px-1.5 py-0.5">{excluir.subdomain}</code>:
            </label>
            <input
              id="confirma-sub"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={excluir.subdomain}
              className="w-full rounded-lg border border-cinza-borda px-3.5 py-2.5 text-sm focus:border-azul-principal focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExcluir(null)} className="text-xs">Cancelar</Button>
              <Button
                variant="acento"
                onClick={() => void confirmarExcluir()}
                loading={excluindo}
                disabled={confirmacao.trim() !== excluir.subdomain}
                className="text-xs"
              >
                Excluir definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
