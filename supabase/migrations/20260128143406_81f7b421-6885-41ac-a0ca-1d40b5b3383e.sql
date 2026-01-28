
-- Fix: Revert Supervisor policies back to team-only visibility
-- Supervisor should only see their own team, not company-wide

-- Drop the incorrect company-wide Supervisor policies
DROP POLICY IF EXISTS "Supervisor can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Supervisor can view company roles" ON user_roles;
DROP POLICY IF EXISTS "Supervisor can view company teams" ON teams;

-- Recreate Supervisor policies with TEAM-ONLY visibility
CREATE POLICY "Supervisor can view team profiles" ON profiles
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);

-- Supervisor can view roles of users in their team only
CREATE POLICY "Supervisor can view team roles" ON user_roles
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND users_in_same_company(auth.uid(), user_id)
  AND (
    user_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.team_id = get_user_team(auth.uid())
    )
    OR user_id = auth.uid()
  )
);

-- Supervisor can only view their own team
CREATE POLICY "Supervisor can view own team" ON teams
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND id = get_user_team(auth.uid())
);
