-- BROADCASTS
DROP POLICY IF EXISTS "Backoffice can manage own broadcasts" ON broadcasts;
CREATE POLICY "Supervisor can manage own broadcasts"
ON broadcasts FOR ALL
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND sender_id = auth.uid() AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company broadcasts"
ON broadcasts FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()) AND is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- CALLBACKS
DROP POLICY IF EXISTS "Backoffice can view company callbacks" ON callbacks;
CREATE POLICY "Supervisor can view company callbacks"
ON callbacks FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company callbacks"
ON callbacks FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- FEEDBACKS
DROP POLICY IF EXISTS "Backoffice can manage company feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Backoffice can update own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Backoffice can view own feedbacks" ON feedbacks;

CREATE POLICY "Supervisor can manage company feedbacks"
ON feedbacks FOR ALL
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company feedbacks"
ON feedbacks FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- OPERATOR STATUS LOGS
DROP POLICY IF EXISTS "Backoffice can view all status logs" ON operator_status_logs;
DROP POLICY IF EXISTS "Backoffice can view company status logs" ON operator_status_logs;

CREATE POLICY "Supervisor can view company status logs"
ON operator_status_logs FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company status logs"
ON operator_status_logs FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- OPERATOR CURRENT STATUS
DROP POLICY IF EXISTS "Backoffice can view all current statuses" ON operator_current_status;

CREATE POLICY "Supervisor can view all current statuses"
ON operator_current_status FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view all current statuses"
ON operator_current_status FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "Backoffice can insert company profiles" ON profiles;
DROP POLICY IF EXISTS "Backoffice can update company profiles" ON profiles;

CREATE POLICY "Supervisor can insert company profiles"
ON profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Supervisor can update company profiles"
ON profiles FOR UPDATE
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));