export type AppRole = 'CEO' | 'BACKOFFICE' | 'SELLER';

export type SaleStatus = 'PRE_ANALISE' | 'AGUARDANDO_AUDITORIA' | 'PENDENCIA' | 'VENDA_AUDITADA' | 'INSTALACAO_MARCADA' | 'INSTALADA' | 'CANCELADA';

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
};

export const ROLE_LABELS: Record<AppRole, string> = {
  CEO: 'CEO',
  BACKOFFICE: 'Backoffice',
  SELLER: 'Vendedor',
};
