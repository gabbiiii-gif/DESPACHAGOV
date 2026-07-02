export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          ano_mes: string
          contador: number
          tenant_id: string
        }
        Insert: {
          ano_mes: string
          contador?: number
          tenant_id: string
        }
        Update: {
          ano_mes?: string
          contador?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "assinaturas_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
        Relationships: [
          {
            foreignKeyName: "chamado_anexos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_anexos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "chamado_eventos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "chamados_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
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
      error_log: {
        Row: {
          contexto: Json
          created_at: string
          fonte: string
          id: string
          mensagem: string
          nivel: string
          tenant_id: string | null
        }
        Insert: {
          contexto?: Json
          created_at?: string
          fonte: string
          id?: string
          mensagem: string
          nivel?: string
          tenant_id?: string | null
        }
        Update: {
          contexto?: Json
          created_at?: string
          fonte?: string
          id?: string
          mensagem?: string
          nivel?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      notificacoes: {
        Row: {
          assunto: string | null
          canal: string
          chamado_id: string
          created_at: string
          destinatario: string
          erro: string | null
          evento_id: string
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          assunto?: string | null
          canal?: string
          chamado_id: string
          created_at?: string
          destinatario: string
          erro?: string | null
          evento_id: string
          id?: string
          status: string
          tenant_id: string
        }
        Update: {
          assunto?: string | null
          canal?: string
          chamado_id?: string
          created_at?: string
          destinatario?: string
          erro?: string | null
          evento_id?: string
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "chamado_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_config: {
        Row: {
          id: number
          webhook_secret: string
        }
        Insert: {
          id?: number
          webhook_secret?: string
        }
        Update: {
          id?: number
          webhook_secret?: string
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
          cep: string | null
          cidade: string | null
          codigo_inep: string | null
          coordenadora_nome: string | null
          coordenadora_telefone: string | null
          created_at: string
          diretora_nome: string | null
          diretora_telefone: string | null
          email: string | null
          endereco: string | null
          id: string
          lat: number | null
          lng: number | null
          logradouro: string | null
          logradouro_tipo: string | null
          nome: string
          numero: string | null
          responsavel: string | null
          responsavel_user_id: string | null
          secretaria_nome: string | null
          secretaria_telefone: string | null
          tenant_id: string
          updated_at: string
          zona: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_inep?: string | null
          coordenadora_nome?: string | null
          coordenadora_telefone?: string | null
          created_at?: string
          diretora_nome?: string | null
          diretora_telefone?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          logradouro_tipo?: string | null
          nome: string
          numero?: string | null
          responsavel?: string | null
          responsavel_user_id?: string | null
          secretaria_nome?: string | null
          secretaria_telefone?: string | null
          tenant_id: string
          updated_at?: string
          zona?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_inep?: string | null
          coordenadora_nome?: string | null
          coordenadora_telefone?: string | null
          created_at?: string
          diretora_nome?: string | null
          diretora_telefone?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          logradouro_tipo?: string | null
          nome?: string
          numero?: string | null
          responsavel?: string | null
          responsavel_user_id?: string | null
          secretaria_nome?: string | null
          secretaria_telefone?: string | null
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
          {
            foreignKeyName: "unidades_responsavel_user_id_fkey"
            columns: ["responsavel_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "users_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_consumir_credito: {
        Args: { p_limite: number; p_tenant: string }
        Returns: boolean
      }
      current_app_role: { Args: never; Returns: string }
      current_empresa_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      is_superadmin: { Args: never; Returns: boolean }
      pode_acessar_chamado: { Args: { p_chamado_id: string }; Returns: boolean }
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
        | "secretaria_semed"
        | "engenheiro"
        | "arquiteto"
        | "manutencao_predial"
        | "manutencao_refrigeracao"
        | "manutencao_ar_condicionado"
        | "instalacao_ar_condicionado"
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
        "secretaria_semed",
        "engenheiro",
        "arquiteto",
        "manutencao_predial",
        "manutencao_refrigeracao",
        "manutencao_ar_condicionado",
        "instalacao_ar_condicionado",
      ],
    },
  },
} as const
