import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationBell } from "@/components/NotificationBell";
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

interface PropertyViewing {
  id: string;
  viewing_date: string;
  viewing_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  properties: {
    address: string;
    property_type: string;
    price: number;
    listing_type: string;
  };
  profiles: {
    full_name: string;
    phone_number: string;
  };
}

const AgentPortal = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is agent or admin
  if (!user || (profile?.role !== 'agent' && profile?.role !== 'admin')) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchViewings();
  }, [user]);

  const fetchViewings = async () => {
    try {
      const { data, error } = await supabase
        .from('property_viewings')
        .select(`
          *,
          properties(address, property_type, price, listing_type),
          profiles(full_name, phone_number)
        `)
        .order('viewing_date', { ascending: true })
        .order('viewing_time', { ascending: true });

      if (error) throw error;
      setViewings(data || []);
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast({
        title: "Error",
        description: "Failed to load viewing requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateViewingStatus = async (viewingId: string, newStatus: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: newStatus })
        .eq('id', viewingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Viewing ${newStatus} successfully`,
      });

      fetchViewings();
    } catch (error) {
      console.error('Error updating viewing status:', error);
      toast({
        title: "Error",
        description: "Failed to update viewing status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      completed: { variant: "outline" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: number, listingType: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    return `${formatter.format(price)}${listingType === 'rent' ? '/mo' : ''}`;
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading agent portal...</p>
        </div>
      </div>
    );
  }

  const pendingViewings = viewings.filter(v => v.status === 'pending');
  const confirmedViewings = viewings.filter(v => v.status === 'confirmed');
  const pastViewings = viewings.filter(v => v.status === 'completed' || v.status === 'cancelled');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Agent Portal</h1>
            <p className="text-xl text-muted-foreground mt-2">
              Manage property viewings and client requests
            </p>
          </div>
          <NotificationBell />
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending Requests ({pendingViewings.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({confirmedViewings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Viewings ({pastViewings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingViewings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No pending viewing requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingViewings.map((viewing) => {
                const { date, time } = formatDateTime(viewing.viewing_date, viewing.viewing_time);
                return (
                  <Card key={viewing.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            {viewing.properties.address}
                          </CardTitle>
                          <CardDescription>
                            {viewing.properties.property_type} • {formatPrice(viewing.properties.price, viewing.properties.listing_type)}
                          </CardDescription>
                        </div>
                        {getStatusBadge(viewing.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{viewing.profiles.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            📞 {viewing.profiles.phone_number}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateViewingStatus(viewing.id, 'confirmed')}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm Viewing
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateViewingStatus(viewing.id, 'cancelled')}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            {confirmedViewings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No confirmed viewings</p>
                </CardContent>
              </Card>
            ) : (
              confirmedViewings.map((viewing) => {
                const { date, time } = formatDateTime(viewing.viewing_date, viewing.viewing_time);
                return (
                  <Card key={viewing.id} className="border-green-200">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            {viewing.properties.address}
                          </CardTitle>
                          <CardDescription>
                            {viewing.properties.property_type} • {formatPrice(viewing.properties.price, viewing.properties.listing_type)}
                          </CardDescription>
                        </div>
                        {getStatusBadge(viewing.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{viewing.profiles.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            📞 {viewing.profiles.phone_number}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastViewings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No past viewings</p>
                </CardContent>
              </Card>
            ) : (
              pastViewings.map((viewing) => {
                const { date, time } = formatDateTime(viewing.viewing_date, viewing.viewing_time);
                return (
                  <Card key={viewing.id} className="opacity-80">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            {viewing.properties.address}
                          </CardTitle>
                          <CardDescription>
                            {viewing.properties.property_type} • {formatPrice(viewing.properties.price, viewing.properties.listing_type)}
                          </CardDescription>
                        </div>
                        {getStatusBadge(viewing.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{viewing.profiles.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            📞 {viewing.profiles.phone_number}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AgentPortal;