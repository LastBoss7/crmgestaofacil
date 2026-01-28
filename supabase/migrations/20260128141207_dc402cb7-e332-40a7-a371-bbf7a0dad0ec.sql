
-- 13. Update sale_comments RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team sale comments" ON sale_comments
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = sale_comments.sale_id 
    AND (
      s.equipe IN (SELECT get_coordinator_team_ids(auth.uid())::text)
      OR s.equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_coordinator_team_ids(auth.uid())))
    )
  )
);

CREATE POLICY "Coordinator can insert sale comments" ON sale_comments
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id = auth.uid()
);

-- 14. Update sale_history RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team sale history" ON sale_history
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = sale_history.sale_id 
    AND (
      s.equipe IN (SELECT get_coordinator_team_ids(auth.uid())::text)
      OR s.equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_coordinator_team_ids(auth.uid())))
    )
  )
);

-- 15. Update operator_current_status RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team operator status" ON operator_current_status
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id IN (SELECT p.id FROM profiles p WHERE p.team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
);

-- 16. Update operator_status_logs RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team status logs" ON operator_status_logs
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id IN (SELECT p.id FROM profiles p WHERE p.team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
);

-- 17. Update sales_campaigns RLS for COORDENADOR
CREATE POLICY "Coordinator can view company campaigns" ON sales_campaigns
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);
