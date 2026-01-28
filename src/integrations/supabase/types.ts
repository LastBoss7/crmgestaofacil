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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      broadcasts: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          sender_id: string
          sender_name: string
          team_id: string | null
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          sender_id: string
          sender_name: string
          team_id?: string | null
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          sender_id?: string
          sender_name?: string
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      callbacks: {
        Row: {
          client_name: string
          company_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          phone: string
          sale_id: string | null
          scheduled_at: string
          seller_id: string
          status: string
        }
        Insert: {
          client_name: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          phone: string
          sale_id?: string | null
          scheduled_at: string
          seller_id: string
          status?: string
        }
        Update: {
          client_name?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          phone?: string
          sale_id?: string | null
          scheduled_at?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "callbacks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callbacks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callbacks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          cnpj: string
          created_at: string
          id: string
          nome_fantasia: string | null
          owner_id: string
          razao_social: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cnpj: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          owner_id: string
          razao_social: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cnpj?: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          owner_id?: string
          razao_social?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          used_at: string | null
          used_by_company_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by_company_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invite_codes_used_by_company_id_fkey"
            columns: ["used_by_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          sender_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          message: string
          read_at: string | null
          read_notified_at: string | null
          seller_id: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
          message: string
          read_at?: string | null
          read_notified_at?: string | null
          seller_id: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          message?: string
          read_at?: string | null
          read_notified_at?: string | null
          seller_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_current_status: {
        Row: {
          company_id: string | null
          status: Database["public"]["Enums"]["operator_status"]
          status_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          status?: Database["public"]["Enums"]["operator_status"]
          status_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          status?: Database["public"]["Enums"]["operator_status"]
          status_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_current_status_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_status_logs: {
        Row: {
          company_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["operator_status"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status: Database["public"]["Enums"]["operator_status"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["operator_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_status_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          team_id: string | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          team_id?: string | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_comments: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          message: string
          sale_id: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          sale_id: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          sale_id?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_comments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_comments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_history: {
        Row: {
          changed_at: string
          changed_by: string
          changed_by_name: string
          company_id: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          sale_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changed_by_name: string
          company_id?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          sale_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changed_by_name?: string
          company_id?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_history_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_history_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          bl_valor: number | null
          campaign_id: string | null
          cedente_cpf: string | null
          cedente_mae: string | null
          cedente_nascimento: string | null
          cedente_nome: string | null
          cedente_rg: string | null
          cnpj_cliente: string
          company_id: string | null
          contato_responsavel: string | null
          created_at: string | null
          data_venda: string | null
          documentos: string[] | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          equipe: string | null
          gestor_cpf: string | null
          gestor_mae: string | null
          gestor_nascimento: string | null
          gestor_nome: string | null
          gestor_rg: string | null
          id: string
          motivo_pendencia: string | null
          movel_valor: number | null
          nome_fantasia: string | null
          observacoes_vendedor: string | null
          plano_contratado: string | null
          produtos: string | null
          proprietario_cpf: string | null
          proprietario_mae: string | null
          proprietario_nascimento: string | null
          proprietario_nome: string | null
          proprietario_rg: string | null
          razao_social: string
          seller_id: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          telefone_1: string | null
          telefone_2: string | null
          telefone_portabilidade: string | null
          telefone_responsavel: string | null
          tipo_negociacao: string | null
          updated_at: string | null
          valor_mensal: number
          vivo_total_valor: number | null
        }
        Insert: {
          bl_valor?: number | null
          campaign_id?: string | null
          cedente_cpf?: string | null
          cedente_mae?: string | null
          cedente_nascimento?: string | null
          cedente_nome?: string | null
          cedente_rg?: string | null
          cnpj_cliente: string
          company_id?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          data_venda?: string | null
          documentos?: string[] | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          equipe?: string | null
          gestor_cpf?: string | null
          gestor_mae?: string | null
          gestor_nascimento?: string | null
          gestor_nome?: string | null
          gestor_rg?: string | null
          id?: string
          motivo_pendencia?: string | null
          movel_valor?: number | null
          nome_fantasia?: string | null
          observacoes_vendedor?: string | null
          plano_contratado?: string | null
          produtos?: string | null
          proprietario_cpf?: string | null
          proprietario_mae?: string | null
          proprietario_nascimento?: string | null
          proprietario_nome?: string | null
          proprietario_rg?: string | null
          razao_social: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          telefone_1?: string | null
          telefone_2?: string | null
          telefone_portabilidade?: string | null
          telefone_responsavel?: string | null
          tipo_negociacao?: string | null
          updated_at?: string | null
          valor_mensal?: number
          vivo_total_valor?: number | null
        }
        Update: {
          bl_valor?: number | null
          campaign_id?: string | null
          cedente_cpf?: string | null
          cedente_mae?: string | null
          cedente_nascimento?: string | null
          cedente_nome?: string | null
          cedente_rg?: string | null
          cnpj_cliente?: string
          company_id?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          data_venda?: string | null
          documentos?: string[] | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          equipe?: string | null
          gestor_cpf?: string | null
          gestor_mae?: string | null
          gestor_nascimento?: string | null
          gestor_nome?: string | null
          gestor_rg?: string | null
          id?: string
          motivo_pendencia?: string | null
          movel_valor?: number | null
          nome_fantasia?: string | null
          observacoes_vendedor?: string | null
          plano_contratado?: string | null
          produtos?: string | null
          proprietario_cpf?: string | null
          proprietario_mae?: string | null
          proprietario_nascimento?: string | null
          proprietario_nome?: string | null
          proprietario_rg?: string | null
          razao_social?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          telefone_1?: string | null
          telefone_2?: string | null
          telefone_portabilidade?: string | null
          telefone_responsavel?: string | null
          tipo_negociacao?: string | null
          updated_at?: string | null
          valor_mensal?: number
          vivo_total_valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sales_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_campaigns: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
          target_sales: number
          target_value: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
          target_sales?: number
          target_value?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          target_sales?: number
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_goals: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          month: number
          seller_id: string
          target_sales: number
          target_value: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          month: number
          seller_id: string
          target_sales?: number
          target_value?: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          month?: number
          seller_id?: string
          target_sales?: number
          target_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          team_id: string | null
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          team_id?: string | null
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          team_id?: string | null
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sales_secure: {
        Row: {
          bl_valor: number | null
          campaign_id: string | null
          cedente_cpf: string | null
          cedente_mae: string | null
          cedente_nascimento: string | null
          cedente_nome: string | null
          cedente_rg: string | null
          cnpj_cliente: string | null
          company_id: string | null
          contato_responsavel: string | null
          created_at: string | null
          data_venda: string | null
          documentos: string[] | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          equipe: string | null
          gestor_cpf: string | null
          gestor_mae: string | null
          gestor_nascimento: string | null
          gestor_nome: string | null
          gestor_rg: string | null
          id: string | null
          motivo_pendencia: string | null
          movel_valor: number | null
          nome_fantasia: string | null
          observacoes_vendedor: string | null
          plano_contratado: string | null
          produtos: string | null
          proprietario_cpf: string | null
          proprietario_mae: string | null
          proprietario_nascimento: string | null
          proprietario_nome: string | null
          proprietario_rg: string | null
          razao_social: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          telefone_1: string | null
          telefone_2: string | null
          telefone_portabilidade: string | null
          telefone_responsavel: string | null
          tipo_negociacao: string | null
          updated_at: string | null
          valor_mensal: number | null
          vivo_total_valor: number | null
        }
        Insert: {
          bl_valor?: number | null
          campaign_id?: string | null
          cedente_cpf?: never
          cedente_mae?: never
          cedente_nascimento?: never
          cedente_nome?: string | null
          cedente_rg?: never
          cnpj_cliente?: never
          company_id?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          data_venda?: string | null
          documentos?: string[] | null
          email?: never
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          equipe?: string | null
          gestor_cpf?: never
          gestor_mae?: never
          gestor_nascimento?: never
          gestor_nome?: string | null
          gestor_rg?: never
          id?: string | null
          motivo_pendencia?: string | null
          movel_valor?: number | null
          nome_fantasia?: string | null
          observacoes_vendedor?: string | null
          plano_contratado?: string | null
          produtos?: string | null
          proprietario_cpf?: never
          proprietario_mae?: never
          proprietario_nascimento?: never
          proprietario_nome?: string | null
          proprietario_rg?: never
          razao_social?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          telefone_1?: never
          telefone_2?: never
          telefone_portabilidade?: never
          telefone_responsavel?: never
          tipo_negociacao?: string | null
          updated_at?: string | null
          valor_mensal?: number | null
          vivo_total_valor?: number | null
        }
        Update: {
          bl_valor?: number | null
          campaign_id?: string | null
          cedente_cpf?: never
          cedente_mae?: never
          cedente_nascimento?: never
          cedente_nome?: string | null
          cedente_rg?: never
          cnpj_cliente?: never
          company_id?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          data_venda?: string | null
          documentos?: string[] | null
          email?: never
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          equipe?: string | null
          gestor_cpf?: never
          gestor_mae?: never
          gestor_nascimento?: never
          gestor_nome?: string | null
          gestor_rg?: never
          id?: string | null
          motivo_pendencia?: string | null
          movel_valor?: number | null
          nome_fantasia?: string | null
          observacoes_vendedor?: string | null
          plano_contratado?: string | null
          produtos?: string | null
          proprietario_cpf?: never
          proprietario_mae?: never
          proprietario_nascimento?: never
          proprietario_nome?: string | null
          proprietario_rg?: never
          razao_social?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          telefone_1?: never
          telefone_2?: never
          telefone_portabilidade?: never
          telefone_responsavel?: never
          tipo_negociacao?: string | null
          updated_at?: string | null
          valor_mensal?: number | null
          vivo_total_valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sales_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_sale_document: { Args: { _sale_id: string }; Returns: boolean }
      can_view_sensitive_data: {
        Args: { _seller_id: string; _user_id: string }
        Returns: boolean
      }
      cnpj_exists: { Args: { check_cnpj: string }; Returns: boolean }
      get_user_company_id: { Args: { _user_id?: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_team: { Args: { _user_id: string }; Returns: string }
      get_user_team_name: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_team_supervisor: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      mask_cnpj: { Args: { cnpj: string }; Returns: string }
      mask_cpf: { Args: { cpf: string }; Returns: string }
      mask_email: { Args: { email: string }; Returns: string }
      mask_phone: { Args: { phone: string }; Returns: string }
      mask_rg: { Args: { rg: string }; Returns: string }
      use_company_invite_code: {
        Args: { company_id: string; invite_code: string }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      users_in_same_company: {
        Args: { _user_id_1: string; _user_id_2: string }
        Returns: boolean
      }
      validate_company_invite_code: {
        Args: { invite_code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "CEO" | "BACKOFFICE" | "SUPERVISOR" | "SELLER"
      operator_status:
        | "DISPONIVEL"
        | "EM_LIGACAO"
        | "PAUSA"
        | "ALMOCO"
        | "OFFLINE"
      sale_status:
        | "PRE_ANALISE"
        | "AGUARDANDO_AUDITORIA"
        | "PENDENCIA"
        | "VENDA_AUDITADA"
        | "INSTALACAO_MARCADA"
        | "INSTALADA"
        | "CANCELADA"
        | "ACEITE_ENVIADO"
        | "CHAMADO_EM_ABERTO"
        | "DESCONECTADO"
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
      app_role: ["CEO", "BACKOFFICE", "SUPERVISOR", "SELLER"],
      operator_status: [
        "DISPONIVEL",
        "EM_LIGACAO",
        "PAUSA",
        "ALMOCO",
        "OFFLINE",
      ],
      sale_status: [
        "PRE_ANALISE",
        "AGUARDANDO_AUDITORIA",
        "PENDENCIA",
        "VENDA_AUDITADA",
        "INSTALACAO_MARCADA",
        "INSTALADA",
        "CANCELADA",
        "ACEITE_ENVIADO",
        "CHAMADO_EM_ABERTO",
        "DESCONECTADO",
      ],
    },
  },
} as const
