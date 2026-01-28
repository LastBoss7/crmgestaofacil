
-- 5. Update sales RLS policies to include COORDENADOR
CREATE POLICY "Coordinator can view assigned team sales" ON sales
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    equipe IN (SELECT get_coordinator_team_ids(auth.uid())::text)
    OR equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_coordinator_team_ids(auth.uid())))
  )
);

CREATE POLICY "Coordinator can update assigned team sales" ON sales
FOR UPDATE USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    equipe IN (SELECT get_coordinator_team_ids(auth.uid())::text)
    OR equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_coordinator_team_ids(auth.uid())))
  )
);

-- 6. Update profiles RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team profiles" ON profiles
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id IN (SELECT get_coordinator_team_ids(auth.uid()))
);

CREATE POLICY "Coordinator can insert profiles" ON profiles
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Coordinator can update assigned team profiles" ON profiles
FOR UPDATE USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id IN (SELECT get_coordinator_team_ids(auth.uid()))
);

-- 7. Update user_roles RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team roles" ON user_roles
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND users_in_same_company(auth.uid(), user_id)
  AND (
    user_id IN (SELECT p.id FROM profiles p WHERE p.team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
    OR user_id = auth.uid()
  )
);

CREATE POLICY "Coordinator can create roles" ON user_roles
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);

CREATE POLICY "Coordinator can update roles" ON user_roles
FOR UPDATE USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);

CREATE POLICY "Coordinator can delete roles" ON user_roles
FOR DELETE USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);

-- 8. Update teams RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned teams" ON teams
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND id IN (SELECT get_coordinator_team_ids(auth.uid()))
);

-- 9. Update seller_goals RLS for COORDENADOR
CREATE POLICY "Coordinator can manage assigned team goals" ON seller_goals
FOR ALL USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (SELECT p.id FROM profiles p WHERE p.team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
);

-- 10. Update feedbacks RLS for COORDENADOR
CREATE POLICY "Coordinator can manage assigned team feedbacks" ON feedbacks
FOR ALL USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (SELECT p.id FROM profiles p WHERE p.team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
);

-- 11. Update broadcasts RLS for COORDENADOR
CREATE POLICY "Coordinator can manage broadcasts for assigned teams" ON broadcasts
FOR ALL USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (team_id IS NULL OR team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
  AND sender_id = auth.uid()
);

-- 12. Update callbacks RLS for COORDENADOR
CREATE POLICY "Coordinator can view assigned team callbacks" ON callbacks
FOR SELECT USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (SELECT p.id FROM profiles p WHERE p.team_id IN (SELECT get_coordinator_team_ids(auth.uid())))
);
