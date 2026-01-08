-- Índices para otimizar performance em consultas frequentes de call center
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_seller_status ON public.sales(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON public.sales(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_data_venda ON public.sales(data_venda DESC);