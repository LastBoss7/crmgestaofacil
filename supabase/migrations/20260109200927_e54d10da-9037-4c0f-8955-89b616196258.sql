
-- Corrigir policy de company que deveria ser authenticated
DROP POLICY IF EXISTS "Super admin can update company active status" ON public.companies;
CREATE POLICY "Super admin can update company active status" ON public.companies
FOR UPDATE TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Corrigir policies de team_messages
DROP POLICY IF EXISTS "Company members can view team messages" ON public.team_messages;
CREATE POLICY "Company members can view team messages" ON public.team_messages
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = team_messages.company_id)
  OR EXISTS (SELECT 1 FROM companies WHERE companies.id = team_messages.company_id AND companies.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Company members can insert team messages" ON public.team_messages;
CREATE POLICY "Company members can insert team messages" ON public.team_messages
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND
  (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = team_messages.company_id)
    OR EXISTS (SELECT 1 FROM companies WHERE companies.id = team_messages.company_id AND companies.owner_id = auth.uid())
  )
);

-- Para team_invites, a policy de visualização para signup é necessária para o fluxo funcionar
-- Mas vamos torná-la mais segura, restringindo a info exposta através de RLS
-- A policy atual já restringe a convites não usados e não expirados

-- Para companies INSERT durante signup - é necessário e já tem check de owner_id = auth.uid()
-- O único risco é um usuário autenticado criar empresa sem ser owner - mas o check impede isso
