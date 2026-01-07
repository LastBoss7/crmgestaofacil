-- Create sale_history table to track changes
CREATE TABLE public.sale_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL,
    changed_by_name TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "CEO can view all history"
ON public.sale_history
FOR SELECT
USING (has_role(auth.uid(), 'CEO'::app_role));

CREATE POLICY "Backoffice can view history"
ON public.sale_history
FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

CREATE POLICY "Seller can view own sale history"
ON public.sale_history
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_history.sale_id
    AND sales.seller_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert history"
ON public.sale_history
FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- Create index for better performance
CREATE INDEX idx_sale_history_sale_id ON public.sale_history(sale_id);
CREATE INDEX idx_sale_history_changed_at ON public.sale_history(changed_at DESC);

-- Enable realtime for sale_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_history;