import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Phone, Mail, MapPin, Loader2, User } from "lucide-react";
import { format } from "date-fns";

interface AgentEnquiry {
  id: string;
  sender_user_id: string;
  subject: string;
  body: string;
  created_at: string;
  read: boolean;
  senderProfile?: {
    full_name: string;
    phone_number: string;
    email?: string;
  };
}

export default function FindAgentRequestsManager() {
  const [enquiries, setEnquiries] = useState<AgentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnquiries();
  }, []);

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      // Get messages that are agent enquiries (subject starts with "New Agent Enquiry")
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .like("subject", "New Agent Enquiry%")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Deduplicate by sender + created_at (since one enquiry sends to multiple agents)
      const seen = new Set<string>();
      const unique = (messages || []).filter((msg) => {
        const key = `${msg.sender_user_id}_${msg.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Fetch sender profiles and emails
      const enriched = await Promise.all(
        unique.map(async (msg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone_number")
            .eq("user_id", msg.sender_user_id)
            .single();

          return {
            ...msg,
            senderProfile: profile
              ? { ...profile, email: undefined as string | undefined }
              : undefined,
          };
        })
      );

      // Extract email from message body for each enquiry
      const final = enriched.map((enq) => {
        const emailMatch = enq.body.match(/Email:\s*(.+)/);
        if (emailMatch && enq.senderProfile) {
          enq.senderProfile.email = emailMatch[1].trim();
        }
        return enq;
      });

      setEnquiries(final);
    } catch (error) {
      console.error("Error loading find agent requests:", error);
      toast({
        title: "Error",
        description: "Failed to load find agent requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseBody = (body: string) => {
    const fields: Record<string, string> = {};
    const lines = body.split("\n");
    for (const line of lines) {
      const match = line.match(/^-?\s*(.+?):\s*(.+)$/);
      if (match) {
        fields[match[1].trim()] = match[2].trim();
      }
    }
    return fields;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Find Agent Requests
        </CardTitle>
        <CardDescription>
          Enquiries from users looking to connect with an agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {enquiries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No find agent requests yet
          </p>
        ) : (
          <div className="space-y-4">
            {enquiries.map((enq) => {
              const fields = parseBody(enq.body);
              const clientName =
                enq.senderProfile?.full_name || fields["Client"] || "Unknown";
              const clientPhone =
                enq.senderProfile?.phone_number ||
                fields["Phone"] ||
                "Not provided";
              const clientEmail =
                enq.senderProfile?.email ||
                fields["Email"] ||
                "Not provided";
              const location = fields["Location"] || "Not specified";
              const searchRadius =
                fields["Search Radius"] || "Not specified";
              const agentType = fields["Agent Type"] || "Not specified";
              const preferredAgent = fields["Preferred Agent"];

              return (
                <div
                  key={enq.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold">{clientName}</h4>
                    </div>
                    <Badge variant="secondary">
                      {format(new Date(enq.created_at), "MMM dd, yyyy HH:mm")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {clientPhone && clientPhone !== "Not provided" && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{clientPhone}</span>
                      </div>
                    )}
                    {clientEmail && clientEmail !== "Not provided" && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{clientEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{location}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline">Radius: {searchRadius}</Badge>
                    <Badge variant="outline">Type: {agentType}</Badge>
                    {preferredAgent && (
                      <Badge variant="outline">
                        Preferred: {preferredAgent}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
