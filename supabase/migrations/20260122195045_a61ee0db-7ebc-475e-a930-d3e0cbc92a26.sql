
-- ============================================
-- CORREÇÕES DE SEGURANÇA RLS
-- ============================================

-- 1. FEEDBACKS: Remover política que permite CEO ver feedbacks de outras empresas
DROP POLICY IF EXISTS "CEO can manage all feedbacks" ON public.feedbacks;

-- 2. SALE_COMMENTS: Remover políticas permissivas demais
DROP POLICY IF EXISTS "Backoffice can view comments" ON public.sale_comments;
DROP POLICY IF EXISTS "Backoffice can insert comments" ON public.sale_comments;
DROP POLICY IF EXISTS "Supervisor can view comments" ON public.sale_comments;
DROP POLICY IF EXISTS "Supervisor can insert comments" ON public.sale_comments;
DROP POLICY IF EXISTS "Users can view company sale comments" ON public.sale_comments;

-- Criar políticas corretas para sale_comments
CREATE POLICY "Supervisor can view team sale comments"
ON public.sale_comments
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = sale_comments.sale_id 
    AND s.equipe = (SELECT p.team_id::text FROM profiles p WHERE p.id = auth.uid())
  )
);

CREATE POLICY "Supervisor can insert team sale comments"
ON public.sale_comments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Backoffice can insert team sale comments"
ON public.sale_comments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND user_id = auth.uid()
);

-- 3. SALE_HISTORY: Remover políticas permissivas demais
DROP POLICY IF EXISTS "Backoffice can view history" ON public.sale_history;
DROP POLICY IF EXISTS "Supervisor can view history" ON public.sale_history;
DROP POLICY IF EXISTS "Users can view company sale history" ON public.sale_history;

-- Criar política correta para supervisor ver histórico da equipe
CREATE POLICY "Supervisor can view team sale history"
ON public.sale_history
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = sale_history.sale_id 
    AND s.equipe = (SELECT p.team_id::text FROM profiles p WHERE p.id = auth.uid())
  )
);

-- 4. SALES: Remover políticas duplicadas/conflitantes de Backoffice
DROP POLICY IF EXISTS "Backoffice can view company sales" ON public.sales;
DROP POLICY IF EXISTS "Backoffice can update company sales" ON public.sales;

-- 5. SUPERVISOR: Restringir para ver apenas vendas da sua equipe
DROP POLICY IF EXISTS "Supervisor can view company sales" ON public.sales;
DROP POLICY IF EXISTS "Supervisor can update company sales" ON public.sales;

-- Criar políticas corretas para Supervisor (apenas sua equipe)
CREATE POLICY "Supervisor can view team sales"
ON public.sales
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND equipe = (SELECT p.team_id::text FROM profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Supervisor can update team sales"
ON public.sales
FOR UPDATE
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND equipe = (SELECT p.team_id::text FROM profiles p WHERE p.id = auth.uid())
);
