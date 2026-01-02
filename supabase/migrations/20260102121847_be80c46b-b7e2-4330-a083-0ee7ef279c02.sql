-- Create broker_agreements table to track user acceptance for legal purposes
CREATE TABLE public.broker_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agreed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  agreement_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broker_agreements ENABLE ROW LEVEL SECURITY;

-- Users can create their own agreements
CREATE POLICY "Users can create broker agreements"
ON public.broker_agreements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own agreements
CREATE POLICY "Users can view own broker agreements"
ON public.broker_agreements
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all agreements
CREATE POLICY "Admins can view all broker agreements"
ON public.broker_agreements
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_broker_agreements_user_id ON public.broker_agreements(user_id);
CREATE INDEX idx_broker_agreements_property_id ON public.broker_agreements(property_id);