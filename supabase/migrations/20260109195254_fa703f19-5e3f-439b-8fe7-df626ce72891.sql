
-- =====================================================
-- FIX 1: Corrigir team_invites - remover acesso público
-- =====================================================

-- Remover a policy que permite leitura pública de TODOS os convites
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.team_invites;

-- Manter a policy que permite ver convites válidos não usados (necessária para signup)
-- Mas adicionar uma restrição: só pode ver se tiver o código exato na query
-- A policy "Anyone can view valid invite by code for signup" já está correta

-- =====================================================
-- FIX 2: Corrigir operator_current_status - restringir por company_id
-- =====================================================

-- Remover a policy que permite leitura de TODOS os status por qualquer autenticado
DROP POLICY IF EXISTS "Authenticated users can view all current statuses" ON public.operator_current_status;

-- As policies existentes já cobrem:
-- - CEO can view all current statuses (com has_role check)
-- - Backoffice can view all current statuses (com has_role check) 
-- - Users can manage own current status (para o próprio usuário)
-- - Users can view company operator status (já tem company_id check)

-- Garantir que a policy de company está correta
DROP POLICY IF EXISTS "Users can view company operator status" ON public.operator_current_status;
CREATE POLICY "Users can view company operator status" 
ON public.operator_current_status 
FOR SELECT 
TO authenticated 
USING (company_id = get_user_company_id(auth.uid()));
