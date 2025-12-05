import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PropertyCard from '@/components/PropertyCard';
import PropertyDetailModal from '@/components/PropertyDetailModal';
import { useToast } from '@/hooks/use-toast';

const Favorites = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('property_id')
        .eq('user_id', user.id);

      if (favError) throw favError;

      if (!favorites || favorites.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }

      const propertyIds = favorites.map(f => f.property_id);

      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('*')
        .in('id', propertyIds)
        .eq('status', 'approved');

      if (propError) throw propError;

      setProperties(properties || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load your favorite properties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (property: any) => {
    setSelectedProperty(property);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2">
                <Heart className="w-8 h-8 text-primary" />
                My Favorites
              </h1>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading your favorites...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Heart className="w-8 h-8 text-primary fill-primary" />
              My Favorites
            </h1>
            <p className="text-muted-foreground mt-2">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} saved
            </p>
          </div>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">
              Start exploring properties and save your favorites
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/purchase">
                <Button>Browse Properties for Sale</Button>
              </Link>
              <Link to="/rent">
                <Button variant="outline">Browse Rentals</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={handlePropertySelect}
              />
            ))}
          </div>
        )}

        <PropertyDetailModal
          property={selectedProperty}
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      </div>
    </div>
  );
};

export default Favorites;
