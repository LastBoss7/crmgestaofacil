
-- 1. company_invite_codes: remove public SELECT (validation uses SECURITY DEFINER function)
DROP POLICY IF EXISTS "Anyone can check valid codes for signup" ON public.company_invite_codes;
REVOKE SELECT ON public.company_invite_codes FROM anon;

-- 2. notifications: remove weaker duplicate INSERT policy
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- 3. seller_goals: drop overly-broad CEO policy (sibling company-scoped one remains)
DROP POLICY IF EXISTS "CEO can manage goals" ON public.seller_goals;

-- 4. user_roles: tighten CEO update/delete to same company
DROP POLICY IF EXISTS "CEO can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "CEO can update roles" ON public.user_roles;

CREATE POLICY "CEO can delete roles in company"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'CEO'::app_role)
  AND public.users_in_same_company(auth.uid(), user_id)
);

CREATE POLICY "CEO can update roles in company"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'CEO'::app_role)
  AND public.users_in_same_company(auth.uid(), user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'CEO'::app_role)
  AND public.users_in_same_company(auth.uid(), user_id)
);

-- 5. user_roles: remove duplicate INSERT policy and add company scoping
DROP POLICY IF EXISTS "CEO can insert any role" ON public.user_roles;
DROP POLICY IF EXISTS "CEO can insert roles" ON public.user_roles;

CREATE POLICY "CEO can insert roles in company"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'CEO'::app_role)
  AND public.users_in_same_company(auth.uid(), user_id)
);
