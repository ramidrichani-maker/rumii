
CREATE OR REPLACE FUNCTION public.auto_assign_support_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  available_agent_id uuid;
BEGIN
  -- Only fire on new conversations with 'waiting' status
  IF NEW.status != 'waiting' THEN
    RETURN NEW;
  END IF;

  -- Find a customer_support agent with fewest active (non-ended) conversations (round-robin)
  SELECT p.user_id INTO available_agent_id
  FROM profiles p
  WHERE p.role = 'customer_support'
  ORDER BY (
    SELECT COUNT(*) FROM support_conversations sc
    WHERE sc.agent_id = p.user_id AND sc.ended_at IS NULL
  ) ASC
  LIMIT 1;

  -- If an agent is found, assign them and set status to active
  IF available_agent_id IS NOT NULL THEN
    NEW.agent_id := available_agent_id;
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_assign_support_agent
  BEFORE INSERT ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_support_agent();
