export type AppRole = 'CEO' | 'COORDENADOR' | 'BACKOFFICE' | 'SUPERVISOR' | 'SELLER';

export type SaleStatus = 'PRE_ANALISE' | 'AGUARDANDO_AUDITORIA' | 'PENDENCIA' | 'VENDA_AUDITADA' | 'INSTALACAO_MARCADA' | 'INSTALADA' | 'CANCELADA' | 'ACEITE_ENVIADO' | 'CHAMADO_EM_ABERTO' | 'DESCONECTADO' | 'ENVIADO_PARA_SAV';

export type OperatorStatus = 'DISPONIVEL' | 'EM_LIGACAO' | 'PAUSA' | 'ALMOCO' | 'OFFLINE' | 'CADASTRO_VENDA';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  active: boolean;
  created_at: string;
  avatar_url?: string | null;
  company_id?: string | null;
  team_id?: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  supervisor_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  supervisor?: Profile;
  members?: Profile[];
}

export interface Sale {
  id: string;
  seller_id: string | null;
  cnpj_cliente: string;
  razao_social: string;
  nome_fantasia: string | null;
  contato_responsavel: string | null;
  telefone_responsavel: string | null;
  produtos: string | null;
  valor_mensal: number;
  status: SaleStatus;
  observacoes_vendedor: string | null;
  motivo_pendencia: string | null;
  documentos?: string[] | null;
  created_at: string;
  updated_at: string;
  // Extended fields
  company_id: string | null;
  equipe: string | null;
  tipo_negociacao: string | null;
  email: string | null;
  telefone_1: string | null;
  telefone_2: string | null;
  telefone_portabilidade: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_cep: string | null;
  proprietario_nome: string | null;
  proprietario_cpf: string | null;
  proprietario_rg: string | null;
  proprietario_mae: string | null;
  proprietario_nascimento: string | null;
  gestor_nome: string | null;
  gestor_cpf: string | null;
  gestor_rg: string | null;
  gestor_mae: string | null;
  gestor_nascimento: string | null;
  cedente_nome: string | null;
  cedente_cpf: string | null;
  cedente_rg: string | null;
  cedente_mae: string | null;
  cedente_nascimento: string | null;
  plano_contratado: string | null;
  bl_valor: number | null;
  vivo_total_valor: number | null;
  movel_valor: number | null;
  data_venda: string | null;
  // Joined data
  seller?: Profile;
}

export interface SaleComment {
  id: string;
  sale_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

export interface OperatorStatusLog {
  id: string;
  user_id: string;
  status: OperatorStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  company_id: string | null;
  created_at: string;
}

export interface OperatorCurrentStatus {
  user_id: string;
  status: OperatorStatus;
  status_started_at: string;
  company_id: string | null;
  updated_at: string;
}

export interface UserWithRole extends Profile {
  role?: AppRole;
}

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  PRE_ANALISE: 'Pré-Análise',
  AGUARDANDO_AUDITORIA: 'Aguardando Auditoria',
  PENDENCIA: 'Pendência',
  VENDA_AUDITADA: 'Venda Auditada',
  INSTALACAO_MARCADA: 'Instalação Marcada',
  INSTALADA: 'Instalada',
  CANCELADA: 'Cancelada',
  ACEITE_ENVIADO: 'Aceite Enviado',
  CHAMADO_EM_ABERTO: 'Chamado em Aberto',
  DESCONECTADO: 'Desconectado',
  ENVIADO_PARA_SAV: 'Enviado para SAV',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  CEO: 'CEO',
  COORDENADOR: 'Coordenador',
  BACKOFFICE: 'Qualidade',
  SUPERVISOR: 'Supervisor',
  SELLER: 'Vendedor',
};

export const OPERATOR_STATUS_LABELS: Record<OperatorStatus, string> = {
  DISPONIVEL: 'Disponível',
  EM_LIGACAO: 'Em Ligação',
  PAUSA: 'Pausa',
  ALMOCO: 'Almoço',
  OFFLINE: 'Offline',
  CADASTRO_VENDA: 'Cadastro de Venda',
};

export const OPERATOR_STATUS_COLORS: Record<OperatorStatus, string> = {
  DISPONIVEL: 'bg-green-500',
  EM_LIGACAO: 'bg-blue-500',
  PAUSA: 'bg-yellow-500',
  ALMOCO: 'bg-orange-500',
  OFFLINE: 'bg-gray-500',
  CADASTRO_VENDA: 'bg-purple-500',
};
