import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Home, Eye, UserCog, TrendingUp, Calendar, Trash2, Building, Star, Camera, Building2, Sparkles, Plus, FileSpreadsheet, Wand2, ListChecks, ClipboardCheck, Search, MessageSquare, HeadphonesIcon, ChevronDown } from "lucide-react";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import UserRoleManager from "@/components/UserRoleManager";
import UserAnalytics from "@/components/UserAnalytics";
import { AgentViewingStats } from "@/components/AgentViewingStats";
import PendingMediaApproval from "@/components/PendingMediaApproval";
import { PropertyDeleteDialog } from "@/components/PropertyDeleteDialog";
import AccountPropertiesView from "@/components/AccountPropertiesView";
import FeaturedListingsManager from "@/components/FeaturedListingsManager";
import PhotographyRequestsManager from "@/components/PhotographyRequestsManager";
import { AgencyManager } from "@/components/AgencyManager";
import FeatureRequestsManager from "@/components/FeatureRequestsManager";
import { ServicePricingManager } from "@/components/ServicePricingManager";
import { FeaturedBundlesManager } from "@/components/FeaturedBundlesManager";
import { AdminPropertyForm } from "@/components/AdminPropertyForm";
import { BulkPropertyImport } from "@/components/BulkPropertyImport";
import AdminAIRoomDesigner from "@/components/AdminAIRoomDesigner";
import { AdminPropertyListingsManager } from "@/components/AdminPropertyListingsManager";
import ValuationRequestsManager from "@/components/ValuationRequestsManager";
import FindAgentRequestsManager from "@/components/FindAgentRequestsManager";
import EmailBroadcastManager from "@/components/EmailBroadcastManager";
import { format } from "date-fns";
import { Mail } from "lucide-react";
import { SupportDashboard } from "@/components/SupportDashboard";

