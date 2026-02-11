import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Square } from "lucide-react";
import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import HeroSearch from "@/components/HeroSearch";
import { supabase } from "@/integrations/supabase/client";

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
  images: string[];
}

const Index = () => {
  const [featuredRentals, setFeaturedRentals] = useState<Property[]>([]);
  const [featuredSales, setFeaturedSales] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProperties();
  }, []);

  const loadFeaturedProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, city, price, listing_type, property_type, bedrooms, bathrooms, square_meters, images, featured_section')
        .eq('status', 'approved')
        .not('featured_section', 'is', null);

      if (error) throw error;

      setFeaturedRentals((data || []).filter(p => p.featured_section === 'featured_rentals'));
      setFeaturedSales((data || []).filter(p => p.featured_section === 'properties_for_sale'));
    } catch (error) {
      console.error('Error loading featured properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number, listingType: string) => {
    if (listingType === 'rent') {
      return `$${price?.toLocaleString()}/mo`;
    }
    return `$${price?.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-16">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold mb-4 text-foreground">Find Your Perfect Property</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Whether you're looking to buy or rent, we've got you covered.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <HeroSearch />
        </ScrollReveal>
        
        {/* Popular Listings Section - Only show if there are featured properties */}
        {!isLoading && (featuredRentals.length > 0 || featuredSales.length > 0) && (
          <div className="mt-24">
            <ScrollReveal animation="fade-up">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 text-foreground">Popular Listings</h2>
                <p className="text-lg text-muted-foreground">
                  Discover the most sought-after properties in your area
                </p>
              </div>
            </ScrollReveal>
            
            {/* Rental Properties Row */}
            {featuredRentals.length > 0 && (
              <div className="mb-16">
                <ScrollReveal animation="fade-right">
                  <h3 className="text-2xl font-semibold mb-6 text-foreground">Featured Rentals</h3>
                </ScrollReveal>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredRentals.map((property, index) => (
                    <ScrollReveal key={property.id} animation="fade-up" delay={100 + index * 100}>
                      <Link to={`/rent`}>
                        <Card className="hover:shadow-lg transition-shadow duration-300 h-full cursor-pointer">
                          <div 
                            className="h-48 bg-muted rounded-t-lg bg-cover bg-center"
                            style={{
                              backgroundImage: property.images?.[0] 
                                ? `url(${property.images[0]})` 
                                : undefined
                            }}
                          />
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant="secondary">For Rent</Badge>
                              <span className="text-2xl font-bold text-primary">
                                {formatPrice(property.price, property.listing_type)}
                              </span>
                            </div>
                            <CardTitle className="text-lg">{property.address}</CardTitle>
                            <CardDescription>{property.city}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Bed className="w-4 h-4 mr-1" />
                                <span>{property.bedrooms} bed</span>
                              </div>
                              <div className="flex items-center">
                                <Bath className="w-4 h-4 mr-1" />
                                <span>{property.bathrooms} bath</span>
                              </div>
                              <div className="flex items-center">
                                <Square className="w-4 h-4 mr-1" />
                                <span>{property.square_meters}m²</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

            {/* Properties for Sale Row */}
            {featuredSales.length > 0 && (
              <div>
                <ScrollReveal animation="fade-left">
                  <h3 className="text-2xl font-semibold mb-6 text-foreground">Properties for Sale</h3>
                </ScrollReveal>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredSales.map((property, index) => (
                    <ScrollReveal key={property.id} animation="fade-up" delay={100 + index * 100}>
                      <Link to={`/purchase`}>
                        <Card className="hover:shadow-lg transition-shadow duration-300 h-full cursor-pointer">
                          <div 
                            className="h-48 bg-muted rounded-t-lg bg-cover bg-center"
                            style={{
                              backgroundImage: property.images?.[0] 
                                ? `url(${property.images[0]})` 
                                : undefined
                            }}
                          />
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start mb-2">
                              <Badge>For Sale</Badge>
                              <span className="text-2xl font-bold text-primary">
                                {formatPrice(property.price, property.listing_type)}
                              </span>
                            </div>
                            <CardTitle className="text-lg">{property.address}</CardTitle>
                            <CardDescription>{property.city}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Bed className="w-4 h-4 mr-1" />
                                <span>{property.bedrooms} bed</span>
                              </div>
                              <div className="flex items-center">
                                <Bath className="w-4 h-4 mr-1" />
                                <span>{property.bathrooms} bath</span>
                              </div>
                              <div className="flex items-center">
                                <Square className="w-4 h-4 mr-1" />
                                <span>{property.square_meters}m²</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;