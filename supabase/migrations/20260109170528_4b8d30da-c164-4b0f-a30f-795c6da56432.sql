-- Fix the permissive notification insert policy
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;

CREATE POLICY "Users can create notifications for company"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  company_id IS NULL OR company_id = get_user_company_id(auth.uid())
);