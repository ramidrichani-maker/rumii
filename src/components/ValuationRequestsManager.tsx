import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

interface ValuationRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  property_address: string;
  city: string;
  municipality: string | null;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_meters: number | null;
  preferred_date: string;
  preferred_time: string;
  additional_notes: string | null;
  status: string;
  admin_notes: string | null;
  assigned_agent_id: string | null;
  created_at: string;
}

interface Agent {
  user_id: string;
  full_name: string;
}

export default function ValuationRequestsManager() {
  const [requests, setRequests] = useState<ValuationRequest[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
    loadAgents();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("valuation_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as any);
      const notes: Record<string, string> = {};
      (data as any[]).forEach((r: any) => { notes[r.id] = r.admin_notes || ""; });
      setNotesMap(notes);
    }
    setLoading(false);
  };

  const loadAgents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("role", ["agent", "admin"]);
    if (data) setAgents(data);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("valuation_requests" as any)
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Status updated", description: `Request marked as ${status}` });

    // Send confirmation email when confirmed
    if (status === "confirmed") {
      await supabase.functions.invoke("send-confirmation-email", {
        body: { type: "valuation", record_id: id },
      });
    }

    loadRequests();
  };

  const assignAgent = async (id: string, agentId: string) => {
    const { error } = await supabase
      .from("valuation_requests" as any)
      .update({ assigned_agent_id: agentId, status: "assigned", updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Agent assigned" });
    loadRequests();
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase
      .from("valuation_requests" as any)
      .update({ admin_notes: notesMap[id], updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notes saved" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "assigned": return <Badge className="bg-blue-600">Assigned</Badge>;
      case "confirmed": return <Badge className="bg-green-600">Confirmed</Badge>;
      case "completed": return <Badge className="bg-emerald-700">Completed</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (time: string) => {
    const hour = parseInt(time.split(":")[0]);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour;
    return `${display}:00 ${suffix}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const pending = requests.filter(r => r.status === "pending" || r.status === "assigned");
  const processed = requests.filter(r => r.status !== "pending" && r.status !== "assigned");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5" />
          Valuation Requests
        </CardTitle>
        <CardDescription>Manage property valuation requests from users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No valuation requests yet</p>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Pending Requests ({pending.length})</h3>
                {pending.map(req => (
                  <div key={req.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-semibold">{req.property_address}, {req.city}</h4>
                        <p className="text-sm text-muted-foreground">
                          {req.property_type} · {req.square_meters ? `${req.square_meters}m²` : "N/A"} · {req.bedrooms ?? "?"} bed · {req.bathrooms ?? "?"} bath
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> {req.full_name}</div>
                      <div><span className="text-muted-foreground">Email:</span> {req.email}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {req.phone_number}</div>
                      <div><span className="text-muted-foreground">Date:</span> {format(new Date(req.preferred_date), "MMM dd, yyyy")} at {formatTime(req.preferred_time)}</div>
                    </div>
                    {req.additional_notes && (
                      <p className="text-sm bg-muted p-2 rounded"><strong>Notes:</strong> {req.additional_notes}</p>
                    )}

                    <div className="space-y-2">
                      <Select
                        value={req.assigned_agent_id || "none"}
                        onValueChange={(v) => v !== "none" && assignAgent(req.id, v)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Assign agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No agent</SelectItem>
                          {agents.map(a => (
                            <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Textarea
                        placeholder="Admin notes..."
                        value={notesMap[req.id] || ""}
                        onChange={e => setNotesMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => saveNotes(req.id)}>Save Notes</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(req.id, "confirmed")}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(req.id, "cancelled")}>
                          <XCircle className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {processed.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">History ({processed.length})</h3>
                {processed.map(req => (
                  <div key={req.id} className="border rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium text-sm">{req.property_address}, {req.city}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.full_name} · {format(new Date(req.preferred_date), "MMM dd, yyyy")} at {formatTime(req.preferred_time)}
                      </p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
