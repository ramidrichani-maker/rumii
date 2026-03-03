import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Camera, MapPin, Phone, Mail, Calendar, Clock, User, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PhotographyRequest {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  city: string;
  municipality: string | null;
  property_type: string;
  property_size_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  special_requirements: string | null;
  full_service_listing: boolean;
  status: string;
  assigned_agent_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Agent {
  user_id: string;
  full_name: string;
}

export default function PhotographyRequestsManager() {
  const [requests, setRequests] = useState<PhotographyRequest[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    loadRequests();
    loadAgents();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('photography_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading photography requests:', error);
      toast({
        title: "Error",
        description: "Failed to load photography requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('role', ['agent', 'admin']);

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('photography_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      // Send confirmation email when photography request is scheduled or completed
      if (status === 'scheduled' || status === 'completed') {
        try {
          await supabase.functions.invoke('send-confirmation-email', {
            body: { type: 'photography', record_id: requestId },
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }
      }

      toast({
        title: "Success",
        description: `Request marked as ${status}`,
      });

      loadRequests();
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const assignAgent = async (requestId: string, agentId: string) => {
    try {
      const { error } = await supabase
        .from('photography_requests')
        .update({ assigned_agent_id: agentId, status: 'assigned' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent assigned successfully",
      });

      loadRequests();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: "Error",
        description: "Failed to assign agent",
        variant: "destructive",
      });
    }
  };

  const saveNotes = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('photography_requests')
        .update({ admin_notes: notesValue })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes saved",
      });

      setEditingNotes(null);
      loadRequests();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      assigned: "default",
      scheduled: "default",
      completed: "outline",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Pending",
      assigned: "Agent Assigned",
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getAssignedAgentName = (agentId: string | null) => {
    if (!agentId) return null;
    const agent = agents.find(a => a.user_id === agentId);
    return agent?.full_name || "Unknown Agent";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photography Requests
        </CardTitle>
        <CardDescription>
          Manage requests from customers who need professional photography services
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No photography requests yet
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{request.full_name}</h3>
                      {getStatusBadge(request.status)}
                      {request.full_service_listing && (
                        <Badge variant="outline" className="border-primary text-primary">
                          Full Service
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.phone_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {request.email}
                      </span>
                    </div>

                    <div className="flex items-start gap-1 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        {request.property_address}, {request.city}
                        {request.municipality && `, ${request.municipality}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="capitalize">{request.property_type}</span>
                      {request.property_size_sqm && (
                        <span>{request.property_size_sqm} m²</span>
                      )}
                      {request.bedrooms && (
                        <span>{request.bedrooms} bed</span>
                      )}
                      {request.bathrooms && (
                        <span>{request.bathrooms} bath</span>
                      )}
                    </div>

                    {(request.preferred_date || request.preferred_time) && (
                      <div className="flex items-center gap-4 text-sm">
                        {request.preferred_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.preferred_date), 'PPP')}
                          </span>
                        )}
                        {request.preferred_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {request.preferred_time}
                          </span>
                        )}
                      </div>
                    )}

                    {request.special_requirements && (
                      <div className="text-sm bg-muted/50 rounded p-2 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Special Requirements:</p>
                        <p>{request.special_requirements}</p>
                      </div>
                    )}

                    {request.assigned_agent_id && (
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <User className="h-3 w-3" />
                        Assigned to: {getAssignedAgentName(request.assigned_agent_id)}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(request.created_at), 'PPp')}
                    </p>
                  </div>
                </div>

                {/* Admin Notes Section */}
                <div className="border-t pt-4">
                  {editingNotes === request.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Add admin notes..."
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveNotes(request.id)}>
                          Save Notes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNotes(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => {
                        setEditingNotes(request.id);
                        setNotesValue(request.admin_notes || "");
                      }}
                    >
                      {request.admin_notes ? (
                        <p><span className="font-medium">Notes:</span> {request.admin_notes}</p>
                      ) : (
                        <p className="italic">Click to add notes...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                  {request.status === 'pending' && (
                    <Select
                      onValueChange={(value) => assignAgent(request.id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Assign Agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.user_id} value={agent.user_id}>
                            {agent.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {request.status !== 'completed' && request.status !== 'cancelled' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRequestStatus(request.id, 'scheduled')}
                        disabled={request.status === 'scheduled'}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Mark Scheduled
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateRequestStatus(request.id, 'completed')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateRequestStatus(request.id, 'cancelled')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
