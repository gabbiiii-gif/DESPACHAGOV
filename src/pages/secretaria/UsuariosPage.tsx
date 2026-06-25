import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { Role } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { listarEmpresas, type Empresa } from "@/services/cadastros";
import { listarUsuariosTenant, convidarUsuario, type Usuario } from "@/services/usuarios";

const ROLE_LABEL: Record<string, string> = {
  admin_secretaria: "Admin da Secretaria",
  gestor_secretaria: "Gestor da Secretaria",
  responsavel_unidade: "Responsável de Unidade",
  tecnico_secretaria: "Técnico interno",
  empresa_admin: "Admin de Empresa",
  tecnico_empresa: "Técnico de Empresa",
};

const ROLES_CONVIDAVEIS: Role[] = [
  "gestor_secretaria", "responsavel_unidade", "tecnico_secretaria", "empresa_admin", "tecnico_empresa",
];
const ROLES_EMPRESA = new Set<Role>(["empresa_admin", "tecnico_empresa"]);

const schema = z.object({
  nome: z.string().min(3, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["gestor_secretaria", "responsavel_unidade", "tecnico_secretaria", "empresa_admin", "tecnico_empresa"]),
  empresa_id: z.string().optional(),
});

export function UsuariosPage() {
  const { tenantId } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [roleSel, setRoleSel] = useState<Role>("responsavel_unidade");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [conviteLink, setConviteLink] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    const [us, em] = await Promise.all([listarUsuariosTenant(tenantId ?? undefined), listarEmpresas(tenantId ?? undefined)]);
    setUsuarios(us); setEmpresas(em);
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try { const [us, em] = await Promise.all([listarUsuariosTenant(tenantId ?? undefined), listarEmpresas(tenantId ?? undefined)]); if (ativo) { setUsuarios(us); setEmpresas(em); } }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [tenantId]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOk(null); setConviteLink(null);
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (ROLES_EMPRESA.has(parsed.data.role) && !parsed.data.empresa_id) {
      setErro("Selecione a empresa para esse papel."); return;
    }
    setSalvando(true);
    const { error, emailSent, actionLink } = await convidarUsuario({
      nome: parsed.data.nome,
      email: parsed.data.email,
      role: parsed.data.role,
      empresa_id: parsed.data.empresa_id || null,
      tenant_id: tenantId,
    });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setOk(emailSent ? "Convite enviado por e-mail." : "Usuário criado.");
    if (!emailSent && actionLink) setConviteLink(actionLink);
    setModal(false);
    void recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Usuários</h1>
        <Button variant="acento" onClick={() => { setOk(null); setConviteLink(null); setModal(true); }}>Convidar usuário</Button>
      </div>

      {ok && <div className="mb-3"><Alert tipo="sucesso">{ok}</Alert></div>}
      {erro && <div className="mb-3"><Alert tipo="erro">{erro}</Alert></div>}
      {conviteLink && (
        <div className="mb-3">
          <Alert tipo="info">
            <p className="font-medium">Repasse este link de acesso:</p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={conviteLink} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-cinza-borda bg-white px-2 py-1 text-xs" />
              <Button type="button" variant="outline" className="shrink-0 px-3 py-1 text-xs" onClick={() => void navigator.clipboard.writeText(conviteLink)}>Copiar</Button>
            </div>
          </Alert>
        </div>
      )}

      {carregando ? <p className="text-cinza-secundario">Carregando…</p> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Papel</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-cinza-borda">
                  <td className="px-4 py-2.5 font-medium text-cinza-texto">{u.nome}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{u.email}</td>
                  <td className="px-4 py-2.5 text-cinza-secundario">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? "bg-verde-sucesso/10 text-verde-sucesso" : "bg-cinza-borda text-cinza-secundario"}`}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo="Convidar usuário" onClose={() => setModal(false)}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input name="nome" label="Nome" />
          <Input name="email" label="E-mail" type="email" />
          <Select name="role" label="Papel" value={roleSel} onChange={(e) => setRoleSel(e.target.value as Role)}>
            {ROLES_CONVIDAVEIS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
          {ROLES_EMPRESA.has(roleSel) && (
            <Select name="empresa_id" label="Empresa" defaultValue="">
              <option value="">Selecione…</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
            </Select>
          )}
          <Button type="submit" loading={salvando} className="w-full">Enviar convite</Button>
        </form>
      </Modal>
    </div>
  );
}
