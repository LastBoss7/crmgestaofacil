-- SALES - SUPERVISOR tem mesmas permissões que BACKOFFICE tinha
DROP POLICY IF EXISTS "Backoffice can update company sales" ON sales;
DROP POLICY IF EXISTS "Backoffice can view company sales" ON sales;

CREATE POLICY "Supervisor can update company sales"
ON sales FOR UPDATE
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Supervisor can view company sales"
ON sales FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- BACKOFFICE (Qualidade) - pode ver e editar todas as vendas
CREATE POLICY "Backoffice can view company sales"
ON sales FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can update company sales"
ON sales FOR UPDATE
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- SALE COMMENTS
DROP POLICY IF EXISTS "Backoffice can insert comments" ON sale_comments;
DROP POLICY IF EXISTS "Backoffice can view comments" ON sale_comments;

CREATE POLICY "Supervisor can insert comments"
ON sale_comments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'SUPERVISOR'::app_role));

CREATE POLICY "Supervisor can view comments"
ON sale_comments FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role));

CREATE POLICY "Backoffice can insert comments"
ON sale_comments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'BACKOFFICE'::app_role));

CREATE POLICY "Backoffice can view comments"
ON sale_comments FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

-- SALE HISTORY
DROP POLICY IF EXISTS "Backoffice can view history" ON sale_history;

CREATE POLICY "Supervisor can view history"
ON sale_history FOR SELECT
USING (has_role(auth.uid(), 'SUPERVISOR'::app_role));

CREATE POLICY "Backoffice can view history"
ON sale_history FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));