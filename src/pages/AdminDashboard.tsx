import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Home, Eye, UserCog, TrendingUp, Calendar, Trash2 } from "lucide-react";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import UserRoleManager from "@/components/UserRoleManager";
import UserAnalytics from "@/components/UserAnalytics";
import { AgentViewingStats } from "@/components/AgentViewingStats";
import PendingMediaApproval from "@/components/PendingMediaApproval";
import { PropertyDeleteDialog } from "@/components/PropertyDeleteDialog";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [pendingProperties, setPendingProperties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingProperties: 0,
    approvedProperties: 0,
    totalUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; address: string } | null>(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPendingProperties();
      loadUsers();
      loadAgents();
      loadViewings();
    }
  }, [user]);

  const loadPendingProperties = async () => {
    try {
      // Manual join to avoid relationship issues
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (propsError) throw propsError;

      // Fetch profile data separately and merge
      const propertiesWithProfiles = await Promise.all(
        (properties || []).map(async (property) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('user_id', property.user_id)
            .single();
          
          return {
            ...property,
            profiles: profile
          };
        })
      );
      setPendingProperties(propertiesWithProfiles || []);
      
      // Get stats
      const { data: allProps } = await supabase
        .from('properties')
        .select('id, status');
      
      if (allProps) {
        setStats({
          totalProperties: allProps.length,
          pendingProperties: allProps.filter(p => p.status === 'pending').length,
          approvedProperties: allProps.filter(p => p.status === 'approved').length,
          totalUsers: users.length
        });
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['agent', 'admin'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadViewings = async () => {
    try {
      const { data: viewingsData, error } = await supabase
        .from('property_viewings')
        .select('*')
        .order('viewing_date', { ascending: true })
        .order('viewing_time', { ascending: true });

      if (error) throw error;

      // Fetch related property and agent data
      const viewingsWithDetails = await Promise.all(
        (viewingsData || []).map(async (viewing) => {
          const { data: property } = await supabase
            .from('properties')
            .select('address, city, property_type, price, listing_type')
            .eq('id', viewing.property_id)
            .single();

          let agentProfile = null;
          if (viewing.agent_id) {
            const { data: agent } = await supabase
              .from('profiles')
              .select('full_name, phone_number')
              .eq('user_id', viewing.agent_id)
              .single();
            agentProfile = agent;
          }

          const { data: requester } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('user_id', viewing.user_id)
            .single();

          return {
            ...viewing,
            property,
            agent: agentProfile,
            requester
          };
        })
      );

      setViewings(viewingsWithDetails);
    } catch (error) {
      console.error('Error loading viewings:', error);
      toast({
        title: "Error",
        description: "Failed to load viewings",
        variant: "destructive",
      });
    }
  };

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'approved' })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property approved successfully",
      });

      loadPendingProperties();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error approving property:', error);
      toast({
        title: "Error",
        description: "Failed to approve property",
        variant: "destructive",
      });
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property rejected",
      });

      loadPendingProperties();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error rejecting property:', error);
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    }
  };

  const handleUpdateViewingStatus = async (viewingId: string, status: 'successful' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status })
        .eq('id', viewingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Viewing marked as ${status}`,
      });

      loadViewings();
    } catch (error) {
      console.error('Error updating viewing status:', error);
      toast({
        title: "Error",
        description: "Failed to update viewing status",
        variant: "destructive",
      });
    }
  };

  const handleAssignAgent = async (viewingId: string, agentId: string) => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ agent_id: agentId })
        .eq('id', viewingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent assigned successfully",
      });

      loadViewings();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: "Error",
        description: "Failed to assign agent",
        variant: "destructive",
      });
    }
  };

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
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

      loadPendingProperties();
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

  const isViewingPast = (viewingDate: string, viewingTime: string) => {
    const viewingDateTime = new Date(`${viewingDate}T${viewingTime}`);
    return viewingDateTime < new Date();
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Loading Admin Dashboard...</h2>
        <p className="text-muted-foreground">Please wait while we load your data</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage properties, users, and analytics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingProperties}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedProperties}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="viewings" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Viewings
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Agent Stats
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>Pending Properties</CardTitle>
                <CardDescription>Review and approve property listings</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingProperties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No pending properties</p>
                ) : (
                  <div className="space-y-4">
                    {pendingProperties.map((property) => (
                      <div key={property.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{property.address}</h3>
                            <p className="text-sm text-muted-foreground">{property.city}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{property.property_type}</span>
                              <span>{property.square_meters}m²</span>
                              <span>{property.bedrooms} bed</span>
                              <span>{property.bathrooms} bath</span>
                              <span>${property.price?.toLocaleString()}</span>
                            </div>
                            {property.profiles && (
                              <p className="text-sm text-muted-foreground">
                                Listed by: {property.profiles.full_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(property.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewProperty(property)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveProperty(property.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectProperty(property.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog({ id: property.id, address: property.address })}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle>Pending Media Approvals</CardTitle>
                <CardDescription>Review and approve photos/videos uploaded by property owners</CardDescription>
              </CardHeader>
              <CardContent>
                <PendingMediaApproval />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="viewings">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Viewings</CardTitle>
                <CardDescription>Manage property viewing appointments and agent assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {viewings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No scheduled viewings</p>
                ) : (
                  <div className="space-y-4">
                    {viewings.map((viewing) => (
                      <div key={viewing.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{viewing.property?.address}</h3>
                              <Badge variant="outline" className="font-normal">
                                {viewing.requester?.full_name || 'Unknown User'}
                              </Badge>
                              <Badge variant={
                                viewing.status === 'confirmed' ? 'default' :
                                viewing.status === 'cancelled' ? 'destructive' :
                                'secondary'
                              }>
                                {viewing.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{viewing.property?.city}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Date & Time</p>
                                <p className="font-medium">
                                  {format(new Date(viewing.viewing_date), 'MMM dd, yyyy')} at {viewing.viewing_time}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Property Details</p>
                                <p className="font-medium">
                                  {viewing.property?.property_type} - ${viewing.property?.price?.toLocaleString()} ({viewing.property?.listing_type})
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Requested by</p>
                                <p className="font-medium">{viewing.requester?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{viewing.requester?.phone_number}</p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground mb-1">Assigned Agent</p>
                                <Select
                                  value={viewing.agent_id || "none"}
                                  onValueChange={(value) => {
                                    if (value !== "none") {
                                      handleAssignAgent(viewing.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No agent assigned</SelectItem>
                                    {agents.map((agent) => (
                                      <SelectItem key={agent.user_id} value={agent.user_id}>
                                        {agent.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {viewing.agent && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {viewing.agent.phone_number}
                                  </p>
                                )}
                              </div>
                            </div>

                            {viewing.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-muted-foreground text-sm">Notes</p>
                                <p className="text-sm">{viewing.notes}</p>
                              </div>
                            )}

                            {/* Action Buttons for Past Viewings */}
                            {isViewingPast(viewing.viewing_date, viewing.viewing_time) && 
                             viewing.status === 'pending' && (
                              <div className="pt-3 border-t flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateViewingStatus(viewing.id, 'successful')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Mark Successful
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUpdateViewingStatus(viewing.id, 'cancelled')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Mark Cancelled
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <AgentViewingStats />
          </TabsContent>

          <TabsContent value="users">
            <UserRoleManager users={users} onUserUpdated={loadUsers} />
          </TabsContent>

          <TabsContent value="analytics">
            <UserAnalytics />
          </TabsContent>
        </Tabs>

        {/* Property Detail Modal */}
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onApprove={handleApproveProperty}
          onReject={handleRejectProperty}
          isAdmin={true}
        />

        {/* Delete Confirmation Dialog */}
        <PropertyDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteProperty}
          propertyAddress={propertyToDelete?.address || ""}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;