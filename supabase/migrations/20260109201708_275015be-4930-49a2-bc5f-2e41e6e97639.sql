
-- Remover policies que dependem de team_invites
DROP POLICY IF EXISTS "Invited user can insert own role" ON public.user_roles;

-- Remover policies da tabela team_invites
DROP POLICY IF EXISTS "Anyone can view valid invite by code for signup" ON public.team_invites;
DROP POLICY IF EXISTS "Backoffice can manage company invites" ON public.team_invites;
DROP POLICY IF EXISTS "CEO can manage company invites" ON public.team_invites;
DROP POLICY IF EXISTS "Company owner can create invites" ON public.team_invites;
DROP POLICY IF EXISTS "Company owner can delete invites" ON public.team_invites;
DROP POLICY IF EXISTS "Company owner can view invites" ON public.team_invites;

-- Dropar a tabela team_invites
DROP TABLE IF EXISTS public.team_invites;
