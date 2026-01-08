-- Create operator status enum
CREATE TYPE public.operator_status AS ENUM (
  'DISPONIVEL',
  'EM_LIGACAO', 
  'PAUSA',
  'ALMOCO',
  'OFFLINE'
);

-- Create table to track operator status changes
CREATE TABLE public.operator_status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status operator_status NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for current operator status (for quick lookup)
CREATE TABLE public.operator_current_status (
  user_id UUID NOT NULL PRIMARY KEY,
  status operator_status NOT NULL DEFAULT 'OFFLINE',
  status_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operator_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_current_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for operator_status_logs
CREATE POLICY "Users can insert own status logs"
ON public.operator_status_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own status logs"
ON public.operator_status_logs
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "CEO can view all status logs"
ON public.operator_status_logs
FOR SELECT
USING (has_role(auth.uid(), 'CEO'));

CREATE POLICY "Backoffice can view all status logs"
ON public.operator_status_logs
FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'));

CREATE POLICY "Users can update own status logs"
ON public.operator_status_logs
FOR UPDATE
USING (user_id = auth.uid());

-- RLS policies for operator_current_status
CREATE POLICY "Users can manage own current status"
ON public.operator_current_status
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "CEO can view all current statuses"
ON public.operator_current_status
FOR SELECT
USING (has_role(auth.uid(), 'CEO'));

CREATE POLICY "Backoffice can view all current statuses"
ON public.operator_current_status
FOR SELECT
USING (has_role(auth.uid(), 'BACKOFFICE'));

CREATE POLICY "Authenticated users can view all current statuses"
ON public.operator_current_status
FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_operator_status_logs_user_id ON public.operator_status_logs(user_id);
CREATE INDEX idx_operator_status_logs_started_at ON public.operator_status_logs(started_at);
CREATE INDEX idx_operator_status_logs_company_id ON public.operator_status_logs(company_id);
CREATE INDEX idx_operator_current_status_company_id ON public.operator_current_status(company_id);
CREATE INDEX idx_operator_current_status_status ON public.operator_current_status(status);

-- Enable realtime for current status
ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_current_status;