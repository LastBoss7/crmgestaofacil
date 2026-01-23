
-- Drop the existing policy
DROP POLICY IF EXISTS "Seller can update own sales" ON public.sales;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Seller can update own sales" 
ON public.sales 
FOR UPDATE 
USING ((seller_id = auth.uid()) AND (company_id = get_user_company_id(auth.uid())))
WITH CHECK ((seller_id = auth.uid()) AND (company_id = get_user_company_id(auth.uid())));
