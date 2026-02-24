import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AgentInfo {
  user_id: string;
  full_name: string;
  phone_number: string;
}

interface AgentContactBoxProps {
  propertyId: string;
  agencyId?: string | null;
}

const AgentContactBox = ({ propertyId, agencyId }: AgentContactBoxProps) => {
  const navigate = useNavigate();
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch agency name
      if (agencyId) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("name")
          .eq("id", agencyId)
          .single();
        if (agency) setAgencyName(agency.name);
      }

      // Fetch assigned agent
      const { data: assignment } = await supabase
        .from("property_agents")
        .select("agent_id")
        .eq("property_id", propertyId)
        .limit(1)
        .single();

      if (assignment) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone_number")
          .eq("user_id", assignment.agent_id)
          .single();
        if (profile) setAgent(profile);
      }

      setLoading(false);
    };

    fetchData();
  }, [propertyId, agencyId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 animate-pulse">
        <div className="h-5 bg-muted rounded w-2/3" />
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    );
  }

  if (!agent && !agencyName) return null;

  const handleCallClick = () => {
    if (!agent) return;
    if (showPhone) {
      window.location.href = `tel:${agent.phone_number}`;
    } else {
      setShowPhone(true);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {agencyName && (
        <div className="flex items-center gap-2 text-foreground">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">{agencyName}</span>
        </div>
      )}

      {agent && (
        <p className="text-sm text-muted-foreground">
          Agent: {agent.full_name}
        </p>
      )}

      {agent && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleCallClick}
        >
          <Phone className="w-4 h-4" />
          {showPhone ? agent.phone_number : "Call agent"}
        </Button>
      )}

      <Button
        className="w-full gap-2"
        onClick={() =>
          navigate(`/property/${propertyId}/enquiry`, {
            state: { agentId: agent?.user_id, agencyId },
          })
        }
      >
        <Mail className="w-4 h-4" />
        Email agent
      </Button>
    </div>
  );
};

export default AgentContactBox;
