-- Add DELETE policy for CEO on coordinator_teams (current policy is only ALL which should work, but let's be explicit)
-- First, let's check and add explicit policies

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "CEO can manage coordinator teams" ON coordinator_teams;

-- Create explicit policies for each operation
CREATE POLICY "CEO can select coordinator teams" ON coordinator_teams
FOR SELECT USING (
  has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "CEO can insert coordinator teams" ON coordinator_teams
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "CEO can update coordinator teams" ON coordinator_teams
FOR UPDATE USING (
  has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "CEO can delete coordinator teams" ON coordinator_teams
FOR DELETE USING (
  has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid())
);