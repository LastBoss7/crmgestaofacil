
-- Remover definitivamente a policy problemática de team_invites
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.team_invites;

-- Remover a policy problemática de operator_current_status (pode já ter sido removida)
DROP POLICY IF EXISTS "Authenticated users can view all current statuses" ON public.operator_current_status;
