
-- Platform reviews table (private to admin)
CREATE TABLE public.platform_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reviews" ON public.platform_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reviews" ON public.platform_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all platform reviews" ON public.platform_reviews
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete platform reviews" ON public.platform_reviews
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Support conversations table
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create support conversations" ON public.support_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own support conversations" ON public.support_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own support conversations" ON public.support_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all support conversations" ON public.support_conversations
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all support conversations" ON public.support_conversations
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete support conversations" ON public.support_conversations
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support agents can view assigned conversations" ON public.support_conversations
  FOR SELECT TO authenticated USING (agent_id = auth.uid() OR (status = 'waiting' AND has_role(auth.uid(), 'customer_support')));
CREATE POLICY "Support agents can update assigned conversations" ON public.support_conversations
  FOR UPDATE TO authenticated USING (agent_id = auth.uid() OR (status = 'waiting' AND has_role(auth.uid(), 'customer_support')));

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages in own conversations" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.support_conversations WHERE id = conversation_id AND (user_id = auth.uid() OR agent_id = auth.uid()))
  );
CREATE POLICY "Users can view messages in own conversations" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_conversations WHERE id = conversation_id AND (user_id = auth.uid() OR agent_id = auth.uid()))
  );
CREATE POLICY "Admins can view all support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete support messages" ON public.support_messages
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Support ratings table
CREATE TABLE public.support_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  rating_reasons text[],
  review_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);
ALTER TABLE public.support_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create support ratings" ON public.support_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own support ratings" ON public.support_ratings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all support ratings" ON public.support_ratings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete support ratings" ON public.support_ratings
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support agents can view own ratings" ON public.support_ratings
  FOR SELECT TO authenticated USING (agent_id = auth.uid());

-- Function to clean up old conversations (older than 1 week)
CREATE OR REPLACE FUNCTION public.cleanup_old_support_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can cleanup conversations';
  END IF;
  
  DELETE FROM public.support_conversations
  WHERE ended_at IS NOT NULL AND ended_at < now() - interval '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
