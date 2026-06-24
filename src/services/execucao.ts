import { supabase } from "./supabase";
import type { Tables } from "@/types/database.types";

export type Anexo = Tables<"chamado_anexos">;
export type Assinatura = Tables<"assinaturas">;
export type TipoAnexo = "foto_antes" | "foto_depois" | "oficio" | "comprovante";

const BUCKET = "chamado-anexos";

// Upload de foto/arquivo ao bucket privado + registro em chamado_anexos.
export async function anexarArquivo(params: {
  tenantId: string; chamadoId: string; atorId: string;
  tipo: TipoAnexo; file: File; descricao?: string;
}): Promise<{ error: string | null }> {
  const { tenantId, chamadoId, atorId, tipo, file, descricao } = params;
  const path = `${tenantId}/${chamadoId}/${tipo}_${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { error: up.error.message };
  const { error } = await supabase.from("chamado_anexos").insert({
    tenant_id: tenantId,
    chamado_id: chamadoId,
    tipo,
    descricao: descricao ?? null,
    storage_path: path,
    mime_type: file.type,
    tamanho_bytes: file.size,
    ator_id: atorId,
  });
  return { error: error?.message ?? null };
}

export async function listarAnexos(chamadoId: string): Promise<Anexo[]> {
  const { data, error } = await supabase
    .from("chamado_anexos").select("*").eq("chamado_id", chamadoId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function urlAnexo(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

// Salva a assinatura digital (dataURL PNG) do responsável que atesta a conclusão.
export async function salvarAssinatura(params: {
  tenantId: string; chamadoId: string;
  nome: string; cpf?: string; cargo?: string; dataUrl: string; geo?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from("assinaturas").insert({
    tenant_id: params.tenantId,
    chamado_id: params.chamadoId,
    signatario_nome: params.nome,
    signatario_cpf: params.cpf ?? null,
    signatario_cargo: params.cargo ?? null,
    assinatura_dataurl: params.dataUrl,
    geo: params.geo ?? null,
  });
  return { error: error?.message ?? null };
}

export async function obterAssinatura(chamadoId: string): Promise<Assinatura | null> {
  const { data } = await supabase
    .from("assinaturas").select("*").eq("chamado_id", chamadoId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}
