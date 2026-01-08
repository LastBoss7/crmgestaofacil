-- First, create the new enum type with call center terms
CREATE TYPE sale_status_new AS ENUM (
  'PRE_ANALISE',
  'AGUARDANDO_AUDITORIA', 
  'PENDENCIA',
  'VENDA_AUDITADA',
  'INSTALACAO_MARCADA',
  'INSTALADA',
  'CANCELADA'
);

-- Alter the sales table to use the new enum
ALTER TABLE public.sales 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.sales 
  ALTER COLUMN status TYPE sale_status_new 
  USING (
    CASE status::text
      WHEN 'NOVA' THEN 'PRE_ANALISE'::sale_status_new
      WHEN 'EM_ANALISE' THEN 'AGUARDANDO_AUDITORIA'::sale_status_new
      WHEN 'PENDENCIA' THEN 'PENDENCIA'::sale_status_new
      WHEN 'APROVADA' THEN 'VENDA_AUDITADA'::sale_status_new
      WHEN 'INSTALADA' THEN 'INSTALADA'::sale_status_new
      WHEN 'CANCELADA' THEN 'CANCELADA'::sale_status_new
      ELSE 'PRE_ANALISE'::sale_status_new
    END
  );

-- Set new default
ALTER TABLE public.sales 
  ALTER COLUMN status SET DEFAULT 'PRE_ANALISE'::sale_status_new;

-- Drop old enum and rename new one
DROP TYPE sale_status;
ALTER TYPE sale_status_new RENAME TO sale_status;