
-- Create a helper function to check if user has backoffice team assignments
CREATE OR REPLACE FUNCTION public.has_backoffice_team_assignments(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM backoffice_teams WHERE backoffice_id = _user_id
  )
$$;

-- Drop and recreate the BACKOFFICE sales policies using the new helper function
DROP POLICY IF EXISTS "BACKOFFICE can view team sales" ON public.sales;
DROP POLICY IF EXISTS "BACKOFFICE can update team sales" ON public.sales;

-- Recreate BACKOFFICE view policy with helper function
CREATE POLICY "BACKOFFICE can view team sales" ON public.sales
FOR SELECT USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    -- If user has specific team assignments, use those
    (
      has_backoffice_team_assignments(auth.uid()) 
      AND equipe IN (
        SELECT t.name FROM teams t 
        WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid()))
      )
    )
    -- Otherwise fall back to profile team
    OR (
      NOT has_backoffice_team_assignments(auth.uid())
      AND (equipe = get_user_team(auth.uid())::text OR equipe = get_user_team_name(auth.uid()))
    )
  )
);

-- Recreate BACKOFFICE update policy with helper function
CREATE POLICY "BACKOFFICE can update team sales" ON public.sales
FOR UPDATE USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    (
      has_backoffice_team_assignments(auth.uid()) 
      AND equipe IN (
        SELECT t.name FROM teams t 
        WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid()))
      )
    )
    OR (
      NOT has_backoffice_team_assignments(auth.uid())
      AND (equipe = get_user_team(auth.uid())::text OR equipe = get_user_team_name(auth.uid()))
    )
  )
) WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    (
      has_backoffice_team_assignments(auth.uid()) 
      AND equipe IN (
        SELECT t.name FROM teams t 
        WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid()))
      )
    )
    OR (
      NOT has_backoffice_team_assignments(auth.uid())
      AND (equipe = get_user_team(auth.uid())::text OR equipe = get_user_team_name(auth.uid()))
    )
  )
);
