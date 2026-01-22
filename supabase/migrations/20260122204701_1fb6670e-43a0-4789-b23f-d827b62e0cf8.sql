
-- ============================================
-- REMOVER POLÍTICAS ANTIGAS PERMISSIVAS DE STORAGE
-- ============================================

-- Remover as políticas antigas que ainda estão ativas e permitem acesso amplo
DROP POLICY IF EXISTS "Authenticated users can delete sale documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update sale documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload sale documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view sale documents" ON storage.objects;
