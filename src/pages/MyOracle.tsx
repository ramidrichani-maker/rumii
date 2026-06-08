import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSection = searchParams.get('section');
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [myPlaces, setMyPlaces] = useState<Property[]>([]);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAllEnquiries, setShowAllEnquiries] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [showAllSavedAreas, setShowAllSavedAreas] = useState(false);
  const [showAllMyPlaces, setShowAllMyPlaces] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

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
      return `$${property.rental_price.toLocaleString()}/mo`;
    }
    if (property.price) {
      return `$${property.price.toLocaleString()}`;
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
      <h1 className="text-3xl font-bold text-foreground">
        {activeSection === 'enquiries' ? 'Enquiries' : 'My rumi'}
      </h1>

      {/* Enquiries Section */}
      <section>
        {activeSection !== 'enquiries' && (
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Enquiries</h2>
        </div>
        )}
        <h3 className="text-base font-medium text-foreground mb-3">Initial Enquiry</h3>
        {enquiries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-foreground font-medium">You haven't sent any enquiries yet.</p>
                <p className="text-sm text-muted-foreground">If you send an enquiry to an agent it will appear here</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate('/rent')}>
                  Search property to rent
                </Button>
                <Button variant="outline" onClick={() => navigate('/purchase')}>
                  Search property for sale
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {(showAllEnquiries ? enquiries : enquiries.slice(0, 2)).map((enquiry) => (
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
            {enquiries.length > 2 && (
              <Button
                variant="outline"
                className="mt-3 w-full md:w-auto"
                onClick={() => setShowAllEnquiries(v => !v)}
              >
                {showAllEnquiries ? 'Show less' : `Show more (${enquiries.length - 2})`}
              </Button>
            )}
          </>
        )}
      </section>

      {activeSection !== 'enquiries' && (
      <>
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
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(showAllFavorites ? favorites : favorites.slice(0, 2)).map((property) => (
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
            {favorites.length > 2 && (
              <Button
                variant="outline"
                className="mt-3 w-full md:w-auto"
                onClick={() => setShowAllFavorites(v => !v)}
              >
                {showAllFavorites ? 'Show less' : `Show more (${favorites.length - 2})`}
              </Button>
            )}
          </>
        )}
      </section>
      {/* Saved Search Areas */}
      {savedAreas.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-2">
            <Map className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Saved Search Areas</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(showAllSavedAreas ? savedAreas : savedAreas.slice(0, 2)).map((area) => {
              const coords = typeof area.coordinates === 'string' ? JSON.parse(area.coordinates) : area.coordinates;
              const pointCount = Array.isArray(coords) ? coords.length : 0;
              return (
                <Card key={area.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        const coordsStr = typeof area.coordinates === 'string'
                          ? area.coordinates
                          : JSON.stringify(area.coordinates);
                        navigate(`/${area.page}?polygon=${encodeURIComponent(coordsStr)}`);
                      }}
                    >
                      <p className="font-medium text-sm text-foreground">{area.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pointCount} points • {area.page === 'purchase' ? 'Buy' : 'Rent'} • {new Date(area.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {savedAreas.length > 2 && (
            <Button
              variant="outline"
              className="mt-3 w-full md:w-auto"
              onClick={() => setShowAllSavedAreas(v => !v)}
            >
              {showAllSavedAreas ? 'Show less' : `Show more (${savedAreas.length - 2})`}
            </Button>
          )}
        </>
      )}

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
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {(showAllMyPlaces ? myPlaces : myPlaces.slice(0, 2)).map((property) => (
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
            {myPlaces.length > 2 && (
              <Button
                variant="outline"
                className="mt-3 w-full md:w-auto"
                onClick={() => setShowAllMyPlaces(v => !v)}
              >
                {showAllMyPlaces ? 'Show less' : `Show more (${myPlaces.length - 2})`}
              </Button>
            )}
          </>
        )}
      </section>
      </>
      )}

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
    </div>
  );
}
