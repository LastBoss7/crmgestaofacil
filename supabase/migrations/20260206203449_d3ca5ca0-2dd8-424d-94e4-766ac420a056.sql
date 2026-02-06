
-- Drop the restrictive backoffice policy on teams
DROP POLICY "Backoffice can view own team" ON public.teams;

-- Create a new policy that allows backoffice to see all assigned teams
CREATE POLICY "Backoffice can view assigned teams"
ON public.teams
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    -- Teams assigned via backoffice_teams
    (has_backoffice_team_assignments(auth.uid()) AND id IN (SELECT get_backoffice_team_ids(auth.uid())))
    OR
    -- Fallback to own team if no assignments
    (NOT has_backoffice_team_assignments(auth.uid()) AND id = get_user_team(auth.uid()))
  )
);
