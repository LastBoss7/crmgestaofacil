
-- Create sales_campaigns table
CREATE TABLE public.sales_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  target_sales INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  company_id UUID REFERENCES public.companies(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create callbacks table
CREATE TABLE public.callbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  seller_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.sales_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_campaigns
CREATE POLICY "CEO can manage company campaigns"
ON public.sales_campaigns FOR ALL
USING (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can manage company campaigns"
ON public.sales_campaigns FOR ALL
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Sellers can view company campaigns"
ON public.sales_campaigns FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- RLS policies for callbacks
CREATE POLICY "CEO can manage company callbacks"
ON public.callbacks FOR ALL
USING (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Backoffice can view company callbacks"
ON public.callbacks FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Sellers can manage own callbacks"
ON public.callbacks FOR ALL
USING (seller_id = auth.uid() AND company_id = get_user_company_id(auth.uid()));

-- Create updated_at trigger for sales_campaigns
CREATE TRIGGER update_sales_campaigns_updated_at
BEFORE UPDATE ON public.sales_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for callbacks (for notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.callbacks;
