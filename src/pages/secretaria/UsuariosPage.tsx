import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, Alert } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { Role } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { listarEmpresas, listarUnidades, type Empresa, type Unidade } from "@/services/cadastros";
import {
  listarUsuariosTenant, convidarUsuario, definirEscolasDoResponsavel, type Usuario,
} from "@/services/usuarios";

// Técnicos não são usuários do app — a empresa os cadastra como registros
// (aba "Técnicos"). Aqui só papéis com login.
const ROLE_LABEL: Record<string, string> = {
  admin_secretaria: "Chefe de divisão",
  engenheiro: "Engenheiro",
  arquiteto: "Arquiteto",
  secretaria_semed: "Secretaria (SEMED)",
  responsavel_unidade: "Gestor de unidade",
  gestor_secretaria: "Gestor da Secretaria", // legado
  empresa_admin: "Empresa", // legado
  manutencao_predial: "Manutenção predial",
  manutencao_refrigeracao: "Manutenção de refrigeração",
  manutencao_ar_condicionado: "Manutenção de ar-condicionado",
  instalacao_ar_condicionado: "Instalação de ar-condicionado",
};

// Papéis que o Chefe de divisão pode cadastrar (ordem = exibição).
const ROLES_CONVIDAVEIS: Role[] = [
  "admin_secretaria", "engenheiro", "arquiteto", "secretaria_semed", "responsavel_unidade",
  "manutencao_predial", "manutencao_refrigeracao", "manutencao_ar_condicionado", "instalacao_ar_condicionado",
];
// Papéis de empresa: exigem vínculo com uma empresa (empresa_id).
const ROLES_EMPRESA = new Set<Role>([
  "manutencao_predial", "manutencao_refrigeracao", "manutencao_ar_condicionado", "instalacao_ar_condicionado",
]);

