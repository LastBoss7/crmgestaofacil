
-- Primeiro, dropar a função se existir para limpar qualquer estado
DROP FUNCTION IF EXISTS public.can_access_sale_document(uuid);

-- Criar a função de forma simples
CREATE FUNCTION public.can_access_sale_document(_sale_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_team_id uuid;
  v_team_id_str text;
  v_team_name text;
  v_role text;
  v_result boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user's company and team
  SELECT company_id, team_id 
  INTO v_company_id, v_team_id
  FROM profiles 
  WHERE id = v_user_id;
  
  -- Convert team_id to string for comparison
  IF v_team_id IS NOT NULL THEN
    v_team_id_str := v_team_id::text;
    SELECT name INTO v_team_name FROM teams WHERE id = v_team_id;
  ELSE
    v_team_id_str := '';
    v_team_name := '';
  END IF;
  
  -- Get user's role as text
  SELECT role::text INTO v_role FROM user_roles WHERE user_id = v_user_id;
  
  -- Check access based on role
  SELECT EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = _sale_id
    AND s.company_id = v_company_id
    AND (
      v_role = 'CEO'
      OR (v_role = 'BACKOFFICE' AND (s.equipe = v_team_name OR s.equipe = v_team_id_str))
      OR (v_role = 'SUPERVISOR' AND (s.equipe = v_team_name OR s.equipe = v_team_id_str))
      OR s.seller_id = v_user_id
    )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, false);
END;
$$;
