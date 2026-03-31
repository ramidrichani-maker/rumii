import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Heart, Home, PlusCircle, MapPin, ChevronRight, Map, Trash2 } from 'lucide-react';
import PropertyDetailModal from '@/components/PropertyDetailModal';
import { useToast } from '@/hooks/use-toast';

interface Enquiry {
  id: string;
  full_name: string;
  email: string;
  message: string | null;
  wants_viewing: boolean;
  created_at: string;
  property_id: string;
  properties: {
    address: string;
    city: string;
    property_type: string;
    images: string[] | null;
    price: number | null;
    rental_price: number | null;
    listing_type: string;
  };
}

interface Property {
  id: string;
  address: string;
  city: string;
  property_type: string;
  images: string[];
  price: number;
  rental_price: number | null;
  listing_type: 'rent' | 'sale' | 'both';
  status: 'pending' | 'approved' | 'rejected';
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  description?: string | null;
  amenities: string[];
  latitude?: number | null;
  longitude?: number | null;
  municipality?: string;
  year_built?: number;
  floors?: number | null;
  unfurnished?: boolean;
  created_at: string;
  user_id: string;
  agency_id?: string | null;
}

interface SavedArea {
  id: string;
  name: string;
  coordinates: string;
  page: string;
  created_at: string;
}

export default function MyOracle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [myPlaces, setMyPlaces] = useState<Property[]>([]);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (user) {
      Promise.all([fetchEnquiries(), fetchFavorites(), fetchMyPlaces(), fetchSavedAreas()]).finally(() => setLoading(false));
    }
  }, [user]);

  const fetchEnquiries = async () => {
    const { data } = await supabase
      .from('property_enquiries')
      .select(`
        id, full_name, email, message, wants_viewing, created_at, property_id,
        properties (address, city, property_type, images, price, rental_price, listing_type)
      `)
      .eq('sender_user_id', user?.id)
      .order('created_at', { ascending: false });
    setEnquiries((data as any) || []);
  };

  const fetchFavorites = async () => {
    const { data: favData } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', user?.id);
    if (favData && favData.length > 0) {
      const ids = favData.map(f => f.property_id);
      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .in('id', ids);
      setFavorites((props as any) || []);
    }
  };

  const fetchMyPlaces = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setMyPlaces((data as any) || []);
  };

  const fetchSavedAreas = async () => {
    const { data } = await supabase
      .from('saved_search_areas' as any)
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setSavedAreas((data as any) || []);
  };

  const handleDeleteArea = async (id: string) => {
    await supabase.from('saved_search_areas' as any).delete().eq('id', id);
    setSavedAreas(prev => prev.filter(a => a.id !== id));
    toast({ title: "Area deleted" });
  };

  const formatPrice = (property: { price: number | null; rental_price: number | null; listing_type: string }) => {
    if (property.listing_type === 'rent' && property.rental_price) {
      return `€${property.rental_price.toLocaleString()}/mo`;
    }
    if (property.price) {
      return `€${property.price.toLocaleString()}`;
    }
    return 'Price on request';
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-10">
      <h1 className="text-3xl font-bold text-foreground">My Oracle</h1>

      {/* Enquiries Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">My Enquiries</h2>
        </div>
        {enquiries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              You haven't made any enquiries yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enquiries.map((enquiry) => (
              <Card
                key={enquiry.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/property/${enquiry.property_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {enquiry.properties?.images?.[0] && (
                      <img
                        src={enquiry.properties.images[0]}
                        alt={enquiry.properties.address}
                        className="w-20 h-20 rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {enquiry.properties?.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enquiry.properties?.city} • {enquiry.properties?.property_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(enquiry.created_at).toLocaleDateString()}
                      </p>
                      {enquiry.wants_viewing && (
                        <Badge variant="secondary" className="text-xs mt-1">Viewing requested</Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Saved Properties Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Saved Properties</h2>
        </div>
        {favorites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No saved properties yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((property) => (
              <Card
                key={property.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setSelectedProperty(property)}
              >
                {property.images?.[0] && (
                  <img
                    src={property.images[0]}
                    alt={property.address}
                    className="w-full h-36 object-cover"
                  />
                )}
                <CardContent className="p-3">
                  <p className="font-semibold text-sm text-foreground">{formatPrice(property)}</p>
                  <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                  <p className="text-xs text-muted-foreground">{property.city}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* My Places Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">My Places</h2>
          </div>
          <Button size="sm" onClick={() => navigate('/list-property')} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Add Place
          </Button>
        </div>
        {myPlaces.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-muted-foreground">You haven't listed any properties yet</p>
              <Button variant="outline" onClick={() => navigate('/list-property')} className="gap-1.5">
                <PlusCircle className="h-4 w-4" />
                List your first property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myPlaces.map((property) => (
              <Card
                key={property.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setSelectedProperty(property)}
              >
                <div className="flex">
                  {property.images?.[0] && (
                    <img
                      src={property.images[0]}
                      alt={property.address}
                      className="w-28 h-full object-cover shrink-0"
                    />
                  )}
                  <CardContent className="p-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground">{formatPrice(property)}</p>
                        <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {property.city}
                        </div>
                      </div>
                      {getStatusBadge(property.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {property.bedrooms} bed • {property.bathrooms} bath • {property.square_meters}m²
                    </p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
    </div>
  );
}
