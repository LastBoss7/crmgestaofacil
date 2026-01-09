
-- Add campaign_id column to sales table
ALTER TABLE public.sales 
ADD COLUMN campaign_id UUID REFERENCES public.sales_campaigns(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_sales_campaign_id ON public.sales(campaign_id);
