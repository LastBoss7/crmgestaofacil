-- Drop existing BACKOFFICE sales policies
DROP POLICY IF EXISTS "BACKOFFICE can view all company sales" ON public.sales;
DROP POLICY IF EXISTS "BACKOFFICE can update all company sales" ON public.sales;

-- BACKOFFICE can only view sales from their team
CREATE POLICY "BACKOFFICE can view team sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'BACKOFFICE') AND
  company_id = public.get_user_company_id(auth.uid()) AND
  equipe = public.get_user_team(auth.uid())::text
);

-- BACKOFFICE can only update sales from their team
CREATE POLICY "BACKOFFICE can update team sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'BACKOFFICE') AND
  company_id = public.get_user_company_id(auth.uid()) AND
  equipe = public.get_user_team(auth.uid())::text
)
WITH CHECK (
  public.has_role(auth.uid(), 'BACKOFFICE') AND
  company_id = public.get_user_company_id(auth.uid()) AND
  equipe = public.get_user_team(auth.uid())::text
);

-- Update sale_comments policies for BACKOFFICE
DROP POLICY IF EXISTS "BACKOFFICE can view all comments" ON public.sale_comments;

CREATE POLICY "BACKOFFICE can view team sale comments"
ON public.sale_comments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'BACKOFFICE') AND
  company_id = public.get_user_company_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
    AND s.equipe = public.get_user_team(auth.uid())::text
  )
);

-- Update sale_history policies for BACKOFFICE
DROP POLICY IF EXISTS "BACKOFFICE can view all history" ON public.sale_history;

CREATE POLICY "BACKOFFICE can view team sale history"
ON public.sale_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'BACKOFFICE') AND
  company_id = public.get_user_company_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
    AND s.equipe = public.get_user_team(auth.uid())::text
  )
);