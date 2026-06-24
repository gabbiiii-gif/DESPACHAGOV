// Gerado por `supabase gen types` (projeto evdjijvxllhrlkkhrcdi).
// NÃO editar à mão — regenerar após cada migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chamado_eventos: {
        Row: {
          ator_id: string | null
          ator_nome: string | null
          chamado_id: string
          created_at: string
          evento: string
          id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          ator_id?: string | null
          ator_nome?: string | null
          chamado_id: string
          created_at?: string
          evento: string
          id?: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          ator_id?: string | null
          ator_nome?: string | null
          chamado_id?: string
          created_at?: string
          evento?: string
          id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_eventos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_anexos: {
        Row: {
          ator_id: string | null
          chamado_id: string
          created_at: string
          descricao: string | null
          id: string
          mime_type: string | null
          storage_path: string
          tamanho_bytes: number | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          ator_id?: string | null
          chamado_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          storage_path: string
          tamanho_bytes?: number | null
          tenant_id: string
          tipo: string
        }
        Update: {
          ator_id?: string | null
          chamado_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          assinatura_dataurl: string
          chamado_id: string
          created_at: string
          geo: string | null
          id: string
          ip: string | null
          signatario_cargo: string | null
          signatario_cpf: string | null
          signatario_nome: string
          tenant_id: string
        }
        Insert: {
          assinatura_dataurl: string
          chamado_id: string
          created_at?: string
          geo?: string | null
          id?: string
          ip?: string | null
          signatario_cargo?: string | null
          signatario_cpf?: string | null
          signatario_nome: string
          tenant_id: string
        }
        Update: {
          assinatura_dataurl?: string
          chamado_id?: string
          created_at?: string
          geo?: string | null
          id?: string
          ip?: string | null
          signatario_cargo?: string | null
          signatario_cpf?: string | null
          signatario_nome?: string
          tenant_id?: string
        }
        Relationships: []
      }
      chamados: {
        Row: {
          ai_categoria: string | null
          ai_urgencia_sugerida: string | null
          categoria: string | null
          contrato_id: string | null
          created_at: string
          data_atendimento: string | null
          data_atribuicao: string | null
          data_conclusao: string | null
          data_solicitacao: string
          descricao: string
          empresa_id: string | null
          equipamento_id: string | null
          id: string
          numero_protocolo: string
          sla_horas: number | null
          solicitante_id: string | null
          solicitante_nome: string | null
          status: string
          tecnico_id: string | null
          tenant_id: string
          unidade_id: string
          updated_at: string
          urgencia: string | null
        }
        Insert: {
          ai_categoria?: string | null
          ai_urgencia_sugerida?: string | null
          categoria?: string | null
          contrato_id?: string | null
          created_at?: string
          data_atendimento?: string | null
          data_atribuicao?: string | null
          data_conclusao?: string | null
          data_solicitacao?: string
          descricao: string
          empresa_id?: string | null
          equipamento_id?: string | null
          id?: string
          numero_protocolo?: string
          sla_horas?: number | null
          solicitante_id?: string | null
          solicitante_nome?: string | null
          status?: string
          tecnico_id?: string | null
          tenant_id: string
          unidade_id: string
          updated_at?: string
          urgencia?: string | null
        }
        Update: {
          ai_categoria?: string | null
          ai_urgencia_sugerida?: string | null
          categoria?: string | null
          contrato_id?: string | null
          created_at?: string
          data_atendimento?: string | null
          data_atribuicao?: string | null
          data_conclusao?: string | null
          data_solicitacao?: string
          descricao?: string
          empresa_id?: string | null
          equipamento_id?: string | null
          id?: string
          numero_protocolo?: string
          sla_horas?: number | null
          solicitante_id?: string | null
          solicitante_nome?: string | null
          status?: string
          tecnico_id?: string | null
          tenant_id?: string
          unidade_id?: string
          updated_at?: string
          urgencia?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          numero_processo: string | null
          objeto: string | null
          pdf_url: string | null
          status: string
          tenant_id: string
          updated_at: string
          valor: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          numero_processo?: string | null
          objeto?: string | null
          pdf_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          valor?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          numero_processo?: string | null
          objeto?: string | null
          pdf_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          valor?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          email: string | null
          especialidades: string[]
          id: string
          razao_social: string
          telefone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          especialidades?: string[]
          id?: string
          razao_social: string
          telefone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          especialidades?: string[]
          id?: string
          razao_social?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          btu: number | null
          created_at: string
          id: string
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          qr_code_url: string | null
          tenant_id: string
          tipo: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          btu?: number | null
          created_at?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          qr_code_url?: string | null
          tenant_id: string
          tipo: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          btu?: number | null
          created_at?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          qr_code_url?: string | null
          tenant_id?: string
          tipo?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consents: {
        Row: {
          aceito_em: string
          id: string
          ip: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
          versao_termo: string
        }
        Insert: {
          aceito_em?: string
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
          versao_termo: string
        }
        Update: {
          aceito_em?: string
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
          versao_termo?: string
        }
        Relationships: []
      }
      tecnicos: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          email: string | null
          empresa_id: string
          especialidade: string | null
          id: string
          nome: string
          telefone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          especialidade?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          especialidade?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          contrato_vigencia_fim: string | null
          contrato_vigencia_inicio: string | null
          created_at: string
          estado: string | null
          id: string
          municipio: string | null
          nome_secretaria: string
          status: string
          subdomain: string
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          cnpj?: string | null
          contrato_vigencia_fim?: string | null
          contrato_vigencia_inicio?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          municipio?: string | null
          nome_secretaria: string
          status?: string
          subdomain: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          cnpj?: string | null
          contrato_vigencia_fim?: string | null
          contrato_vigencia_inicio?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          municipio?: string | null
          nome_secretaria?: string
          status?: string
          subdomain?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          ativo: boolean
          bairro: string | null
          codigo_inep: string | null
          created_at: string
          endereco: string | null
          id: string
          lat: number | null
          lng: number | null
          nome: string
          responsavel: string | null
          tenant_id: string
          updated_at: string
          zona: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          codigo_inep?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome: string
          responsavel?: string | null
          tenant_id: string
          updated_at?: string
          zona?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          codigo_inep?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome?: string
          responsavel?: string | null
          tenant_id?: string
          updated_at?: string
          zona?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          matricula: string | null
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          tenant_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          matricula?: string | null
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          tenant_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          tenant_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: { Args: never; Returns: string }
      current_empresa_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      user_role:
        | "superadmin"
        | "admin_secretaria"
        | "gestor_secretaria"
        | "responsavel_unidade"
        | "tecnico_secretaria"
        | "empresa_admin"
        | "tecnico_empresa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "superadmin",
        "admin_secretaria",
        "gestor_secretaria",
        "responsavel_unidade",
        "tecnico_secretaria",
        "empresa_admin",
        "tecnico_empresa",
      ],
    },
  },
} as const
