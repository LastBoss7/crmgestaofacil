-- Update can_view_sensitive_data function to include COORDENADOR and SUPERVISOR roles
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id uuid, _seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- CEO, BACKOFFICE, COORDENADOR e SUPERVISOR podem ver tudo
    has_role(_user_id, 'CEO'::app_role) 
    OR has_role(_user_id, 'BACKOFFICE'::app_role)
    OR has_role(_user_id, 'COORDENADOR'::app_role)
    OR has_role(_user_id, 'SUPERVISOR'::app_role)
    -- Vendedor pode ver dados completos das próprias vendas
    OR _seller_id = _user_id
$$;