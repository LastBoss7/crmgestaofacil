
-- Fix: Supervisor should be able to view ALL company profiles to manage users
-- But currently can only see team profiles

-- Drop the restrictive Supervisor policy for profiles
DROP POLICY IF EXISTS "Supervisor can view team profiles" ON profiles;

-- Create new policy that allows Supervisor to view ALL company profiles
CREATE POLICY "Supervisor can view company profiles" ON profiles
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Also fix the user_roles policy for Supervisor
-- Currently restricts to team members only, but needs to see all company roles to manage users
DROP POLICY IF EXISTS "Supervisor can view team roles" ON user_roles;

-- Create new policy that allows Supervisor to view all company user roles
CREATE POLICY "Supervisor can view company roles" ON user_roles
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND users_in_same_company(auth.uid(), user_id)
);

-- Fix Coordinator policies - should also see all assigned team profiles properly
-- The current coordinator policy is correct, but let's ensure it's working

-- Also ensure the teams table policies are correct for Supervisor
DROP POLICY IF EXISTS "Supervisor can view own team" ON teams;

-- Supervisor should be able to view ALL teams in their company to assign users
CREATE POLICY "Supervisor can view company teams" ON teams
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);
