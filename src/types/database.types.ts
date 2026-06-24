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
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "empresas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "equipamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "lgpd_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "tecnicos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
        Relationships: [
          {
            foreignKeyName: "unidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          matricula: string | null
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          matricula?: string | null
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          matricula?: string | null
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: { Args: never; Returns: string }
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
