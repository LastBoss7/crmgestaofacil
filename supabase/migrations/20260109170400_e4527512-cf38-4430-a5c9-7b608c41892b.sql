-- Create security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Create helper function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND company_id = _company_id
  )
$$;

-- ============================================
-- FIX SALES TABLE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "CEO can view all sales" ON public.sales;
DROP POLICY IF EXISTS "CEO can update all sales" ON public.sales;
DROP POLICY IF EXISTS "CEO can delete sales" ON public.sales;
DROP POLICY IF EXISTS "CEO can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Backoffice can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Backoffice can update all sales" ON public.sales;
DROP POLICY IF EXISTS "Seller can view own sales only" ON public.sales;
DROP POLICY IF EXISTS "Seller can update own sales" ON public.sales;
DROP POLICY IF EXISTS "Seller can create own sales" ON public.sales;
DROP POLICY IF EXISTS "Super admin can view all sales" ON public.sales;

-- CEO policies with company isolation
CREATE POLICY "CEO can view company sales"
ON public.sales FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "CEO can insert company sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "CEO can update company sales"
ON public.sales FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "CEO can delete company sales"
ON public.sales FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Backoffice policies with company isolation
CREATE POLICY "Backoffice can view company sales"
ON public.sales FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can update company sales"
ON public.sales FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Seller policies with company isolation
CREATE POLICY "Seller can view own sales"
ON public.sales FOR SELECT TO authenticated
USING (
  seller_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Seller can create own sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (
  seller_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Seller can update own sales"
ON public.sales FOR UPDATE TO authenticated
USING (
  seller_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

-- Super admin keeps full access
CREATE POLICY "Super admin can view all sales"
ON public.sales FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage all sales"
ON public.sales FOR ALL TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================
-- FIX PROFILES TABLE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "CEO can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "CEO can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "CEO can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Backoffice can update seller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Backoffice can delete seller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Backoffice can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Supervisor can update team members profiles" ON public.profiles;

-- Company members can view profiles in their company
CREATE POLICY "Users can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  OR id = auth.uid()
);

-- CEO can manage profiles in their company
CREATE POLICY "CEO can manage company profiles"
ON public.profiles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Backoffice can manage profiles in their company
CREATE POLICY "Backoffice can update company profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can insert company profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- ============================================
-- FIX TEAMS TABLE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "CEO can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Backoffice can view all teams" ON public.teams;
DROP POLICY IF EXISTS "Supervisor can view own team" ON public.teams;
DROP POLICY IF EXISTS "Supervisor can update own team" ON public.teams;
DROP POLICY IF EXISTS "Sellers can view their team" ON public.teams;

CREATE POLICY "CEO can manage company teams"
ON public.teams FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can view company teams"
ON public.teams FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Supervisor can manage own team"
ON public.teams FOR ALL TO authenticated
USING (
  supervisor_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Sellers can view their team"
ON public.teams FOR SELECT TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.team_id = teams.id
  )
);

-- ============================================
-- FIX BROADCASTS TABLE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "CEO can manage broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Backoffice can create team broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Backoffice can manage own broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Backoffice can view own broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Backoffice can delete own broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Team members can view broadcasts" ON public.broadcasts;

CREATE POLICY "CEO can manage company broadcasts"
ON public.broadcasts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can manage own broadcasts"
ON public.broadcasts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND sender_id = auth.uid()
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can view company broadcasts"
ON public.broadcasts FOR SELECT TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- ============================================
-- FIX OTHER TABLES RLS POLICIES
-- ============================================

-- FEEDBACKS
DROP POLICY IF EXISTS "CEO and Backoffice can view all feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "CEO and Backoffice can create feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Sellers can view own feedbacks" ON public.feedbacks;

CREATE POLICY "CEO can manage company feedbacks"
ON public.feedbacks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can manage company feedbacks"
ON public.feedbacks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Sellers can view own feedbacks"
ON public.feedbacks FOR SELECT TO authenticated
USING (
  seller_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can view own company notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Authenticated can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- SALE_COMMENTS
DROP POLICY IF EXISTS "Users can view sale comments" ON public.sale_comments;
DROP POLICY IF EXISTS "Users can create sale comments" ON public.sale_comments;

CREATE POLICY "Users can view company sale comments"
ON public.sale_comments FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create company sale comments"
ON public.sale_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

-- SALE_HISTORY
DROP POLICY IF EXISTS "Users can view sale history" ON public.sale_history;
DROP POLICY IF EXISTS "System can create sale history" ON public.sale_history;

CREATE POLICY "Users can view company sale history"
ON public.sale_history FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Authenticated can create sale history"
ON public.sale_history FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- SELLER_GOALS
DROP POLICY IF EXISTS "CEO can manage seller goals" ON public.seller_goals;
DROP POLICY IF EXISTS "Backoffice can manage seller goals" ON public.seller_goals;
DROP POLICY IF EXISTS "Sellers can view own goals" ON public.seller_goals;

CREATE POLICY "CEO can manage company seller goals"
ON public.seller_goals FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can manage company seller goals"
ON public.seller_goals FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Sellers can view own goals"
ON public.seller_goals FOR SELECT TO authenticated
USING (
  seller_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

-- OPERATOR_CURRENT_STATUS
DROP POLICY IF EXISTS "Users can view operator status" ON public.operator_current_status;
DROP POLICY IF EXISTS "Users can manage own status" ON public.operator_current_status;

CREATE POLICY "Users can view company operator status"
ON public.operator_current_status FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage own status"
ON public.operator_current_status FOR ALL TO authenticated
USING (user_id = auth.uid());

-- OPERATOR_STATUS_LOGS
DROP POLICY IF EXISTS "CEO can view all status logs" ON public.operator_status_logs;
DROP POLICY IF EXISTS "Backoffice can view team status logs" ON public.operator_status_logs;
DROP POLICY IF EXISTS "Users can view own status logs" ON public.operator_status_logs;
DROP POLICY IF EXISTS "Users can create own status logs" ON public.operator_status_logs;

CREATE POLICY "CEO can view company status logs"
ON public.operator_status_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can view company status logs"
ON public.operator_status_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can manage own status logs"
ON public.operator_status_logs FOR ALL TO authenticated
USING (user_id = auth.uid());

-- DIRECT_MESSAGES
DROP POLICY IF EXISTS "CEO can view all direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Supervisor can view team direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can view own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send direct messages" ON public.direct_messages;

CREATE POLICY "CEO can view company direct messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can view own direct messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can send direct messages"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can update own received messages"
ON public.direct_messages FOR UPDATE TO authenticated
USING (
  receiver_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

-- TEAM_MESSAGES
DROP POLICY IF EXISTS "Users can view team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Users can send team messages" ON public.team_messages;

CREATE POLICY "Users can view company team messages"
ON public.team_messages FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can send team messages"
ON public.team_messages FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND company_id = get_user_company_id(auth.uid())
);

-- TEAM_INVITES
DROP POLICY IF EXISTS "CEO can manage team invites" ON public.team_invites;
DROP POLICY IF EXISTS "Backoffice can manage team invites" ON public.team_invites;
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.team_invites;

CREATE POLICY "CEO can manage company invites"
ON public.team_invites FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Backoffice can manage company invites"
ON public.team_invites FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Anyone can view invites by code"
ON public.team_invites FOR SELECT
USING (true);