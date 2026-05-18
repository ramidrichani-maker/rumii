import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Star, X, Home, Key } from "lucide-react";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  listing_type: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  featured_section: string | null;
  images: string[];
}

const FeaturedListingsManager = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [featuredRentals, setFeaturedRentals] = useState<Property[]>([]);
  const [featuredSales, setFeaturedSales] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, city, price, listing_type, property_type, bedrooms, bathrooms, square_meters, featured_section, images')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);
      setFeaturedRentals((data || []).filter(p => p.featured_section === 'featured_rentals'));
      setFeaturedSales((data || []).filter(p => p.featured_section === 'properties_for_sale'));
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

  const handleSetFeatured = async (propertyId: string, section: string | null) => {
    const previousProperties = properties;

    setProperties(current => current.map(property =>
      property.id === propertyId ? { ...property, featured_section: section } : property
    ));
    setFeaturedRentals(current => current
      .map(property => property.id === propertyId ? { ...property, featured_section: section } : property)
      .filter(property => property.featured_section === 'featured_rentals')
    );
    setFeaturedSales(current => current
      .map(property => property.id === propertyId ? { ...property, featured_section: section } : property)
      .filter(property => property.featured_section === 'properties_for_sale')
    );

    try {
      const { error } = await supabase
        .from('properties')
        .update({ featured_section: section })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: section ? "Property added to featured listings" : "Property removed from featured listings",
      });

      await loadProperties();
    } catch (error) {
      console.error('Error updating featured status:', error);
      setProperties(previousProperties);
      setFeaturedRentals(previousProperties.filter(p => p.featured_section === 'featured_rentals'));
      setFeaturedSales(previousProperties.filter(p => p.featured_section === 'properties_for_sale'));
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive",
      });
    }
  };

  const availableRentals = properties.filter(p => p.listing_type === 'rent' && !p.featured_section);
  const availableSales = properties.filter(p => p.listing_type === 'sale' && !p.featured_section);

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Featured Rentals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Featured Rentals
          </CardTitle>
          <CardDescription>
            Select up to 4 rental properties to display on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Featured Rentals */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Currently Featured ({featuredRentals.length}/4)</h4>
            {featuredRentals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No featured rentals selected</p>
            ) : (
              <div className="grid gap-2">
                {featuredRentals.map((property) => (
                  <div key={property.id} className="flex items-center justify-between border rounded-lg p-3 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <div>
                        <p className="font-medium text-sm">{property.address}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.city} • ${property.price?.toLocaleString()}/mo • {property.bedrooms} bed
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSetFeatured(property.id, null)}
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Rental Property */}
          {featuredRentals.length < 4 && availableRentals.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Add Rental Property</h4>
              <Select onValueChange={(value) => handleSetFeatured(value, 'featured_rentals')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rental property to feature" />
                </SelectTrigger>
                <SelectContent>
                  {availableRentals.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address} - {property.city} (${property.price?.toLocaleString()}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {featuredRentals.length >= 4 && (
            <p className="text-sm text-muted-foreground italic">Maximum 4 featured rentals reached</p>
          )}
        </CardContent>
      </Card>

      {/* Featured Sales Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Properties for Sale
          </CardTitle>
          <CardDescription>
            Select up to 4 sale properties to display on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Featured Sales */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Currently Featured ({featuredSales.length}/4)</h4>
            {featuredSales.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No featured properties for sale selected</p>
            ) : (
              <div className="grid gap-2">
                {featuredSales.map((property) => (
                  <div key={property.id} className="flex items-center justify-between border rounded-lg p-3 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <div>
                        <p className="font-medium text-sm">{property.address}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.city} • ${property.price?.toLocaleString()} • {property.bedrooms} bed
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSetFeatured(property.id, null)}
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Sale Property */}
          {featuredSales.length < 4 && availableSales.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Add Sale Property</h4>
              <Select onValueChange={(value) => handleSetFeatured(value, 'properties_for_sale')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property for sale to feature" />
                </SelectTrigger>
                <SelectContent>
                  {availableSales.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address} - {property.city} (${property.price?.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {featuredSales.length >= 4 && (
            <p className="text-sm text-muted-foreground italic">Maximum 4 featured properties for sale reached</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeaturedListingsManager;