-- Allow agents to create feature requests for their assigned properties
CREATE POLICY "Agents can create feature requests for assigned properties"
ON public.featured_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM property_agents pa
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.agent_id = auth.uid()
      AND pa.property_id = featured_requests.property_id
      AND p.agency_id = featured_requests.agency_id
  )
);

-- Allow agents to view feature requests for their assigned properties
CREATE POLICY "Agents can view feature requests for assigned properties"
ON public.featured_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM property_agents pa
    WHERE pa.agent_id = auth.uid()
      AND pa.property_id = featured_requests.property_id
  )
);