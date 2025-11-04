-- Add RLS policy for admins to delete any property
CREATE POLICY "Admins can delete any property"
ON public.properties
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add RLS policy for agents to delete properties they're assigned to
CREATE POLICY "Agents can delete assigned properties"
ON public.properties
FOR DELETE
USING (
  auth.uid() IN (
    SELECT agent_id 
    FROM property_agents 
    WHERE property_id = properties.id
  )
);