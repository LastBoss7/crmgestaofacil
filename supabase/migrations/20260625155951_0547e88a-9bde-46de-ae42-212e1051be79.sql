
CREATE OR REPLACE FUNCTION public.can_access_sale_document(_sale_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_role text;
  v_sale_company uuid;
  v_sale_seller uuid;
  v_sale_equipe text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = v_user_id;
  SELECT role::text INTO v_role FROM user_roles WHERE user_id = v_user_id LIMIT 1;

  SELECT company_id, seller_id, equipe
    INTO v_sale_company, v_sale_seller, v_sale_equipe
  FROM sales WHERE id = _sale_id;

  IF v_sale_company IS NULL OR v_sale_company <> v_company_id THEN
    RETURN false;
  END IF;

  -- CEO: full access within company
  IF v_role = 'CEO' THEN
    RETURN true;
  END IF;

  -- Owner seller
  IF v_sale_seller = v_user_id THEN
    RETURN true;
  END IF;

  -- Match sale's equipe (which may be team name or UUID string) against
  -- any team the user is assigned to (primary team, coordinator_teams,
  -- backoffice_teams, or teams they supervise).
  RETURN EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.company_id = v_company_id
      AND (v_sale_equipe = t.name OR v_sale_equipe = t.id::text)
      AND (
        -- primary team
        t.id = (SELECT team_id FROM profiles WHERE id = v_user_id)
        -- supervisor of the team
        OR t.supervisor_id = v_user_id
        -- coordinator assignment
        OR EXISTS (SELECT 1 FROM coordinator_teams ct WHERE ct.coordinator_id = v_user_id AND ct.team_id = t.id)
        -- backoffice assignment
        OR EXISTS (SELECT 1 FROM backoffice_teams bt WHERE bt.backoffice_id = v_user_id AND bt.team_id = t.id)
      )
  );
END;
$function$;
