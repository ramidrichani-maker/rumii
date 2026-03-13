
-- Function to auto-assign an Oracle Estates agent to properties listed by non-agent users
CREATE OR REPLACE FUNCTION public.auto_assign_oracle_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  oracle_agency_id uuid;
  oracle_agent_id uuid;
  lister_role user_role;
BEGIN
  -- Get the lister's role
  SELECT role INTO lister_role FROM profiles WHERE user_id = NEW.user_id;
  
  -- Only auto-assign if lister is a regular 'user' (not agent/admin/agency_manager)
  IF lister_role IS DISTINCT FROM 'user' THEN
    RETURN NEW;
  END IF;
  
  -- Find Oracle Estates agency
  SELECT id INTO oracle_agency_id FROM agencies WHERE LOWER(name) = 'oracle estates' LIMIT 1;
  
  IF oracle_agency_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Set the agency_id on the property to Oracle Estates
  NEW.agency_id := oracle_agency_id;
  
  -- Find an Oracle Estates agent (round-robin: pick the one with fewest assignments)
  SELECT p.user_id INTO oracle_agent_id
  FROM profiles p
  WHERE p.agency_id = oracle_agency_id AND p.role = 'agent'
  ORDER BY (
    SELECT COUNT(*) FROM property_agents pa WHERE pa.agent_id = p.user_id
  ) ASC
  LIMIT 1;
  
  -- If an agent is found, create the assignment after insert (can't insert into property_agents here since property doesn't exist yet)
  -- We'll handle this in an AFTER trigger instead
  RETURN NEW;
END;
$$;

-- BEFORE INSERT trigger to set agency_id
CREATE TRIGGER trg_set_oracle_agency
  BEFORE INSERT ON properties
  FOR EACH ROW
  WHEN (NEW.agency_id IS NULL)
  EXECUTE FUNCTION auto_assign_oracle_agent();

-- AFTER INSERT trigger to assign the agent
CREATE OR REPLACE FUNCTION public.auto_assign_oracle_agent_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  oracle_agency_id uuid;
  oracle_agent_id uuid;
  lister_role user_role;
BEGIN
  -- Get the lister's role
  SELECT role INTO lister_role FROM profiles WHERE user_id = NEW.user_id;
  
  -- Only auto-assign if lister is a regular 'user'
  IF lister_role IS DISTINCT FROM 'user' THEN
    RETURN NEW;
  END IF;
  
  -- Find Oracle Estates agency
  SELECT id INTO oracle_agency_id FROM agencies WHERE LOWER(name) = 'oracle estates' LIMIT 1;
  
  IF oracle_agency_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find an Oracle Estates agent with fewest assignments (round-robin)
  SELECT p.user_id INTO oracle_agent_id
  FROM profiles p
  WHERE p.agency_id = oracle_agency_id AND p.role = 'agent'
  ORDER BY (
    SELECT COUNT(*) FROM property_agents pa WHERE pa.agent_id = p.user_id
  ) ASC
  LIMIT 1;
  
  -- Assign the agent if found
  IF oracle_agent_id IS NOT NULL THEN
    INSERT INTO property_agents (property_id, agent_id)
    VALUES (NEW.id, oracle_agent_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_oracle_agent
  AFTER INSERT ON properties
  FOR EACH ROW
  WHEN (NEW.agency_id IS NOT NULL)
  EXECUTE FUNCTION auto_assign_oracle_agent_after();
