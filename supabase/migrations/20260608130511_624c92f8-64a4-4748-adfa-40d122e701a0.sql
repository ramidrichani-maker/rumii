
CREATE TABLE public.contract_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.property_offers(id) ON DELETE SET NULL,
  meeting_date DATE NOT NULL,
  time_preference TEXT NOT NULL CHECK (time_preference IN ('morning','afternoon','all_day')),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_meetings TO authenticated;
GRANT ALL ON public.contract_meetings TO service_role;

ALTER TABLE public.contract_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own meetings"
  ON public.contract_meetings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Property owners can view meetings for their properties"
  ON public.contract_meetings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins can view all meetings"
  ON public.contract_meetings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers can create their own meetings"
  ON public.contract_meetings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Buyers can update their own meetings"
  ON public.contract_meetings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Buyers can delete their own meetings"
  ON public.contract_meetings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_contract_meetings_updated_at
  BEFORE UPDATE ON public.contract_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
