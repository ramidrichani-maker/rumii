import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sofa, MapPin, Phone, Mail, Calendar, Clock, CheckCircle, XCircle, Loader2, CalendarClock } from "lucide-react";
import { format } from "date-fns";

interface InteriorDesignRequest {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  city: string;
  municipality: string | null;
  property_type: string;
  property_size_sqm: number | null;
  rooms_count: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: string;
  rescheduled_date: string | null;
  rescheduled_time: string | null;
  admin_notes: string | null;
  created_at: string;
}

export default function InteriorDesignRequestsManager() {
  const [requests, setRequests] = useState<InteriorDesignRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("interior_design_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests((data as InteriorDesignRequest[]) || []);
    } catch (error) {
      console.error("Error loading interior design requests:", error);
      toast({ title: "Error", description: "Failed to load interior design requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("interior_design_requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: `Request ${status}` });
    loadRequests();
  };

  const saveReschedule = async (id: string) => {
    if (!newDate) {
      toast({ title: "Pick a date", description: "Select a new date first", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("interior_design_requests")
      .update({ rescheduled_date: newDate, rescheduled_time: newTime || null, status: "rescheduled" })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to reschedule", variant: "destructive" });
      return;
    }
    toast({ title: "Rescheduled", description: "New visit date saved" });
    setReschedulingId(null);
    setNewDate("");
    setNewTime("");
    loadRequests();
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("interior_design_requests").update({ admin_notes: notesValue }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
      return;
    }
    setEditingNotes(null);
    loadRequests();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      accepted: "default",
      rescheduled: "outline",
      declined: "destructive",
      completed: "outline",
    };
    return <Badge variant={variants[status] || "secondary"} className="capitalize">{status}</Badge>;
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
          <Sofa className="h-5 w-5" />
          Interior Design Requests
        </CardTitle>
        <CardDescription>Requests from users for an interior designer visit</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No interior design requests yet</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{request.full_name}</h3>
                  {getStatusBadge(request.status)}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{request.phone_number}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{request.email}</span>
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
                  {request.property_size_sqm && <span>{request.property_size_sqm} m²</span>}
                  {request.rooms_count && <span>{request.rooms_count} rooms</span>}
                </div>

                {(request.preferred_date || request.preferred_time) && (
                  <div className="flex items-center gap-4 text-sm">
                    {request.preferred_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.preferred_date), "PPP")}
                      </span>
                    )}
                    {request.preferred_time && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{request.preferred_time}</span>
                    )}
                  </div>
                )}

                {request.rescheduled_date && (
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Rescheduled to {format(new Date(request.rescheduled_date), "PPP")}
                    {request.rescheduled_time && ` at ${request.rescheduled_time}`}
                  </div>
                )}

                {request.notes && (
                  <div className="text-sm bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">Client notes:</p>
                    <p>{request.notes}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(request.created_at), "PPp")}
                </p>

                <div className="border-t pt-3">
                  {editingNotes === request.id ? (
                    <div className="space-y-2">
                      <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={2} placeholder="Add admin notes..." />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveNotes(request.id)}>Save Notes</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => { setEditingNotes(request.id); setNotesValue(request.admin_notes || ""); }}
                    >
                      {request.admin_notes ? (
                        <p><span className="font-medium">Notes:</span> {request.admin_notes}</p>
                      ) : (
                        <p className="italic">Click to add notes...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  {reschedulingId === request.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-44" />
                      <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-32" />
                      <Button size="sm" onClick={() => saveReschedule(request.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setReschedulingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateStatus(request.id, "accepted")}
                        disabled={request.status === "accepted"}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setReschedulingId(request.id); setNewDate(request.rescheduled_date || request.preferred_date || ""); setNewTime(request.rescheduled_time || ""); }}>
                        <CalendarClock className="w-4 h-4 mr-1" />
                        Reschedule
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(request.id, "declined")} disabled={request.status === "declined"}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
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
