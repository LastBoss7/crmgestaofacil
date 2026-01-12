-- SELLER GOALS
DROP POLICY IF EXISTS "Backoffice can manage company seller goals" ON seller_goals;
DROP POLICY IF EXISTS "Backoffice can view goals" ON seller_goals;

CREATE POLICY "Supervisor can manage company seller goals"
ON seller_goals FOR ALL
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company seller goals"
ON seller_goals FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- SALES CAMPAIGNS
DROP POLICY IF EXISTS "Backoffice can manage company campaigns" ON sales_campaigns;

CREATE POLICY "Supervisor can manage company campaigns"
ON sales_campaigns FOR ALL
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company campaigns"
ON sales_campaigns FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- TEAMS
DROP POLICY IF EXISTS "Backoffice can view company teams" ON teams;
DROP POLICY IF EXISTS "Supervisor can manage own team" ON teams;

CREATE POLICY "Supervisor can manage own team"
ON teams FOR ALL
USING (supervisor_id = auth.uid() AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Supervisor can view company teams"
ON teams FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company teams"
ON teams FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- USER ROLES - SUPERVISOR pode criar SELLER
DROP POLICY IF EXISTS "Backoffice can create seller roles" ON user_roles;
DROP POLICY IF EXISTS "Backoffice can delete seller roles" ON user_roles;
DROP POLICY IF EXISTS "Backoffice can view seller roles" ON user_roles;

CREATE POLICY "Supervisor can create seller roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (role = 'SELLER'::app_role AND has_role(auth.uid(), 'SUPERVISOR'::app_role));

CREATE POLICY "Supervisor can view seller roles"
ON user_roles FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND role = 'SELLER'::app_role);

CREATE POLICY "Supervisor can delete seller roles"
ON user_roles FOR DELETE
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND role = 'SELLER'::app_role);

CREATE POLICY "Backoffice can view all roles"
ON user_roles FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));