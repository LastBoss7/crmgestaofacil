
-- ============================================
-- PROTEÇÃO DE DADOS SENSÍVEIS
-- ============================================

-- 1. Função para mascarar CPF (mostra apenas últimos 4 dígitos)
CREATE OR REPLACE FUNCTION public.mask_cpf(cpf text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN cpf IS NULL OR length(cpf) < 4 THEN cpf
    ELSE '***.***.***-' || right(regexp_replace(cpf, '[^0-9]', '', 'g'), 2)
  END
$$;

-- 2. Função para mascarar RG
CREATE OR REPLACE FUNCTION public.mask_rg(rg text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN rg IS NULL OR length(rg) < 3 THEN rg
    ELSE '******-' || right(regexp_replace(rg, '[^0-9]', '', 'g'), 1)
  END
$$;

-- 3. Função para mascarar telefone (mostra apenas últimos 4 dígitos)
CREATE OR REPLACE FUNCTION public.mask_phone(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN phone IS NULL OR length(phone) < 4 THEN phone
    ELSE '(**) *****-' || right(regexp_replace(phone, '[^0-9]', '', 'g'), 4)
  END
$$;

-- 4. Função para mascarar email
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN email IS NULL OR position('@' in email) = 0 THEN email
    ELSE left(split_part(email, '@', 1), 2) || '***@' || split_part(email, '@', 2)
  END
$$;

-- 5. Função para mascarar CNPJ
CREATE OR REPLACE FUNCTION public.mask_cnpj(cnpj text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN cnpj IS NULL OR length(cnpj) < 4 THEN cnpj
    ELSE '**.***.***/' || right(regexp_replace(cnpj, '[^0-9]', '', 'g'), 6)
  END
$$;

-- 6. Função para verificar se usuário pode ver dados sensíveis
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id uuid, _seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- CEO e BACKOFFICE podem ver tudo
    has_role(_user_id, 'CEO'::app_role) 
    OR has_role(_user_id, 'BACKOFFICE'::app_role)
    -- Vendedor pode ver dados completos das próprias vendas
    OR _seller_id = _user_id
$$;

-- 7. Criar view segura de vendas
CREATE OR REPLACE VIEW public.sales_secure
WITH (security_invoker = on)
AS
SELECT 
  s.id,
  s.seller_id,
  s.company_id,
  s.campaign_id,
  s.data_venda,
  s.status,
  s.valor_mensal,
  s.equipe,
  s.tipo_negociacao,
  s.plano_contratado,
  s.produtos,
  s.observacoes_vendedor,
  s.motivo_pendencia,
  s.razao_social,
  s.nome_fantasia,
  s.contato_responsavel,
  s.created_at,
  s.updated_at,
  -- Campos de valor
  s.bl_valor,
  s.vivo_total_valor,
  s.movel_valor,
  -- Endereço (menos sensível)
  s.endereco_rua,
  s.endereco_numero,
  s.endereco_bairro,
  s.endereco_cidade,
  s.endereco_cep,
  s.documentos,
  
  -- CAMPOS SENSÍVEIS - Mascarados condicionalmente
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.cnpj_cliente ELSE mask_cnpj(s.cnpj_cliente) END as cnpj_cliente,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.email ELSE mask_email(s.email) END as email,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.telefone_responsavel ELSE mask_phone(s.telefone_responsavel) END as telefone_responsavel,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.telefone_1 ELSE mask_phone(s.telefone_1) END as telefone_1,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.telefone_2 ELSE mask_phone(s.telefone_2) END as telefone_2,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.telefone_portabilidade ELSE mask_phone(s.telefone_portabilidade) END as telefone_portabilidade,
  
  -- Proprietário
  s.proprietario_nome,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.proprietario_cpf ELSE mask_cpf(s.proprietario_cpf) END as proprietario_cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.proprietario_rg ELSE mask_rg(s.proprietario_rg) END as proprietario_rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.proprietario_mae ELSE '***PROTEGIDO***' END as proprietario_mae,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.proprietario_nascimento ELSE NULL END as proprietario_nascimento,
    
  -- Gestor
  s.gestor_nome,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.gestor_cpf ELSE mask_cpf(s.gestor_cpf) END as gestor_cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.gestor_rg ELSE mask_rg(s.gestor_rg) END as gestor_rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.gestor_mae ELSE '***PROTEGIDO***' END as gestor_mae,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.gestor_nascimento ELSE NULL END as gestor_nascimento,
    
  -- Cedente
  s.cedente_nome,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.cedente_cpf ELSE mask_cpf(s.cedente_cpf) END as cedente_cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.cedente_rg ELSE mask_rg(s.cedente_rg) END as cedente_rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.cedente_mae ELSE '***PROTEGIDO***' END as cedente_mae,
  CASE WHEN can_view_sensitive_data(auth.uid(), s.seller_id) 
    THEN s.cedente_nascimento ELSE NULL END as cedente_nascimento

FROM public.sales s;

-- 8. Comentário explicativo
COMMENT ON VIEW public.sales_secure IS 'View segura de vendas que mascara dados sensíveis (CPF, RG, telefones, etc.) para usuários não autorizados. CEO e BACKOFFICE veem tudo. SUPERVISOR vê dados mascarados. SELLER vê dados completos apenas das próprias vendas.';
