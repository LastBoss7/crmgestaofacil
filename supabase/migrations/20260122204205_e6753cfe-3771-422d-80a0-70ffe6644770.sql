
-- ============================================
-- POLÍTICAS DE STORAGE sale-documents (CORRIGIDO)
-- ============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view authorized sale documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to authorized sales" ON storage.objects;
DROP POLICY IF EXISTS "Users can update authorized sale documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete sale documents" ON storage.objects;

-- 1. Política para VISUALIZAR documentos
CREATE POLICY "Users can view authorized sale documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sale-documents'
  AND public.can_access_sale_document(CAST((storage.foldername(name))[1] AS uuid))
);

-- 2. Política para UPLOAD de documentos
CREATE POLICY "Users can upload to authorized sales"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'sale-documents'
  AND public.can_access_sale_document(CAST((storage.foldername(name))[1] AS uuid))
);

-- 3. Política para ATUALIZAR documentos
CREATE POLICY "Users can update authorized sale documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'sale-documents'
  AND public.can_access_sale_document(CAST((storage.foldername(name))[1] AS uuid))
);

-- 4. Política para DELETAR documentos (CEO ou dono do arquivo)
-- owner_id é text, então precisamos converter auth.uid() para text
CREATE POLICY "Authorized users can delete sale documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'sale-documents'
  AND public.can_access_sale_document(CAST((storage.foldername(name))[1] AS uuid))
  AND (
    public.has_role(auth.uid(), 'CEO'::public.app_role)
    OR owner_id = auth.uid()::text
  )
);
