-- Add documentos column to sales table
ALTER TABLE public.sales 
ADD COLUMN documentos text[] DEFAULT '{}'::text[];