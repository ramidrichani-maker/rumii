import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Home, Eye } from "lucide-react";
import PropertyDetailModal from "@/components/PropertyDetailModal";

const AdminDashboard = () => {
  const [pendingProperties, setPendingProperties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingProperties: 0,
    approvedProperties: 0,
    totalUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPendingProperties();
      loadUsers();
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

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
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
          <p className="text-muted-foreground">Manage properties and users</p>
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

        {/* Pending Properties */}
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
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Detail Modal */}
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onApprove={handleApproveProperty}
          onReject={handleRejectProperty}
          isAdmin={true}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;