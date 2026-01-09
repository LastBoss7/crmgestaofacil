
-- =====================================================
-- CORREÇÃO CRÍTICA: Garantir que TODAS as tabelas sensíveis
-- só permitam acesso a usuários AUTENTICADOS
-- =====================================================

-- PROFILES: Remover policies com roles public e recriar com authenticated
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

-- COMPANIES: Corrigir policies
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
CREATE POLICY "Company members can view their company" ON public.companies
FOR SELECT TO authenticated USING (
  (owner_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = companies.id))
);

DROP POLICY IF EXISTS "Owner can update company" ON public.companies;
CREATE POLICY "Owner can update company" ON public.companies
FOR UPDATE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Super admin can delete companies" ON public.companies;
CREATE POLICY "Super admin can delete companies" ON public.companies
FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can update all companies" ON public.companies;
CREATE POLICY "Super admin can update all companies" ON public.companies
FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all companies" ON public.companies;
CREATE POLICY "Super admin can view all companies" ON public.companies
FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

-- DIRECT_MESSAGES: Corrigir policies
DROP POLICY IF EXISTS "Users can view their own direct messages" ON public.direct_messages;
CREATE POLICY "Users can view their own direct messages" ON public.direct_messages
FOR SELECT TO authenticated USING ((sender_id = auth.uid()) OR (receiver_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update read status of received messages" ON public.direct_messages;
CREATE POLICY "Users can update read status of received messages" ON public.direct_messages
FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- FEEDBACKS: Corrigir policies
DROP POLICY IF EXISTS "Backoffice can update own feedbacks" ON public.feedbacks;
CREATE POLICY "Backoffice can update own feedbacks" ON public.feedbacks
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND (created_by = auth.uid()));

DROP POLICY IF EXISTS "Backoffice can view own feedbacks" ON public.feedbacks;
CREATE POLICY "Backoffice can view own feedbacks" ON public.feedbacks
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND (created_by = auth.uid()));

DROP POLICY IF EXISTS "CEO can manage all feedbacks" ON public.feedbacks;
CREATE POLICY "CEO can manage all feedbacks" ON public.feedbacks
FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "Sellers can mark feedbacks as read" ON public.feedbacks;
CREATE POLICY "Sellers can mark feedbacks as read" ON public.feedbacks
FOR UPDATE TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can view their feedbacks" ON public.feedbacks;
CREATE POLICY "Sellers can view their feedbacks" ON public.feedbacks
FOR SELECT TO authenticated USING (seller_id = auth.uid());

-- NOTIFICATIONS: Corrigir policies
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- OPERATOR_CURRENT_STATUS: Corrigir policies
DROP POLICY IF EXISTS "Backoffice can view all current statuses" ON public.operator_current_status;
CREATE POLICY "Backoffice can view all current statuses" ON public.operator_current_status
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "CEO can view all current statuses" ON public.operator_current_status;
CREATE POLICY "CEO can view all current statuses" ON public.operator_current_status
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "Users can manage own current status" ON public.operator_current_status;
CREATE POLICY "Users can manage own current status" ON public.operator_current_status
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- OPERATOR_STATUS_LOGS: Corrigir policies
DROP POLICY IF EXISTS "Backoffice can view all status logs" ON public.operator_status_logs;
CREATE POLICY "Backoffice can view all status logs" ON public.operator_status_logs
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "Users can insert own status logs" ON public.operator_status_logs;
CREATE POLICY "Users can insert own status logs" ON public.operator_status_logs
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own status logs" ON public.operator_status_logs;
CREATE POLICY "Users can update own status logs" ON public.operator_status_logs
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- SALE_COMMENTS: Corrigir policies
DROP POLICY IF EXISTS "Backoffice can insert comments" ON public.sale_comments;
CREATE POLICY "Backoffice can insert comments" ON public.sale_comments
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "Backoffice can view comments" ON public.sale_comments;
CREATE POLICY "Backoffice can view comments" ON public.sale_comments
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "CEO can delete comments" ON public.sale_comments;
CREATE POLICY "CEO can delete comments" ON public.sale_comments
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "CEO can insert comments" ON public.sale_comments;
CREATE POLICY "CEO can insert comments" ON public.sale_comments
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "CEO can view all comments" ON public.sale_comments;
CREATE POLICY "CEO can view all comments" ON public.sale_comments
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "Seller can insert comments on own sales" ON public.sale_comments;
CREATE POLICY "Seller can insert comments on own sales" ON public.sale_comments
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_comments.sale_id AND sales.seller_id = auth.uid()));

