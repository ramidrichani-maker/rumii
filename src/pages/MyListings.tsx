import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, Eye, MapPin } from 'lucide-react';
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
}

export default function MyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; address: string } | null>(null);

  useEffect(() => {
    fetchProperties();
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
        <p className="text-muted-foreground">Manage your listed properties</p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">You haven't listed any properties yet</p>
            <Button className="mt-4" onClick={() => navigate('/list-property')}>
              List Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDeleteDialog({ id: property.id, address: property.address })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Listed on {new Date(property.created_at).toLocaleDateString()}
                  </p>
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
