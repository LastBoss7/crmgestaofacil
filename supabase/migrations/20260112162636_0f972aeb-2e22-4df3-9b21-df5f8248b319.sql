-- Dropar políticas existentes de insert do BACKOFFICE que podem estar conflitando
DROP POLICY IF EXISTS "Backoffice can insert seller roles" ON user_roles;
DROP POLICY IF EXISTS "Backoffice can insert seller roles for new users" ON user_roles;

-- Criar uma nova política mais clara para BACKOFFICE inserir roles SELLER
-- A política deve verificar se o usuário atual tem role BACKOFFICE e só permite inserir role SELLER
CREATE POLICY "Backoffice can create seller roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'SELLER'::app_role 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'BACKOFFICE'::app_role
  )
);