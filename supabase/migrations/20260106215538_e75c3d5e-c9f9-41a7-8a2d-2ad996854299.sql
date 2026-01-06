-- Tabela de comentários/mensagens nas vendas
CREATE TABLE public.sale_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sale_comments ENABLE ROW LEVEL SECURITY;

-- CEO vê todos os comentários
CREATE POLICY "CEO can view all comments"
ON public.sale_comments
FOR SELECT
USING (has_role(auth.uid(), 'CEO'::app_role));

-- CEO pode fazer tudo
CREATE POLICY "CEO can insert comments"
ON public.sale_comments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

CREATE POLICY "CEO can delete comments"
ON public.sale_comments
FOR DELETE
USING (has_role(auth.uid(), 'CEO'::app_role));

-- Backoffice vê comentários das vendas que pode ver
CREATE POLICY "Backoffice can view comments"
ON public.sale_comments
FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

CREATE POLICY "Backoffice can insert comments"
ON public.sale_comments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'BACKOFFICE'::app_role));

-- Vendedor vê só comentários das suas vendas
CREATE POLICY "Seller can view own sale comments"
ON public.sale_comments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sales 
        WHERE sales.id = sale_comments.sale_id 
        AND sales.seller_id = auth.uid()
    )
);

CREATE POLICY "Seller can insert comments on own sales"
ON public.sale_comments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales 
        WHERE sales.id = sale_comments.sale_id 
        AND sales.seller_id = auth.uid()
    )
);

-- Atualizar política de UPDATE em sales para CEO poder tudo
DROP POLICY IF EXISTS "Update sales based on role" ON public.sales;

CREATE POLICY "CEO can do everything on sales"
ON public.sales
FOR ALL
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

CREATE POLICY "Backoffice can update sales"
ON public.sales
FOR UPDATE
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role));

CREATE POLICY "Seller can update own sales"
ON public.sales
FOR UPDATE
USING (seller_id = auth.uid());