-- Create storage bucket for sale documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-documents', 'sale-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the sale-documents bucket
-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload sale documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sale-documents');

-- Allow authenticated users to view sale documents
CREATE POLICY "Authenticated users can view sale documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sale-documents');

-- Allow authenticated users to update their own documents
CREATE POLICY "Authenticated users can update sale documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'sale-documents');

-- Allow authenticated users to delete sale documents
CREATE POLICY "Authenticated users can delete sale documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sale-documents');