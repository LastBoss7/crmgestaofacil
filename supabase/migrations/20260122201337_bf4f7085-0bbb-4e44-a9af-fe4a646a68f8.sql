
-- ============================================
-- CORREÇÕES COMPLETAS DE ISOLAMENTO POR EQUIPE
-- ============================================

-- 1. CALLBACKS: Restringir Supervisor e Backoffice para ver apenas callbacks da sua equipe
DROP POLICY IF EXISTS "Supervisor can view company callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "Backoffice can view company callbacks" ON public.callbacks;

CREATE POLICY "Supervisor can view team callbacks"
ON public.callbacks
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

CREATE POLICY "Backoffice can view team callbacks"
ON public.callbacks
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

-- 2. SELLER_GOALS: Restringir para ver apenas metas da equipe
DROP POLICY IF EXISTS "Backoffice can view company seller goals" ON public.seller_goals;
DROP POLICY IF EXISTS "Supervisor can manage company seller goals" ON public.seller_goals;

CREATE POLICY "Backoffice can view team seller goals"
ON public.seller_goals
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

CREATE POLICY "Supervisor can manage team seller goals"
ON public.seller_goals
FOR ALL
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

-- 3. OPERATOR_CURRENT_STATUS: Restringir para ver apenas status da equipe
DROP POLICY IF EXISTS "Backoffice can view all current statuses" ON public.operator_current_status;
DROP POLICY IF EXISTS "Supervisor can view all current statuses" ON public.operator_current_status;
DROP POLICY IF EXISTS "Users can view company operator status" ON public.operator_current_status;

CREATE POLICY "Backoffice can view team operator status"
ON public.operator_current_status
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

CREATE POLICY "Supervisor can view team operator status"
ON public.operator_current_status
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

-- Sellers só podem ver seu próprio status
CREATE POLICY "Sellers can view own operator status"
ON public.operator_current_status
FOR SELECT
USING (user_id = auth.uid());

-- 4. OPERATOR_STATUS_LOGS: Restringir para ver apenas logs da equipe
DROP POLICY IF EXISTS "Backoffice can view company status logs" ON public.operator_status_logs;
DROP POLICY IF EXISTS "Supervisor can view company status logs" ON public.operator_status_logs;

CREATE POLICY "Backoffice can view team status logs"
ON public.operator_status_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

CREATE POLICY "Supervisor can view team status logs"
ON public.operator_status_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

-- 5. TEAM_MESSAGES: Restringir para ver apenas mensagens da própria equipe
DROP POLICY IF EXISTS "Users can view company team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Company members can view team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Users can read team messages from their company or team" ON public.team_messages;

CREATE POLICY "Users can view own team messages"
ON public.team_messages
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    team_id IS NULL -- Mensagens para toda empresa
    OR team_id = get_user_team(auth.uid()) -- Ou da própria equipe
  )
);

-- Ajustar INSERT também
DROP POLICY IF EXISTS "Users can send team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Company members can insert team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Users can insert team messages in company or team" ON public.team_messages;

CREATE POLICY "Users can send team messages"
ON public.team_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND company_id = get_user_company_id(auth.uid())
  AND (
    team_id IS NULL -- Apenas CEO pode enviar para toda empresa (verificar em código)
    OR team_id = get_user_team(auth.uid()) -- Ou para própria equipe
  )
);

-- 6. PROFILES: Restringir visualização por equipe (exceto CEO)
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

-- CEO pode ver todos os perfis da empresa
CREATE POLICY "CEO can view company profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Supervisor pode ver perfis da sua equipe
CREATE POLICY "Supervisor can view team profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);

-- Backoffice pode ver perfis da sua equipe
CREATE POLICY "Backoffice can view team profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);

-- Seller pode ver próprio perfil e perfis da equipe (para chat)
CREATE POLICY "Seller can view team profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'SELLER'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);

-- Todos podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 7. TEAMS: Restringir visualização
DROP POLICY IF EXISTS "Supervisor can view company teams" ON public.teams;
DROP POLICY IF EXISTS "Backoffice can view company teams" ON public.teams;

-- Supervisor só vê sua própria equipe
CREATE POLICY "Supervisor can view own team"
ON public.teams
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND id = get_user_team(auth.uid())
);

-- Backoffice só vê sua própria equipe
CREATE POLICY "Backoffice can view own team"
ON public.teams
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND id = get_user_team(auth.uid())
);

-- 8. BROADCASTS: Adicionar filtro por equipe quando aplicável
DROP POLICY IF EXISTS "Users can view company broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Backoffice can view company broadcasts" ON public.broadcasts;

CREATE POLICY "Users can view relevant broadcasts"
ON public.broadcasts
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    team_id IS NULL -- Broadcast para toda empresa
    OR team_id = get_user_team(auth.uid()) -- Ou para própria equipe
  )
);

-- 9. FEEDBACKS: Garantir que Supervisor só veja feedbacks de vendedores da sua equipe
DROP POLICY IF EXISTS "Supervisor can manage company feedbacks" ON public.feedbacks;

CREATE POLICY "Supervisor can manage team feedbacks"
ON public.feedbacks
FOR ALL
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);

-- Backoffice também deve ser restrito à equipe
DROP POLICY IF EXISTS "Backoffice can view company feedbacks" ON public.feedbacks;

CREATE POLICY "Backoffice can view team feedbacks"
ON public.feedbacks
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND seller_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.team_id = get_user_team(auth.uid())
  )
);
