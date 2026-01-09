-- Create feedbacks table
CREATE TABLE public.feedbacks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_by_name TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    read_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- CEO can do everything with feedbacks
CREATE POLICY "CEO can manage all feedbacks"
ON public.feedbacks
FOR ALL
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

-- Backoffice can create feedbacks
CREATE POLICY "Backoffice can create feedbacks"
ON public.feedbacks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND created_by = auth.uid());

-- Backoffice can view feedbacks they created
CREATE POLICY "Backoffice can view own feedbacks"
ON public.feedbacks
FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND created_by = auth.uid());

-- Backoffice can update feedbacks they created (for read notification)
CREATE POLICY "Backoffice can update own feedbacks"
ON public.feedbacks
FOR UPDATE
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND created_by = auth.uid());

-- Sellers can view feedbacks sent to them
CREATE POLICY "Sellers can view their feedbacks"
ON public.feedbacks
FOR SELECT
USING (seller_id = auth.uid());

-- Sellers can update their feedbacks (to mark as read)
CREATE POLICY "Sellers can mark feedbacks as read"
ON public.feedbacks
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_feedbacks_updated_at
BEFORE UPDATE ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for feedbacks
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;