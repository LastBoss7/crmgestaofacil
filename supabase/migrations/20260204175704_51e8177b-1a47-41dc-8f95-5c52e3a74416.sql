-- Add new sale status 'IMPUTADA' to the enum
ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'IMPUTADA';