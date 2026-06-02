
-- direct_messages: remove weaker duplicates
DROP POLICY IF EXISTS "Users can view their own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update read status of received messages" ON public.direct_messages;

-- notifications: tighten insert to require same-company target user
DROP POLICY IF EXISTS "Users can create notifications for company" ON public.notifications;
CREATE POLICY "Users can create notifications for company"
ON public.notifications
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (
    user_id = auth.uid()
    OR users_in_same_company(auth.uid(), user_id)
  )
);

-- operator_current_status: CEO scoped to company
DROP POLICY IF EXISTS "CEO can view all current statuses" ON public.operator_current_status;
CREATE POLICY "CEO can view all current statuses"
ON public.operator_current_status
FOR SELECT
USING (
  has_role(auth.uid(), 'CEO'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

-- sale_comments: CEO scoped to company
DROP POLICY IF EXISTS "CEO can view all comments" ON public.sale_comments;
CREATE POLICY "CEO can view all comments"
ON public.sale_comments
FOR SELECT
USING (
  has_role(auth.uid(), 'CEO'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "CEO can insert comments" ON public.sale_comments;
CREATE POLICY "CEO can insert comments"
ON public.sale_comments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'CEO'::app_role)
  AND company_id = get_user_company_id(auth.uid())
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "CEO can delete comments" ON public.sale_comments;
CREATE POLICY "CEO can delete comments"
ON public.sale_comments
FOR DELETE
USING (
  has_role(auth.uid(), 'CEO'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

-- sale_history: CEO scoped to company
DROP POLICY IF EXISTS "CEO can view all history" ON public.sale_history;
CREATE POLICY "CEO can view all history"
ON public.sale_history
FOR SELECT
USING (
  has_role(auth.uid(), 'CEO'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

-- user_roles: tighten Coordinator/Supervisor INSERT/UPDATE/DELETE with company boundary
DROP POLICY IF EXISTS "Coordinator can create roles" ON public.user_roles;
CREATE POLICY "Coordinator can create roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Coordinator can update roles" ON public.user_roles;
CREATE POLICY "Coordinator can update roles"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
)
WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Coordinator can delete roles" ON public.user_roles;
CREATE POLICY "Coordinator can delete roles"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Supervisor can create roles" ON public.user_roles;
CREATE POLICY "Supervisor can create roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'SUPERVISOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Supervisor can update roles" ON public.user_roles;
CREATE POLICY "Supervisor can update roles"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
)
WITH CHECK (
  has_role(auth.uid(), 'SUPERVISOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Supervisor can delete roles" ON public.user_roles;
CREATE POLICY "Supervisor can delete roles"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role)
  AND role = ANY (ARRAY['SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role])
  AND users_in_same_company(auth.uid(), user_id)
);
