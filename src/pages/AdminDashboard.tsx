import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle, XCircle, Clock, Users, Home, Bell } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyWithProfile {
  id: string;
  city: string;
  address: string;
  property_type: string;
  square_meters: number;
  bedrooms: number;
  bathrooms: number;
  listing_type: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
  phone_number: string;
  role: string;
  created_at: string;
  user_id: string;
}

const AdminDashboard = () => {
  const [properties, setProperties] = useState<PropertyWithProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingProperties: 0,
    totalUsers: 0,
    newUsersThisMonth: 0
  });
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  // Redirect if not admin
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      // Fetch properties with profiles
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          city,
          address,
          property_type,
          square_meters,
          bedrooms,
          bathrooms,
          listing_type,
          price,
          status,
          created_at,
          profiles (
            full_name,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
      } else if (propertiesData) {
        setProperties(propertiesData as unknown as PropertyWithProfile[]);
      }

      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else if (usersData) {
        setUsers(usersData);
      }

      // Calculate stats
      const totalProperties = propertiesData?.length || 0;
      const pendingProperties = propertiesData?.filter(p => p.status === 'pending').length || 0;
      const totalUsers = usersData?.length || 0;
      const currentMonth = new Date().getMonth();
      const newUsersThisMonth = usersData?.filter(u => 
        new Date(u.created_at).getMonth() === currentMonth
      ).length || 0;

      setStats({
        totalProperties,
        pendingProperties,
        totalUsers,
        newUsersThisMonth
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updatePropertyStatus = async (propertyId: string, status: 'approved' | 'rejected', reason?: string) => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('properties')
      .update({ status })
      .eq('id', propertyId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: `Property ${status} successfully`,
      });
      
      // Refresh data
      fetchData();
      setSelectedProperty(null);
      setRejectionReason('');
    }
    
    setIsLoading(false);
  };

  const sendNotificationToAllUsers = async () => {
    const title = "System Announcement";
    const message = "Welcome to our new real estate platform! Browse properties and start your investment journey.";
    
    const notifications = users.map(user => ({
      user_id: user.user_id,
      title,
      message,
      type: 'info'
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: `Notification sent to ${users.length} users`,
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage properties, users, and platform settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingProperties}</div>
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.newUsersThisMonth}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>Property Management</CardTitle>
                <CardDescription>Review and approve property listings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {properties.map((property) => (
                    <div key={property.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{property.address}</h3>
                          <p className="text-muted-foreground">{property.city}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <span>{property.property_type}</span>
                            <span>{property.square_meters} m²</span>
                            <span>{property.bedrooms} bed</span>
                            <span>{property.bathrooms} bath</span>
                            <span>{property.listing_type === 'rent' ? `$${property.price}/mo` : `$${property.price}`}</span>
                          </div>
                          <p className="text-sm mt-2">
                            Listed by: {property.profiles?.full_name || 'Unknown'} ({property.profiles?.phone_number || 'N/A'})
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(property.status)}>
                            {property.status}
                          </Badge>
                          {property.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => updatePropertyStatus(property.id, 'approved')}
                                disabled={isLoading}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setSelectedProperty(property)}
                                disabled={isLoading}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rejection Modal */}
                {selectedProperty && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                      <CardHeader>
                        <CardTitle>Reject Property</CardTitle>
                        <CardDescription>
                          Please provide a reason for rejecting this property listing
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          placeholder="Enter rejection reason..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <div className="flex space-x-2">
                          <Button
                            variant="destructive"
                            onClick={() => updatePropertyStatus(selectedProperty.id, 'rejected', rejectionReason)}
                            disabled={isLoading || !rejectionReason}
                          >
                            Reject Property
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedProperty(null);
                              setRejectionReason('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{user.full_name}</h3>
                          <p className="text-muted-foreground">{user.phone_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'agent' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Send Notifications</CardTitle>
                <CardDescription>Send announcements to all platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={sendNotificationToAllUsers} className="w-full">
                    <Bell className="w-4 h-4 mr-2" />
                    Send Welcome Message to All Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;