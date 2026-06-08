CREATE TABLE public.property_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('buy','rent')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_offers TO authenticated;
GRANT ALL ON public.property_offers TO service_role;
ALTER TABLE public.property_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own offers" ON public.property_offers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Property owners view offers on their properties" ON public.property_offers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Assigned agents view offers" ON public.property_offers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.property_agents pa WHERE pa.property_id = property_offers.property_id AND pa.agent_id = auth.uid())
  );
CREATE POLICY "Admins view all offers" ON public.property_offers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their own offers" ON public.property_offers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own pending offers" ON public.property_offers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own offers" ON public.property_offers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_property_offers_updated_at
  BEFORE UPDATE ON public.property_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();