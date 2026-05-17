import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Home, Eye, Calendar, Star, Plus, Trash2, UserPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentPropertyForm from "@/components/AgentPropertyForm";
import { PropertyDeleteDialog } from "@/components/PropertyDeleteDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  listing_type: string;
  status: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  featured_section: string | null;
  created_at: string;
}

interface Agent {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
}

interface PropertyViewing {
  id: string;
  property_id: string;
  viewing_date: string;
  viewing_time: string;
  status: string;
  notes: string | null;
  property: {
    address: string;
    city: string;
  };
  profile: {
    full_name: string;
    phone_number: string;
  };
  agent: {
    full_name: string;
  } | null;
}

interface FeaturedRequest {
  id: string;
  property_id: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  requested_days?: number;
  property: {
    address: string;
    city: string;
  };
}

const AgencyPortal = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [agencyName, setAgencyName] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);
  const [featuredRequests, setFeaturedRequests] = useState<FeaturedRequest[]>([]);
  const [propertyAgents, setPropertyAgents] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; address: string } | null>(null);
  const [requestingFeature, setRequestingFeature] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!loading && user && profile && profile.role !== 'agency_manager') {
      navigate('/auth');
      return;
    }
    
    if (profile?.agency_id) {
      loadAgencyData();
    }
  }, [user, profile, loading, navigate]);

  const loadAgencyData = async () => {
    if (!profile?.agency_id) return;
    
    setIsLoading(true);
    try {
      // Fetch agency name
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', profile.agency_id)
        .single();
      
      if (agencyData) setAgencyName(agencyData.name);

      // Fetch agency properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false });
      
      if (propertiesData) setProperties(propertiesData);

      // Fetch agents in this agency
      const { data: agentsData } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, phone_number')
        .eq('agency_id', profile.agency_id)
        .eq('role', 'agent');
      
      if (agentsData) setAgents(agentsData);

      // Fetch property agent assignments for agency properties
      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map(p => p.id);
        const { data: assignmentsData } = await supabase
          .from('property_agents')
          .select('property_id, agent_id')
          .in('property_id', propertyIds);
        
        if (assignmentsData) {
          const assignments: Record<string, string[]> = {};
          assignmentsData.forEach(a => {
            if (!assignments[a.property_id]) assignments[a.property_id] = [];
            assignments[a.property_id].push(a.agent_id);
          });
          setPropertyAgents(assignments);
        }
      }

      // Fetch viewings for agency properties
      const { data: viewingsData } = await supabase
        .from('property_viewings')
        .select(`
          id,
          property_id,
          viewing_date,
          viewing_time,
          status,
          notes,
          property:properties!inner(address, city, agency_id),
          profile:profiles!property_viewings_user_id_fkey(full_name, phone_number),
          agent:profiles!property_viewings_agent_id_fkey(full_name)
        `)
        .eq('property.agency_id', profile.agency_id)
        .order('viewing_date', { ascending: false });
      
      if (viewingsData) {
        setViewings(viewingsData as unknown as PropertyViewing[]);
      }

      // Fetch featured requests
      const { data: requestsData } = await supabase
        .from('featured_requests')
        .select(`
          id,
          property_id,
          status,
          admin_notes,
          created_at,
          property:properties(address, city)
        `)
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false });
      
      if (requestsData) {
        setFeaturedRequests(requestsData as unknown as FeaturedRequest[]);
      }
    } catch (error) {
      console.error('Error loading agency data:', error);
      toast({
        title: "Error",
        description: "Failed to load agency data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignAgent = async (propertyId: string, agentId: string | null) => {
    if (!agentId || agentId === "none") {
      // Remove all agents from property
      const { error } = await supabase
        .from('property_agents')
        .delete()
        .eq('property_id', propertyId);
      
      if (error) {
        toast({ title: "Error", description: "Failed to remove agent", variant: "destructive" });
        return;
      }
      
      setPropertyAgents(prev => {
        const updated = { ...prev };
        delete updated[propertyId];
        return updated;
      });
    } else {
      // Remove existing and add new agent
      await supabase
        .from('property_agents')
        .delete()
        .eq('property_id', propertyId);
      
      const { error } = await supabase
        .from('property_agents')
        .insert({ property_id: propertyId, agent_id: agentId });
      
      if (error) {
        toast({ title: "Error", description: "Failed to assign agent", variant: "destructive" });
        return;
      }
      
      setPropertyAgents(prev => ({
        ...prev,
        [propertyId]: [agentId]
      }));
    }
    
    toast({ title: "Success", description: "Agent assignment updated" });
  };

  const handleDeleteProperty = async (reason: string) => {
    if (!propertyToDelete) return;
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyToDelete.id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete property", variant: "destructive" });
      return;
    }
    
    setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
    setDeleteDialogOpen(false);
    setPropertyToDelete(null);
    toast({ title: "Success", description: "Property deleted successfully" });
  };

  const handleRequestFeature = async (propertyId: string, days: number) => {
    if (!profile?.agency_id) return;
    
    setRequestingFeature(propertyId);
    
    try {
      const { error } = await supabase
        .from('featured_requests')
        .insert({
          property_id: propertyId,
          agency_id: profile.agency_id,
          requested_by: user!.id,
          requested_days: days,
        } as any);
      
      if (error) throw error;
      
      toast({ title: "Success", description: `Feature request for ${days} days submitted` });
      loadAgencyData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setRequestingFeature(null);
    }
  };

  const formatPrice = (price: number, listingType: string) => {
    const formatted = price.toLocaleString();
    return listingType === 'rent' ? `$${formatted}/mo` : `$${formatted}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
      completed: "outline",
      approved: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile?.agency_id) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle>No Agency Assigned</CardTitle>
            <CardDescription>
              You are not assigned to any real estate agency. Please contact an administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{agencyName}</h1>
              <p className="text-muted-foreground">Agency Management Portal</p>
            </div>
          </div>
          <Button onClick={loadAgencyData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Home className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{properties.length}</p>
                <p className="text-sm text-muted-foreground">Properties</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-sm text-muted-foreground">Agents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{viewings.length}</p>
                <p className="text-sm text-muted-foreground">Viewings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{properties.filter(p => p.featured_section).length}</p>
                <p className="text-sm text-muted-foreground">Featured</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="add-property">Add Property</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="viewings">Viewings</TabsTrigger>
            <TabsTrigger value="featured">Feature Requests</TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>Agency Properties</CardTitle>
                <CardDescription>Manage all properties under your agency</CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No properties yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Agent</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((property) => {
                        const assignedAgentId = propertyAgents[property.id]?.[0];
                        const assignedAgent = agents.find(a => a.user_id === assignedAgentId);
                        const hasPendingRequest = featuredRequests.some(
                          r => r.property_id === property.id && r.status === 'pending'
                        );
                        
                        return (
                          <TableRow key={property.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{property.address}</p>
                                <p className="text-sm text-muted-foreground">{property.city}</p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{property.property_type}</TableCell>
                            <TableCell>{formatPrice(property.price, property.listing_type)}</TableCell>
                            <TableCell>
                              {getStatusBadge(property.status)}
                              {property.featured_section && (
                                <Badge variant="default" className="ml-2">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={assignedAgentId || "none"}
                                onValueChange={(value) => handleAssignAgent(property.id, value === "none" ? null : value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Agent</SelectItem>
                                  {agents.map((agent) => (
                                    <SelectItem key={agent.user_id} value={agent.user_id}>
                                      {agent.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!property.featured_section && !hasPendingRequest && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={requestingFeature === property.id}
                                      >
                                        <Star className="h-4 w-4 mr-1" />
                                        Request Feature
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {[7, 14, 21, 30].map((d) => (
                                        <DropdownMenuItem key={d} onClick={() => handleRequestFeature(property.id, d)}>
                                          {d} days
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                {hasPendingRequest && (
                                  <Badge variant="secondary">Request Pending</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setPropertyToDelete({ id: property.id, address: property.address });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Property Tab */}
          <TabsContent value="add-property">
            <AgentPropertyForm />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Agency Agents</CardTitle>
                <CardDescription>Agents assigned to your agency</CardDescription>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No agents assigned to this agency yet. Contact an admin to assign agents.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {agents.map((agent) => {
                      const agentProperties = properties.filter(p => 
                        propertyAgents[p.id]?.includes(agent.user_id)
                      );
                      
                      return (
                        <Card key={agent.id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{agent.full_name}</p>
                                <p className="text-sm text-muted-foreground">{agent.phone_number}</p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {agentProperties.length} properties assigned
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Viewings Tab */}
          <TabsContent value="viewings">
            <Card>
              <CardHeader>
                <CardTitle>Property Viewings</CardTitle>
                <CardDescription>All viewings for your agency's properties</CardDescription>
              </CardHeader>
              <CardContent>
                {viewings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No viewings scheduled</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewings.map((viewing) => (
                        <TableRow key={viewing.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{viewing.property?.address}</p>
                              <p className="text-sm text-muted-foreground">{viewing.property?.city}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{viewing.profile?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{viewing.profile?.phone_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{new Date(viewing.viewing_date).toLocaleDateString()}</p>
                              <p className="text-sm text-muted-foreground">{viewing.viewing_time}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {viewing.agent?.full_name || <span className="text-muted-foreground">Unassigned</span>}
                          </TableCell>
                          <TableCell>{getStatusBadge(viewing.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Featured Requests Tab */}
          <TabsContent value="featured">
            <Card>
              <CardHeader>
                <CardTitle>Feature Requests</CardTitle>
                <CardDescription>Request properties to be featured on the homepage</CardDescription>
              </CardHeader>
              <CardContent>
                {featuredRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No feature requests yet. Request properties to be featured from the Properties tab.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Admin Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featuredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.property?.address}</p>
                              <p className="text-sm text-muted-foreground">{request.property?.city}</p>
                            </div>
                          </TableCell>
                          <TableCell>{request.requested_days ?? 7} days</TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {request.admin_notes || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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

export default AgencyPortal;
