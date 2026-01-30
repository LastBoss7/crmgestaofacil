-- Add new status value to sale_status enum
ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'ENVIADO_PARA_SAV';