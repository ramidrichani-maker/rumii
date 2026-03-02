
-- Remove overly permissive insert policy
DROP POLICY "Service can insert messages" ON public.messages;
-- Allow authenticated users to insert messages (for the trigger, it bypasses RLS anyway)
-- But also allow users to send messages directly if needed
CREATE POLICY "Authenticated users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);
