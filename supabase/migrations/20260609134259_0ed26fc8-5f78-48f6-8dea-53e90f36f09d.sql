CREATE TABLE public.property_move_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  meeting_id UUID,
  moved_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_move_ins TO authenticated;
GRANT ALL ON public.property_move_ins TO service_role;

ALTER TABLE public.property_move_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own move-ins"
ON public.property_move_ins FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all move-ins"
ON public.property_move_ins FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Property owners view move-ins for their properties"
ON public.property_move_ins FOR SELECT
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_property_move_ins_updated_at
BEFORE UPDATE ON public.property_move_ins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();