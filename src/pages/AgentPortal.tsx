import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { NotificationBell } from "@/components/NotificationBell";
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, Trash2, Home as HomeIcon, Plus, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { PropertyDeleteDialog } from "@/components/PropertyDeleteDialog";
import AgentPropertyForm from "@/components/AgentPropertyForm";

interface PropertyViewing {
  id: string;
  viewing_date: string;
  viewing_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'successful' | 'interested' | 'uninterested' | 'closed';
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
  } | null;
}

const AgentPortal = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [assignedProperties, setAssignedProperties] = useState<any[]>([]);
  const [featuredRequests, setFeaturedRequests] = useState<any[]>([]);
  const [requestingFeature, setRequestingFeature] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; address: string } | null>(null);

  // Check if user is agent or admin
  if (!user || (profile?.role !== 'agent' && profile?.role !== 'admin')) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchViewings();
    fetchAssignedProperties();
    fetchFeaturedRequests();
  }, [user]);

  const fetchViewings = async () => {
    try {
      const { data, error } = await supabase
        .from('property_viewings')
        .select(`
          *,
          properties(address, property_type, price, listing_type),
          profiles!property_viewings_user_id_fkey(full_name, phone_number)
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

  const fetchAssignedProperties = async () => {
    if (!user) return;

    try {
      const { data: assignments, error: assignError } = await supabase
        .from('property_agents')
        .select('property_id')
        .eq('agent_id', user.id);

      if (assignError) throw assignError;

      if (assignments && assignments.length > 0) {
        const propertyIds = assignments.map(a => a.property_id);
        
        const { data: properties, error: propsError } = await supabase
          .from('properties')
          .select('*')
          .in('id', propertyIds)
          .order('created_at', { ascending: false });

        if (propsError) throw propsError;
        setAssignedProperties(properties || []);
      }
    } catch (error) {
      console.error('Error fetching assigned properties:', error);
    }
  };

  const fetchFeaturedRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('featured_requests')
        .select('id, property_id, status, admin_notes, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFeaturedRequests(data || []);
    } catch (error) {
      console.error('Error fetching featured requests:', error);
    }
  };

  const handleRequestFeature = async (propertyId: string) => {
    if (!user || !profile?.agency_id) {
      toast({
        title: "Error",
        description: "You must be assigned to an agency to request features",
        variant: "destructive"
      });
      return;
    }
    
    setRequestingFeature(propertyId);
    
    try {
      const { error } = await supabase
        .from('featured_requests')
        .insert({
          property_id: propertyId,
          agency_id: profile.agency_id,
          requested_by: user.id
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Feature request submitted for admin approval"
      });
      
      fetchFeaturedRequests();
    } catch (error) {
      console.error('Error requesting feature:', error);
      toast({
        title: "Error",
        description: "Failed to submit feature request",
        variant: "destructive"
      });
    } finally {
      setRequestingFeature(null);
    }
  };

  const updateViewingStatus = async (viewingId: string, newStatus: 'confirmed' | 'cancelled' | 'successful' | 'interested' | 'uninterested' | 'closed') => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: newStatus })
        .eq('id', viewingId);

      if (error) throw error;

      // Send confirmation email when viewing is confirmed
      if (newStatus === 'confirmed') {
        try {
          await supabase.functions.invoke('send-confirmation-email', {
            body: { type: 'viewing', record_id: viewingId },
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }
      }

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

  const isViewingPast = (viewingDate: string, viewingTime: string) => {
    const viewingDateTime = new Date(`${viewingDate}T${viewingTime}`);
    const oneHourAfter = new Date(viewingDateTime.getTime() + 60 * 60 * 1000);
    return oneHourAfter < new Date();
  };

  const handleDeleteProperty = async (reason: string) => {
    if (!propertyToDelete) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Property deleted. Reason: ${reason}`,
      });

      fetchAssignedProperties();
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (property: { id: string; address: string }) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      completed: { variant: "outline" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
      successful: { variant: "default" as const, label: "Successful" },
      interested: { variant: "default" as const, label: "Interested Buyer" },
      uninterested: { variant: "outline" as const, label: "Uninterested" },
      closed: { variant: "default" as const, label: "Deal Closed" }
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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading agent portal...</p>
        </div>
      </div>
    );
  }

  const pendingViewings = viewings.filter(v => v.status === 'pending' && !isViewingPast(v.viewing_date, v.viewing_time));
  const confirmedViewings = viewings.filter(v => v.status === 'confirmed');
  const pastViewings = viewings.filter(v => 
    isViewingPast(v.viewing_date, v.viewing_time) || 
    v.status === 'completed' || 
    v.status === 'cancelled' ||
    v.status === 'successful' ||
    v.status === 'interested' ||
    v.status === 'uninterested' ||
    v.status === 'closed'
  );
  
  const viewingsOnSelectedDate = selectedDate
    ? confirmedViewings.filter(v => {
        const viewingDate = new Date(v.viewing_date);
        return viewingDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  const datesWithViewings = confirmedViewings.map(v => new Date(v.viewing_date));

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6 md:mb-8 gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">Agent Portal</h1>
            <p className="text-sm md:text-xl text-muted-foreground mt-1 md:mt-2">
              Manage viewings and client requests
            </p>
          </div>
          <NotificationBell />
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-6 gap-1 h-auto p-1">
            <TabsTrigger value="add" className="flex items-center gap-1 text-xs md:text-sm whitespace-nowrap px-2 md:px-3">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>List</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">
              Pending ({pendingViewings.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">
              Confirmed ({confirmedViewings.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">
              Properties ({assignedProperties.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">
              Past ({pastViewings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>List a New Property</CardTitle>
                <CardDescription>Add a property listing under your agency</CardDescription>
              </CardHeader>
              <CardContent>
                <AgentPropertyForm />
              </CardContent>
            </Card>
          </TabsContent>

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
                          <span>{viewing.profiles?.full_name || 'Unknown User'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            📞 {viewing.profiles?.phone_number || 'No phone number'}
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
                          <span>{viewing.profiles?.full_name || 'Unknown User'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            📞 {viewing.profiles?.phone_number || 'No phone number'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Viewing Calendar</CardTitle>
                  <CardDescription>
                    Select a date to view scheduled viewings
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border pointer-events-auto"
                    modifiers={{
                      hasViewing: datesWithViewings
                    }}
                    modifiersClassNames={{
                      hasViewing: "bg-primary/20 font-bold"
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Viewings on {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Selected Date'}
                  </CardTitle>
                  <CardDescription>
                    {viewingsOnSelectedDate.length} viewing(s) scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viewingsOnSelectedDate.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No viewings scheduled for this date
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {viewingsOnSelectedDate.map((viewing) => {
                        const { time } = formatDateTime(viewing.viewing_date, viewing.viewing_time);
                        return (
                          <Card key={viewing.id} className="border-green-200">
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">{time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">{viewing.properties.address}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">{viewing.profiles?.full_name || 'Unknown User'}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  📞 {viewing.profiles?.phone_number || 'No phone number'}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="properties" className="space-y-4">
            {assignedProperties.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No properties assigned to you</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {assignedProperties.map((property) => {
                  const hasPendingRequest = featuredRequests.some(
                    r => r.property_id === property.id && r.status === 'pending'
                  );
                  const isApproved = featuredRequests.some(
                    r => r.property_id === property.id && r.status === 'approved'
                  );
                  
                  return (
                    <Card key={property.id} className="overflow-hidden">
                      <div className="aspect-video relative bg-muted">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0]}
                            alt={property.address}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <HomeIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Badge>{property.status}</Badge>
                          {property.featured_section && (
                            <Badge variant="default" className="bg-amber-500">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{property.address}</CardTitle>
                        <CardDescription>
                          {property.city} • {property.property_type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {property.square_meters}m² • {property.bedrooms} bed • {property.bathrooms} bath
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-2xl font-bold">
                              ${property.price?.toLocaleString()}
                              {property.listing_type === 'rent' && '/mo'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {!property.featured_section && !hasPendingRequest && !isApproved && profile?.agency_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleRequestFeature(property.id)}
                                disabled={requestingFeature === property.id}
                              >
                                <Star className="w-4 h-4 mr-1" />
                                {requestingFeature === property.id ? 'Requesting...' : 'Request Feature'}
                              </Button>
                            )}
                            {hasPendingRequest && (
                              <Badge variant="secondary" className="flex-1 justify-center py-2">
                                Request Pending
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog({ id: property.id, address: property.address })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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
                          <span>{viewing.profiles?.full_name || 'Unknown User'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            📞 {viewing.profiles?.phone_number || 'No phone number'}
                          </span>
                        </div>
                      </div>

                      {viewing.status !== 'closed' && (
                        <div className="mt-4 pt-4 border-t flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateViewingStatus(viewing.id, 'uninterested')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Uninterested
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateViewingStatus(viewing.id, 'interested')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Interested
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateViewingStatus(viewing.id, 'closed')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Closed Deal
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PropertyDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteProperty}
        propertyAddress={propertyToDelete?.address || ""}
      />
    </div>
  );
};

export default AgentPortal;