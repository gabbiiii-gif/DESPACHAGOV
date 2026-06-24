import { supabase } from "./supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Unidade = Tables<"unidades">;
export type Empresa = Tables<"empresas">;
export type Equipamento = Tables<"equipamentos">;
export type Contrato = Tables<"contratos">;

// ─── Unidades ────────────────────────────────────────────────────────────────
export async function listarUnidades(): Promise<Unidade[]> {
  const { data, error } = await supabase.from("unidades").select("*").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarUnidade(row: TablesInsert<"unidades">) {
  const { error } = await supabase.from("unidades").insert(row);
  return { error: error?.message ?? null };
}
export async function criarUnidadesLote(rows: TablesInsert<"unidades">[]) {
  const { error, count } = await supabase.from("unidades").insert(rows, { count: "exact" });
  return { error: error?.message ?? null, count: count ?? 0 };
}
export async function atualizarUnidade(id: string, patch: TablesUpdate<"unidades">) {
  const { error } = await supabase.from("unidades").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}
export async function excluirUnidade(id: string) {
  const { error } = await supabase.from("unidades").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ─── Empresas ────────────────────────────────────────────────────────────────
export async function listarEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.from("empresas").select("*").order("razao_social");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarEmpresa(row: TablesInsert<"empresas">) {
  const { error } = await supabase.from("empresas").insert(row);
  return { error: error?.message ?? null };
}
export async function excluirEmpresa(id: string) {
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ─── Equipamentos ────────────────────────────────────────────────────────────
export async function listarEquipamentos(): Promise<Equipamento[]> {
  const { data, error } = await supabase.from("equipamentos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarEquipamento(row: TablesInsert<"equipamentos">) {
  const { error } = await supabase.from("equipamentos").insert(row);
  return { error: error?.message ?? null };
}
export async function excluirEquipamento(id: string) {
  const { error } = await supabase.from("equipamentos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ─── Contratos ───────────────────────────────────────────────────────────────
export async function listarContratos(): Promise<Contrato[]> {
  const { data, error } = await supabase.from("contratos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarContrato(row: TablesInsert<"contratos">) {
  const { data, error } = await supabase.from("contratos").insert(row).select("id").single();
  return { error: error?.message ?? null, id: data?.id ?? null };
}
export async function excluirContrato(id: string) {
  const { error } = await supabase.from("contratos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// Upload de PDF do contrato → bucket privado `contratos`, pasta por tenant.
export async function uploadContratoPdf(tenantId: string, contratoId: string, file: File) {
  const path = `${tenantId}/${contratoId}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("contratos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { error: error.message, path: null };
  return { error: null, path };
}

export async function definirPdfContrato(id: string, path: string) {
  const { error } = await supabase.from("contratos").update({ pdf_url: path }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function urlAssinadaContrato(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("contratos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
