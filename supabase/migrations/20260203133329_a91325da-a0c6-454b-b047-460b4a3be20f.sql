-- Add cancellation reason column to sales table
ALTER TABLE public.sales 
ADD COLUMN motivo_cancelamento text;

-- Add comment for documentation
COMMENT ON COLUMN public.sales.motivo_cancelamento IS 'Motivo obrigatório do cancelamento da venda';