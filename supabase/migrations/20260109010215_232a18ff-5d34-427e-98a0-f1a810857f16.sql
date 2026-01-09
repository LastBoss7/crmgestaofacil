-- Add company_id to sales table for multi-tenancy
ALTER TABLE public.sales ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Create index for performance
CREATE INDEX idx_sales_company_id ON public.sales(company_id);

-- Add company_id to seller_goals table
ALTER TABLE public.seller_goals ADD COLUMN company_id UUID REFERENCES public.companies(id);
CREATE INDEX idx_seller_goals_company_id ON public.seller_goals(company_id);

-- Add company_id to sale_comments table
ALTER TABLE public.sale_comments ADD COLUMN company_id UUID REFERENCES public.companies(id);
CREATE INDEX idx_sale_comments_company_id ON public.sale_comments(company_id);

-- Add company_id to sale_history table  
ALTER TABLE public.sale_history ADD COLUMN company_id UUID REFERENCES public.companies(id);
CREATE INDEX idx_sale_history_company_id ON public.sale_history(company_id);

-- Add company_id to notifications table
ALTER TABLE public.notifications ADD COLUMN company_id UUID REFERENCES public.companies(id);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- Add index on profiles company_id for faster joins
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Update existing sales with company_id from seller's profile
UPDATE public.sales s
SET company_id = p.company_id
FROM public.profiles p
WHERE s.seller_id = p.id AND s.company_id IS NULL;

-- Update existing seller_goals with company_id
UPDATE public.seller_goals sg
SET company_id = p.company_id
FROM public.profiles p
WHERE sg.seller_id = p.id AND sg.company_id IS NULL;

-- Update existing sale_comments with company_id from sale
UPDATE public.sale_comments sc
SET company_id = s.company_id
FROM public.sales s
WHERE sc.sale_id = s.id AND sc.company_id IS NULL;

-- Update existing sale_history with company_id from sale
UPDATE public.sale_history sh
SET company_id = s.company_id
FROM public.sales s
WHERE sh.sale_id = s.id AND sh.company_id IS NULL;

-- Update existing notifications with company_id from user's profile
UPDATE public.notifications n
SET company_id = p.company_id
FROM public.profiles p
WHERE n.user_id = p.id AND n.company_id IS NULL;