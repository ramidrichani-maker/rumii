import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, Building2, CalendarCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ViewingBookingModal from "@/components/ViewingBookingModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AgentInfo {
  user_id: string;
  full_name: string;
  phone_number: string;
}

interface AgentContactBoxProps {
  propertyId: string;
  agencyId?: string | null;
  propertyAddress?: string;
  propertyType?: string;
  propertyPrice?: number;
  listingType?: string;
}

const AgentContactBox = ({ propertyId, agencyId, propertyAddress, propertyType, propertyPrice, listingType }: AgentContactBoxProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

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

  const displayAgencyName = agencyName || "Beiti";
  const displayPhone = agent?.phone_number || "+96170612686";
  const displayAgentName = agent?.full_name || "Beiti Agent";

  const cleanPhone = displayPhone.replace(/[^+\d]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <Building2 className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold">{displayAgencyName}</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Agent: {displayAgentName}
      </p>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => {
          if (!user) {
            setShowSignInPrompt(true);
            return;
          }
          setShowViewingModal(true);
        }}
      >
        <CalendarCheck className="w-4 h-4" />
        Request Viewing
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <Phone className="w-4 h-4" />
            Call agent
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => window.location.href = `tel:${cleanPhone}`}
          >
            <Phone className="w-4 h-4" />
            {displayPhone}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-green-600 hover:text-green-700"
            onClick={() => window.open(whatsappUrl, '_blank')}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
        </PopoverContent>
      </Popover>

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

      {showViewingModal && propertyAddress && propertyType && propertyPrice !== undefined && listingType && (
        <ViewingBookingModal
          isOpen={showViewingModal}
          onClose={() => setShowViewingModal(false)}
          property={{
            id: propertyId,
            address: propertyAddress,
            property_type: propertyType,
            price: propertyPrice,
            listing_type: listingType,
          }}
          agencyId={agencyId}
        />
      )}

      <AlertDialog open={showSignInPrompt} onOpenChange={setShowSignInPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign in to request a viewing</AlertDialogTitle>
            <AlertDialogDescription>
              You need an account to book a property viewing. Please sign in or create
              an account to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/auth")}>
              Sign in / Sign up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentContactBox;
