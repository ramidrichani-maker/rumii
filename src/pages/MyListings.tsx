import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, Eye, MapPin, Bell, Clock, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PropertyDeleteDialog } from '@/components/PropertyDeleteDialog';
import { useNavigate } from 'react-router-dom';

interface Property {
  id: string;
  address: string;
  city: string;
  property_type: string;
  square_meters: number;
  bedrooms: number;
  bathrooms: number;
  price: number;
  listing_type: string;
  status: string;
  images: string[];
  created_at: string;
  updated_at: string;
  property_code: number | null;
}

interface ListingUpdate {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function MyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; address: string } | null>(null);
  const [updates, setUpdates] = useState<ListingUpdate[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchProperties();
    fetchUpdates();
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load your properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, read, created_at')
        .eq('user_id', user.id)
        .or(
          'title.ilike.%property%,title.ilike.%listing%,message.ilike.%property%,message.ilike.%listing%'
        )
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleDeleteProperty = async (reason: string) => {
    if (!propertyToDelete) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyToDelete.id);

      if (error) throw error;

      toast.success(`Property deleted. Reason: ${reason}`);
      fetchProperties();
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const openDeleteDialog = (property: { id: string; address: string }) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const counts = {
    all: properties.length,
    pending: properties.filter((p) => p.status === 'pending').length,
    approved: properties.filter((p) => p.status === 'approved').length,
    rejected: properties.filter((p) => p.status === 'rejected').length,
  };

  const filtered = statusFilter === 'all'
    ? properties
    : properties.filter((p) => p.status === statusFilter);

  const updateIcon = (type: string) => {
    if (type === 'success') return <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />;
    if (type === 'error') return <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />;
    return <Bell className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Property Listings</h1>
        <p className="text-muted-foreground">
          Track the status of your submitted listings and see the latest updates from our team.
        </p>
      </div>

      {/* Latest updates */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Latest updates
          </CardTitle>
          <CardDescription>
            Recent notifications about your property listings.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No updates yet. You'll see notifications here when your listings are reviewed.
            </p>
          ) : (
            <ul className="space-y-3">
              {updates.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-start gap-3 text-sm">
                  {updateIcon(u.type)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{u.title}</p>
                    <p className="text-muted-foreground line-clamp-2">{u.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(u.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!u.read && <Badge variant="secondary" className="text-[10px] h-5">New</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">You haven't listed any properties yet</p>
            <Button className="mt-4" onClick={() => navigate('/list-property')}>
              List Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No listings with status "{statusFilter}".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
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
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {getStatusBadge(property.status)}
                </div>
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{property.address}</CardTitle>
                <CardDescription>
                  {property.city} • {property.property_type}
                  {property.property_code != null && (
                    <span className="ml-1 text-xs">• #{property.property_code}</span>
                  )}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/property/${property.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {property.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/list-property?edit=${property.id}`)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDeleteDialog({ id: property.id, address: property.address })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  {property.status === 'pending' && (
                    <p className="text-xs text-muted-foreground">
                      You can edit this listing while it's awaiting admin review.
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Listed on {new Date(property.created_at).toLocaleDateString()}</p>
                    {property.updated_at && property.updated_at !== property.created_at && (
                      <p>Last update: {new Date(property.updated_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PropertyDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteProperty}
        propertyAddress={propertyToDelete?.address || ""}
      />
    </div>
  );
}
