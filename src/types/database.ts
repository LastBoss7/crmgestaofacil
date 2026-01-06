export type AppRole = 'CEO' | 'BACKOFFICE' | 'SELLER';

export type SaleStatus = 'NOVA' | 'EM_ANALISE' | 'PENDENCIA' | 'APROVADA' | 'INSTALADA' | 'CANCELADA';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  active: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
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
  NOVA: 'Nova',
  EM_ANALISE: 'Em Análise',
  PENDENCIA: 'Pendência',
  APROVADA: 'Aprovada',
  INSTALADA: 'Instalada',
  CANCELADA: 'Cancelada',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  CEO: 'CEO',
  BACKOFFICE: 'Backoffice',
  SELLER: 'Vendedor',
};
