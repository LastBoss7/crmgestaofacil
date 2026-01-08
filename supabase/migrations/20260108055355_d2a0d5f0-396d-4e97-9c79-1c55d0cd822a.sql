-- Create table for seller monthly goals
CREATE TABLE public.seller_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  target_sales INTEGER NOT NULL DEFAULT 10,
  target_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, month, year)
);

-- Enable RLS
ALTER TABLE public.seller_goals ENABLE ROW LEVEL SECURITY;

-- CEO can do everything with goals
CREATE POLICY "CEO can manage goals"
ON public.seller_goals
FOR ALL
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

-- Backoffice can view goals
CREATE POLICY "Backoffice can view goals"
ON public.seller_goals
FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

-- Sellers can view their own goals
CREATE POLICY "Sellers can view own goals"
ON public.seller_goals
FOR SELECT
USING (seller_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_seller_goals_updated_at
BEFORE UPDATE ON public.seller_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();