DROP POLICY IF EXISTS "Seller can view own sale comments" ON public.sale_comments;
CREATE POLICY "Seller can view own sale comments" ON public.sale_comments
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_comments.sale_id AND sales.seller_id = auth.uid()));

-- SALE_HISTORY: Corrigir policies
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.sale_history;
CREATE POLICY "Authenticated users can insert history" ON public.sale_history
FOR INSERT TO authenticated WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "Backoffice can view history" ON public.sale_history;
CREATE POLICY "Backoffice can view history" ON public.sale_history
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "CEO can view all history" ON public.sale_history;
CREATE POLICY "CEO can view all history" ON public.sale_history
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "Seller can view own sale history" ON public.sale_history;
CREATE POLICY "Seller can view own sale history" ON public.sale_history
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_history.sale_id AND sales.seller_id = auth.uid()));

-- SELLER_GOALS: Corrigir policies
DROP POLICY IF EXISTS "Backoffice can view goals" ON public.seller_goals;
CREATE POLICY "Backoffice can view goals" ON public.seller_goals
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "CEO can manage goals" ON public.seller_goals;
CREATE POLICY "CEO can manage goals" ON public.seller_goals
FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

-- SUPER_ADMINS: Corrigir policies
DROP POLICY IF EXISTS "Super admins can view super_admins" ON public.super_admins;
CREATE POLICY "Super admins can view super_admins" ON public.super_admins
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- TEAM_INVITES: Corrigir policies (manter anon para signup flow, mas restringir)
DROP POLICY IF EXISTS "Company owner can create invites" ON public.team_invites;
CREATE POLICY "Company owner can create invites" ON public.team_invites
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE companies.id = team_invites.company_id AND companies.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owner can delete invites" ON public.team_invites;
CREATE POLICY "Company owner can delete invites" ON public.team_invites
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = team_invites.company_id AND companies.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Company owner can view invites" ON public.team_invites;
CREATE POLICY "Company owner can view invites" ON public.team_invites
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = team_invites.company_id AND companies.owner_id = auth.uid()));

-- USER_ROLES: Corrigir policies críticas
DROP POLICY IF EXISTS "Backoffice can delete seller roles" ON public.user_roles;
CREATE POLICY "Backoffice can delete seller roles" ON public.user_roles
FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) AND 
  role = 'SELLER'::app_role AND 
  user_id IN (SELECT p.id FROM profiles p JOIN teams t ON p.team_id = t.id WHERE t.supervisor_id = auth.uid())
);

DROP POLICY IF EXISTS "Backoffice can insert seller roles" ON public.user_roles;
CREATE POLICY "Backoffice can insert seller roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (
  role = 'SELLER'::app_role AND 
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'BACKOFFICE'::app_role)
);

DROP POLICY IF EXISTS "Backoffice can insert seller roles for new users" ON public.user_roles;
CREATE POLICY "Backoffice can insert seller roles for new users" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (role = 'SELLER'::app_role AND has_role(auth.uid(), 'BACKOFFICE'::app_role));

DROP POLICY IF EXISTS "Backoffice can view seller roles" ON public.user_roles;
CREATE POLICY "Backoffice can view seller roles" ON public.user_roles
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND role = 'SELLER'::app_role);

DROP POLICY IF EXISTS "CEO can delete roles" ON public.user_roles;
CREATE POLICY "CEO can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "CEO can insert any role" ON public.user_roles;
CREATE POLICY "CEO can insert any role" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'CEO'::app_role));

DROP POLICY IF EXISTS "CEO can insert roles" ON public.user_roles;
CREATE POLICY "CEO can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "CEO can update roles" ON public.user_roles;
CREATE POLICY "CEO can update roles" ON public.user_roles
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));

DROP POLICY IF EXISTS "CEO can view all roles" ON public.user_roles;
CREATE POLICY "CEO can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Company owner can insert own CEO role" ON public.user_roles;
CREATE POLICY "Company owner can insert own CEO role" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND 
  role = 'CEO'::app_role AND 
  EXISTS (SELECT 1 FROM companies WHERE companies.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Invited user can insert own role" ON public.user_roles;
CREATE POLICY "Invited user can insert own role" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM team_invites WHERE team_invites.used_by = auth.uid() AND team_invites.role = user_roles.role)
);

DROP POLICY IF EXISTS "Super admin can view all user roles" ON public.user_roles;
CREATE POLICY "Super admin can view all user roles" ON public.user_roles
FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- TEAM_MESSAGES: Corrigir policies
DROP POLICY IF EXISTS "CEO can view all team messages" ON public.team_messages;
CREATE POLICY "CEO can view all team messages" ON public.team_messages
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'CEO'::app_role));
