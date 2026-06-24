import { supabase } from "./supabase";
import type { Tables } from "@/types/database.types";
import type { Status, Urgencia } from "@/lib/chamados";

export type Chamado = Tables<"chamados">;
export type ChamadoEvento = Tables<"chamado_eventos">;

export interface AbrirChamadoInput {
  tenant_id: string;
  unidade_id: string;
  equipamento_id?: string | null;
  urgencia: Urgencia;
  descricao: string;
  solicitante_id: string;
  solicitante_nome: string;
}

export async function listarChamados(filtros?: { status?: Status }): Promise<Chamado[]> {
  let q = supabase.from("chamados").select("*").order("created_at", { ascending: false });
  if (filtros?.status) q = q.eq("status", filtros.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obterChamado(id: string): Promise<Chamado | null> {
  const { data, error } = await supabase.from("chamados").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Abre chamado + registra evento inicial na timeline.
export async function abrirChamado(input: AbrirChamadoInput): Promise<{ error: string | null; chamado: Chamado | null }> {
  const { data, error } = await supabase
    .from("chamados")
    .insert({
      tenant_id: input.tenant_id,
      unidade_id: input.unidade_id,
      equipamento_id: input.equipamento_id ?? null,
      urgencia: input.urgencia,
      descricao: input.descricao,
      solicitante_id: input.solicitante_id,
      solicitante_nome: input.solicitante_nome,
    })
    .select()
    .single();
  if (error || !data) return { error: error?.message ?? "Falha ao abrir", chamado: null };
  await registrarEvento({
    chamado_id: data.id,
    tenant_id: input.tenant_id,
    evento: "aberto",
    ator_id: input.solicitante_id,
    ator_nome: input.solicitante_nome,
    payload: { urgencia: input.urgencia },
  });
  return { error: null, chamado: data };
}

// Atribui empresa + (opcional) técnico → status "atribuido".
export async function atribuirChamado(
  c: Chamado,
  empresaId: string,
  tecnicoId: string | null,
  ator: { id: string; nome: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("chamados")
    .update({
      empresa_id: empresaId,
      tecnico_id: tecnicoId,
      status: "atribuido",
      data_atribuicao: new Date().toISOString(),
    })
    .eq("id", c.id);
  if (error) return { error: error.message };
  await registrarEvento({
    chamado_id: c.id, tenant_id: c.tenant_id, evento: "atribuido",
    ator_id: ator.id, ator_nome: ator.nome, payload: { empresa_id: empresaId, tecnico_id: tecnicoId },
  });
  return { error: null };
}

// Empresa designa um técnico ao chamado (sem mudar o status).
export async function designarTecnico(
  c: Chamado,
  tecnicoId: string,
  ator: { id: string; nome: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("chamados").update({ tecnico_id: tecnicoId }).eq("id", c.id);
  if (error) return { error: error.message };
  await registrarEvento({
    chamado_id: c.id, tenant_id: c.tenant_id, evento: "tecnico_designado",
    ator_id: ator.id, ator_nome: ator.nome, payload: { tecnico_id: tecnicoId },
  });
  return { error: null };
}

// Transição genérica de status com carimbo de data + evento.
export async function transicionarChamado(
  c: Chamado,
  novoStatus: Status,
  ator: { id: string; nome: string },
  obs?: string,
): Promise<{ error: string | null }> {
  const patch: Partial<Chamado> = { status: novoStatus };
  if (novoStatus === "em_campo") patch.data_atendimento = new Date().toISOString();
  if (novoStatus === "concluido") patch.data_conclusao = new Date().toISOString();
  const { error } = await supabase.from("chamados").update(patch).eq("id", c.id);
  if (error) return { error: error.message };
  await registrarEvento({
    chamado_id: c.id, tenant_id: c.tenant_id, evento: novoStatus,
    ator_id: ator.id, ator_nome: ator.nome, payload: obs ? { obs } : {},
  });
  return { error: null };
}

export interface ChamadoAtivoGeo {
  id: string;
  numero_protocolo: string;
  status: string;
  urgencia: string;
  unidade_nome: string;
  lat: number;
  lng: number;
}

// Chamados em andamento (não concluídos/cancelados) com coordenadas da unidade.
// Base do mapa ao vivo: some quando o chamado é finalizado.
export async function listarChamadosAtivosComGeo(): Promise<ChamadoAtivoGeo[]> {
  const { data, error } = await supabase
    .from("chamados")
    .select("id, numero_protocolo, status, urgencia, unidades!inner(nome, lat, lng)")
    .in("status", ["aberto", "atribuido", "em_campo"]);
  if (error) throw new Error(error.message);
  type Row = {
    id: string; numero_protocolo: string; status: string; urgencia: string;
    unidades: { nome: string; lat: number | null; lng: number | null } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.unidades?.lat != null && r.unidades?.lng != null)
    .map((r) => ({
      id: r.id,
      numero_protocolo: r.numero_protocolo,
      status: r.status,
      urgencia: r.urgencia,
      unidade_nome: r.unidades!.nome,
      lat: r.unidades!.lat as number,
      lng: r.unidades!.lng as number,
    }));
}

export async function listarEventos(chamadoId: string): Promise<ChamadoEvento[]> {
  const { data, error } = await supabase
    .from("chamado_eventos")
    .select("*")
    .eq("chamado_id", chamadoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function registrarEvento(e: {
  chamado_id: string; tenant_id: string; evento: string;
  ator_id: string; ator_nome: string; payload?: Record<string, unknown>;
}) {
  await supabase.from("chamado_eventos").insert({
    chamado_id: e.chamado_id,
    tenant_id: e.tenant_id,
    evento: e.evento,
    ator_id: e.ator_id,
    ator_nome: e.ator_nome,
    payload: (e.payload ?? {}) as never,
  });
}