const schema = z.object({
  nome: z.string().min(3, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  role: z.enum([
    "admin_secretaria", "engenheiro", "arquiteto", "secretaria_semed", "responsavel_unidade",
    "manutencao_predial", "manutencao_refrigeracao", "manutencao_ar_condicionado", "instalacao_ar_condicionado",
  ]),
  empresa_id: z.string().optional(),
  matricula: z.string().optional(),
});

// Lista de checkboxes de unidades, com nome do responsável atual (aviso de troca).
function SeletorEscolas({
  unidades, selecionadas, onToggle, nomePorDono,
}: {
  unidades: Unidade[];
  selecionadas: string[];
  onToggle: (id: string) => void;
  nomePorDono: (userId: string | null) => string | null;
}) {
  if (unidades.length === 0) {
    return <p className="text-sm text-cinza-secundario">Nenhuma unidade cadastrada.</p>;
  }
  return (
    <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-cinza-borda p-2">
      {unidades.map((u) => {
        const marcada = selecionadas.includes(u.id);
        const dono = nomePorDono(u.responsavel_user_id);
        return (
          <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-cinza-fundo">
            <input type="checkbox" checked={marcada} onChange={() => onToggle(u.id)} className="size-4" />
            <span className="text-cinza-texto">{u.nome}</span>
            {dono && <span className="text-xs text-laranja-acento">(atual: {dono})</span>}
          </label>
        );
      })}
    </div>
  );
}

export function UsuariosPage() {
  const { tenantId } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [roleSel, setRoleSel] = useState<Role>("responsavel_unidade");
  const [unidadesSel, setUnidadesSel] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [conviteLink, setConviteLink] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // edição de escolas de um diretor existente
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [editSel, setEditSel] = useState<string[]>([]);
  const [editSalvando, setEditSalvando] = useState(false);
  const [editErro, setEditErro] = useState<string | null>(null);

  async function recarregar() {
    const [us, em, un] = await Promise.all([
      listarUsuariosTenant(tenantId ?? undefined),
      listarEmpresas(tenantId ?? undefined),
      listarUnidades(tenantId ?? undefined),
    ]);
    setUsuarios(us); setEmpresas(em); setUnidades(un);
  }

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [us, em, un] = await Promise.all([
          listarUsuariosTenant(tenantId ?? undefined),
          listarEmpresas(tenantId ?? undefined),
          listarUnidades(tenantId ?? undefined),
        ]);
        if (ativo) { setUsuarios(us); setEmpresas(em); setUnidades(un); }
      } catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Erro"); }
      finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [tenantId]);

  const nomePorDono = (userId: string | null) =>
    userId ? usuarios.find((u) => u.id === userId)?.nome ?? null : null;
  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  function abrirConvite() {
    setOk(null); setConviteLink(null); setErro(null);
    setRoleSel("responsavel_unidade"); setUnidadesSel([]);
    setModal(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOk(null); setConviteLink(null);
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (ROLES_EMPRESA.has(parsed.data.role) && !parsed.data.empresa_id) {
      setErro("Selecione a empresa para esse papel."); return;
    }
    if (parsed.data.role === "responsavel_unidade" && unidadesSel.length === 0) {
      setErro("Selecione ao menos uma escola para o responsável."); return;
    }
    setSalvando(true);
    const { error, emailSent, actionLink } = await convidarUsuario({
      nome: parsed.data.nome,
      email: parsed.data.email,
      role: parsed.data.role,
      empresa_id: parsed.data.empresa_id || null,
      matricula: parsed.data.matricula?.trim() || null,
      unidade_ids: parsed.data.role === "responsavel_unidade" ? unidadesSel : [],
      tenant_id: tenantId,
    });
    setSalvando(false);
    if (error) { setErro(error); return; }
    setOk(emailSent ? "Convite enviado por e-mail." : "Usuário criado.");
    if (!emailSent && actionLink) setConviteLink(actionLink);
    setModal(false);
    void recarregar();
  }

  function abrirEscolas(u: Usuario) {
    setEditErro(null);
    setEditUser(u);
    setEditSel(unidades.filter((x) => x.responsavel_user_id === u.id).map((x) => x.id));
  }

  async function salvarEscolas() {
    if (!editUser || !tenantId) return;
    setEditErro(null); setEditSalvando(true);
    const { error } = await definirEscolasDoResponsavel(editUser.id, editSel, tenantId);
    setEditSalvando(false);
    if (error) { setEditErro(error); return; }
    setEditUser(null);
    void recarregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Usuários</h1>
        <Button variant="acento" onClick={abrirConvite}>Cadastrar usuário</Button>
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
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-cinza-fundo text-left text-cinza-secundario">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Papel</th>
                <th className="px-4 py-2.5 font-medium">Escola(s)</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const escolas = unidades.filter((x) => x.responsavel_user_id === u.id);
                const ehResp = u.role === "responsavel_unidade";
                return (
                  <tr key={u.id} className="border-t border-cinza-borda">
                    <td className="px-4 py-2.5 font-medium text-cinza-texto">{u.nome}</td>
                    <td className="px-4 py-2.5 text-cinza-secundario">{u.email}</td>
                    <td className="px-4 py-2.5 text-cinza-secundario">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="px-4 py-2.5 text-cinza-secundario">
                      {ehResp
                        ? (escolas.length ? escolas.map((x) => x.nome).join(", ") : <span className="text-laranja-acento">sem escola</span>)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? "bg-verde-sucesso/10 text-verde-sucesso" : "bg-cinza-borda text-cinza-secundario"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {ehResp && (
                        <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => abrirEscolas(u)}>Escolas</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal aberto={modal} titulo="Cadastrar usuário" onClose={() => setModal(false)}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input name="nome" label="Nome" />
          <Input name="email" label="E-mail" type="email" />
          <Input name="matricula" label="Matrícula / usuário (opcional)" placeholder="ex.: 12345 — login alternativo ao e-mail" autoComplete="off" />
          <Select name="role" label="Papel" value={roleSel} onChange={(e) => setRoleSel(e.target.value as Role)}>
            {ROLES_CONVIDAVEIS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
          {ROLES_EMPRESA.has(roleSel) && (
            <Select name="empresa_id" label="Empresa" defaultValue="">
              <option value="">Selecione…</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
            </Select>
          )}
          {roleSel === "responsavel_unidade" && (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-cinza-texto">Escola(s) do responsável</span>
              <SeletorEscolas
                unidades={unidades}
                selecionadas={unidadesSel}
                onToggle={(id) => setUnidadesSel((s) => toggle(s, id))}
                nomePorDono={nomePorDono}
              />
              <p className="mt-1 text-xs text-cinza-secundario">Ele abrirá chamados só para estas escolas. Ao menos uma é obrigatória.</p>
            </div>
          )}
          <Button type="submit" loading={salvando} className="w-full">Cadastrar usuário</Button>
        </form>
      </Modal>

      <Modal aberto={!!editUser} titulo={editUser ? `Escolas — ${editUser.nome}` : ""} onClose={() => setEditUser(null)}>
        {editUser && (
          <div className="flex flex-col gap-4">
            {editErro && <Alert tipo="erro">{editErro}</Alert>}
            <SeletorEscolas
              unidades={unidades}
              selecionadas={editSel}
              onToggle={(id) => setEditSel((s) => toggle(s, id))}
              nomePorDono={nomePorDono}
            />
            <p className="text-xs text-cinza-secundario">Desmarcar remove o vínculo. Marcar uma escola de outro diretor a transfere para este.</p>
            <Button onClick={() => void salvarEscolas()} loading={editSalvando} className="w-full">Salvar escolas</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