import { Navigate } from "react-router-dom";

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
  
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Loaders are declared later in the component; invoke via the
    // component closure on next microtask to avoid TDZ issues.
    Promise.resolve().then(() => {
      loadPendingProperties();
      loadUsers();
      loadAgents();
      loadViewings();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return null;
  if (profile.role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  const loadPendingProperties = async () => {
    try {
      // Manual join to avoid relationship issues
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (propsError) throw propsError;

      // Batch-fetch profiles in a single query to avoid N+1 latency
      const userIds = Array.from(new Set((properties || []).map((p: any) => p.user_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone_number')
          .in('user_id', userIds);
        profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.user_id, p]));
      }
      const propertiesWithProfiles = (properties || []).map((property: any) => ({
        ...property,
        profiles: profilesMap[property.user_id] || null,
      }));
      setPendingProperties(propertiesWithProfiles);
      
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
      const { data: agentProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['agent', 'admin'])
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Fetch agency names for agents
      const agentsWithAgency = await Promise.all(
        (agentProfiles || []).map(async (agent) => {
          let agency_name = null;
          if (agent.agency_id) {
            const { data: agency } = await supabase
              .from('agencies')
              .select('name')
              .eq('id', agent.agency_id)
              .single();
            agency_name = agency?.name || null;
          }
          return { ...agent, agency_name };
        })
      );

      setAgents(agentsWithAgency);
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

  // Render immediately; individual sections show their own loading state.

  return (
    <div className="min-h-screen bg-transparent">
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

        {/* Row 1: Property Management */}
        <Collapsible className="mb-8 group/section">
          <CollapsibleTrigger className="w-full flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Home className="w-5 h-5" />
              Property Management
            </h2>
            <ChevronDown className="w-5 h-5 transition-transform group-data-[state=open]/section:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Tabs defaultValue="properties" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="properties" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Pending</span>
                </TabsTrigger>
                <TabsTrigger value="all-listings" className="flex items-center gap-1 text-xs sm:text-sm">
                  <ListChecks className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">All</span>
                </TabsTrigger>
                <TabsTrigger value="add-property" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Media</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="properties">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Properties</CardTitle>
                    <CardDescription>Review and approve property listings</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[500px] overflow-y-auto">
                    {pendingProperties.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No pending properties</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingProperties.map((property) => (
                          <div key={property.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div className="space-y-1">
                                <h3 className="font-semibold">{property.address}</h3>
                                <p className="text-sm text-muted-foreground">{property.city}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                  <span>{property.property_type}</span>
                                  <span>{property.square_meters}m²</span>
                                  <span>{property.bedrooms} bed</span>
                                  <span>${property.price?.toLocaleString()}</span>
                                </div>
                                {property.profiles && (
                                  <p className="text-sm text-muted-foreground">
                                    Listed by: {property.profiles.full_name}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => handleViewProperty(property)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" onClick={() => handleApproveProperty(property.id)} className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectProperty(property.id)}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openDeleteDialog({ id: property.id, address: property.address })}>
                                  <Trash2 className="w-4 h-4" />
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

              <TabsContent value="all-listings">
                <div className="max-h-[600px] overflow-y-auto">
                  <AdminPropertyListingsManager />
                </div>
              </TabsContent>

              <TabsContent value="add-property">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Property</CardTitle>
                    <CardDescription>List a property on behalf of any agency</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto">
                    <AdminPropertyForm />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Media Approvals</CardTitle>
                    <CardDescription>Review and approve photos/videos</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[500px] overflow-y-auto">
                    <PendingMediaApproval />
                  </CardContent>
                </Card>
              </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Row 1.2: Property Extras */}
        <div className="mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Property Extras
            </h2>
            <Tabs defaultValue="ai-designer" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="ai-designer" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Wand2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">AI Design</span>
                </TabsTrigger>
                <TabsTrigger value="featured" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Featured</span>
                </TabsTrigger>
                <TabsTrigger value="feature-requests" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Requests</span>
                </TabsTrigger>
                <TabsTrigger value="bulk-import" className="flex items-center gap-1 text-xs sm:text-sm">
                  <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Import</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai-designer">
                <div className="max-h-[600px] overflow-y-auto">
                  <AdminAIRoomDesigner />
                </div>
              </TabsContent>

              <TabsContent value="featured">
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  <ServicePricingManager />
                  <FeaturedBundlesManager />
                  <Card>
                    <CardHeader>
                      <CardTitle>Featured Listings</CardTitle>
                      <CardDescription>Choose which properties appear on the homepage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FeaturedListingsManager />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="feature-requests">
                <div className="max-h-[500px] overflow-y-auto">
                  <FeatureRequestsManager />
                </div>
              </TabsContent>

              <TabsContent value="bulk-import">
                <Card>
                  <CardHeader>
                    <CardTitle>Bulk Import Properties</CardTitle>
                    <CardDescription>Import multiple properties from a CSV file</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto">
                    <BulkPropertyImport />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Row 1.5: Service Requests */}
        <div className="mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Service Requests
            </h2>
            <Tabs defaultValue="valuations" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="valuations" className="flex items-center gap-1 text-xs sm:text-sm">
                  <ClipboardCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Valuations</span>
                </TabsTrigger>
                <TabsTrigger value="photography" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Photography</span>
                </TabsTrigger>
                <TabsTrigger value="find-agent" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Find Agent</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valuations">
                <div className="max-h-[500px] overflow-y-auto">
                  <ValuationRequestsManager />
                </div>
              </TabsContent>

              <TabsContent value="photography">
                <div className="max-h-[500px] overflow-y-auto">
                  <PhotographyRequestsManager />
                </div>
              </TabsContent>

              <TabsContent value="find-agent">
                <div className="max-h-[500px] overflow-y-auto">
                  <FindAgentRequestsManager />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Email Broadcast */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Broadcast
          </h2>
          <EmailBroadcastManager />
        </div>

        {/* Row 2: User Management */}
        <div className="mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </h2>
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users" className="flex items-center gap-1 text-xs sm:text-sm">
                  <UserCog className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="accounts" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Building className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Accounts</span>
                </TabsTrigger>
                <TabsTrigger value="agencies" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Agencies</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <div className="max-h-[500px] overflow-y-auto">
                  <UserRoleManager users={users} onUserUpdated={loadUsers} />
                </div>
              </TabsContent>

              <TabsContent value="accounts">
                <div className="max-h-[500px] overflow-y-auto">
                  <AccountPropertiesView />
                </div>
              </TabsContent>

              <TabsContent value="agencies">
                <div className="max-h-[500px] overflow-y-auto">
                  <AgencyManager />
                </div>
              </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Viewings Management */}
        <div className="mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Viewings Management
            </h2>
            <Tabs defaultValue="viewings" className="space-y-4">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="viewings" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Viewings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="viewings">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Viewings</CardTitle>
                    <CardDescription>Manage viewing appointments</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[500px] overflow-y-auto">
                    {viewings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No scheduled viewings</p>
                    ) : (
                      <div className="space-y-4">
                        {viewings.map((viewing) => (
                          <div key={viewing.id} className="border rounded-lg p-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm">{viewing.property?.address}</h3>
                                <Badge variant={
                                  viewing.status === 'confirmed' ? 'default' :
                                  viewing.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                                } className="text-xs">
                                  {viewing.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">Date & Time</p>
                                  <p className="font-medium text-xs">
                                    {format(new Date(viewing.viewing_date), 'MMM dd, yyyy')} at {viewing.viewing_time}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Requested by</p>
                                  <p className="font-medium text-xs">{viewing.requester?.full_name || 'Unknown'}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Assigned Agent</p>
                                <Select
                                  value={viewing.agent_id || "none"}
                                  onValueChange={(value) => {
                                    if (value !== "none") {
                                      handleAssignAgent(viewing.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue placeholder="Select agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No agent assigned</SelectItem>
                                    {(() => {
                                      const oracleAgents = agents.filter(a => a.agency_name?.toLowerCase() === 'oracle estates');
                                      const otherAgents = agents.filter(a => a.agency_name && a.agency_name.toLowerCase() !== 'oracle estates');
                                      const unaffiliatedAgents = agents.filter(a => !a.agency_name);
                                      return (
                                        <>
                                          {oracleAgents.length > 0 && (
                                            <>
                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Oracle Estates</div>
                                              {oracleAgents.map((agent) => (
                                                <SelectItem key={agent.user_id} value={agent.user_id}>
                                                  {agent.full_name}
                                                </SelectItem>
                                              ))}
                                            </>
                                          )}
                                          {otherAgents.length > 0 && (
                                            <>
                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Other Agencies</div>
                                              {otherAgents.map((agent) => (
                                                <SelectItem key={agent.user_id} value={agent.user_id}>
                                                  {agent.full_name} ({agent.agency_name})
                                                </SelectItem>
                                              ))}
                                            </>
                                          )}
                                          {unaffiliatedAgents.length > 0 && (
                                            <>
                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Unaffiliated</div>
                                              {unaffiliatedAgents.map((agent) => (
                                                <SelectItem key={agent.user_id} value={agent.user_id}>
                                                  {agent.full_name}
                                                </SelectItem>
                                              ))}
                                            </>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </SelectContent>
                                </Select>
                              </div>
                              {isViewingPast(viewing.viewing_date, viewing.viewing_time) && 
                               viewing.status === 'pending' && (
                                <div className="pt-2 border-t flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateViewingStatus(viewing.id, 'successful')}
                                    className="bg-green-600 hover:bg-green-700 text-xs h-7"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Successful
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleUpdateViewingStatus(viewing.id, 'cancelled')}
                                    className="text-xs h-7"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancelled
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
              </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Customer Support Management */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HeadphonesIcon className="w-5 h-5" />
            Customer Support
          </h2>
          <SupportDashboard />
        </div>

        {/* Row 3: Analytics & Agent Performance */}
        <div className="mb-8 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analytics & Agent Performance
          </h2>
          <Tabs defaultValue="agents" className="space-y-4">
            <TabsList className="w-auto">
              <TabsTrigger value="agents" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Agent Stats
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents">
              <AgentViewingStats />
            </TabsContent>

            <TabsContent value="analytics">
              <UserAnalytics />
            </TabsContent>
          </Tabs>
        </div>

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