-- Fix BACKOFFICE RLS policies to correctly match by team names
-- The issue is that equipe column contains team NAMES, not UUIDs

-- Drop existing policies
DROP POLICY IF EXISTS "BACKOFFICE can view team sales" ON public.sales;
DROP POLICY IF EXISTS "BACKOFFICE can update team sales" ON public.sales;

-- Create corrected view policy for BACKOFFICE
CREATE POLICY "BACKOFFICE can view team sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    -- If backoffice has assigned teams, check against those team NAMES
    (
      EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid())
      AND equipe IN (
        SELECT t.name 
        FROM teams t 
        WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid()))
      )
    )
    -- Fallback: if no assigned teams, use profile's team
    OR (
      NOT EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid())
      AND (equipe = get_user_team(auth.uid())::text OR equipe = get_user_team_name(auth.uid()))
    )
  )
);

-- Create corrected update policy for BACKOFFICE
CREATE POLICY "BACKOFFICE can update team sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    (
      EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid())
      AND equipe IN (
        SELECT t.name 
        FROM teams t 
        WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid()))
      )
    )
    OR (
      NOT EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid())
      AND (equipe = get_user_team(auth.uid())::text OR equipe = get_user_team_name(auth.uid()))
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    (
      EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid())
      AND equipe IN (
        SELECT t.name 
        FROM teams t 
        WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid()))
      )
    )
    OR (
      NOT EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid())
      AND (equipe = get_user_team(auth.uid())::text OR equipe = get_user_team_name(auth.uid()))
    )
  )
);