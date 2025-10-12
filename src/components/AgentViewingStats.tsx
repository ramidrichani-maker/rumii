import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, User, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface AgentStats {
  agentId: string;
  agentName: string;
  totalViewings: number;
  upcomingViewings: number;
  pastViewings: number;
  interestedBuyers: number;
  uninterestedBuyers: number;
  closedDeals: number;
  viewings: any[];
}

export const AgentViewingStats = () => {
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentStats();
  }, []);

  const loadAgentStats = async () => {
    try {
      // Get all agents
      const { data: agents, error: agentsError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('role', ['agent', 'admin']);

      if (agentsError) throw agentsError;

      // Get all viewings
      const { data: viewings, error: viewingsError } = await supabase
        .from('property_viewings')
        .select(`
          *,
          properties(address, city, property_type, price, listing_type),
          profiles!property_viewings_user_id_fkey(full_name, phone_number)
        `)
        .order('viewing_date', { ascending: true });

      if (viewingsError) throw viewingsError;

      // Process stats for each agent
      const stats = (agents || []).map(agent => {
        const agentViewings = (viewings || []).filter(v => v.agent_id === agent.user_id);
        const now = new Date();

        const upcoming = agentViewings.filter(v => {
          const viewingDate = new Date(`${v.viewing_date}T${v.viewing_time}`);
          return viewingDate >= now;
        });

        const past = agentViewings.filter(v => {
          const viewingDate = new Date(`${v.viewing_date}T${v.viewing_time}`);
          return viewingDate < now;
        });

        return {
          agentId: agent.user_id,
          agentName: agent.full_name || 'Unknown Agent',
          totalViewings: agentViewings.length,
          upcomingViewings: upcoming.length,
          pastViewings: past.length,
          interestedBuyers: agentViewings.filter(v => v.status === 'interested').length,
          uninterestedBuyers: agentViewings.filter(v => v.status === 'uninterested').length,
          closedDeals: agentViewings.filter(v => v.status === 'closed').length,
          viewings: agentViewings
        };
      }).filter(stat => stat.totalViewings > 0); // Only show agents with viewings

      setAgentStats(stats);
    } catch (error) {
      console.error('Error loading agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      successful: { variant: "default", label: "Successful" },
      interested: { variant: "default", label: "Interested" },
      uninterested: { variant: "outline", label: "Uninterested" },
      closed: { variant: "default", label: "Closed Deal" }
    };
    
    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isViewingPast = (viewingDate: string, viewingTime: string) => {
    const viewingDateTime = new Date(`${viewingDate}T${viewingTime}`);
    return viewingDateTime < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading agent statistics...</p>
        </CardContent>
      </Card>
    );
  }

  if (agentStats.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No agent viewings found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {agentStats.map(agent => (
        <Card key={agent.agentId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {agent.agentName}
                </CardTitle>
                <CardDescription>Viewing Performance Summary</CardDescription>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{agent.totalViewings}</p>
                  <p className="text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{agent.interestedBuyers}</p>
                  <p className="text-muted-foreground">Interested</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{agent.closedDeals}</p>
                  <p className="text-muted-foreground">Closed</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="font-semibold">{agent.upcomingViewings}</p>
                  <p className="text-muted-foreground">Upcoming</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-semibold">{agent.pastViewings}</p>
                  <p className="text-muted-foreground">Past</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold">{agent.uninterestedBuyers}</p>
                  <p className="text-muted-foreground">Uninterested</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="font-semibold text-green-700 dark:text-green-400">{agent.closedDeals}</p>
                  <p className="text-muted-foreground">Deals Closed</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">All Viewings</h4>
                <div className="space-y-3">
                  {agent.viewings.map((viewing) => (
                    <div 
                      key={viewing.id} 
                      className={`border rounded-lg p-3 ${isViewingPast(viewing.viewing_date, viewing.viewing_time) ? 'bg-muted/50' : 'bg-background'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">{viewing.properties?.address}</span>
                            {getStatusBadge(viewing.status)}
                            {isViewingPast(viewing.viewing_date, viewing.viewing_time) && (
                              <Badge variant="outline">Past</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(viewing.viewing_date), 'MMM dd, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {viewing.viewing_time}
                            </span>
                            <span>
                              {viewing.profiles?.full_name || 'Unknown Client'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
