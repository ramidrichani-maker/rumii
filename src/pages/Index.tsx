import { useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import HeroSearch from "@/components/HeroSearch";
import FeaturedPropertyCard from "@/components/FeaturedPropertyCard";
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

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-16 text-primary">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-8 md:mb-12 px-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-3 md:mb-5 leading-tight text-primary">
              Find your place with <span className="font-bold text-primary">Beiti</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
              with the MENA's credible choice of homes
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <HeroSearch />
        </ScrollReveal>
        
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
            
            {featuredRentals.length > 0 && (
              <div className="mb-16">
                <ScrollReveal animation="fade-right">
                  <h3 className="text-2xl font-semibold mb-6 text-foreground">Featured Rentals</h3>
                </ScrollReveal>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredRentals.map((property, index) => (
                    <ScrollReveal key={property.id} animation="fade-up" delay={100 + index * 100}>
                      <FeaturedPropertyCard property={property} badgeLabel="For Rent" badgeVariant="secondary" />
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

            {featuredSales.length > 0 && (
              <div>
                <ScrollReveal animation="fade-left">
                  <h3 className="text-2xl font-semibold mb-6 text-foreground">Featured Listings</h3>
                </ScrollReveal>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredSales.map((property, index) => (
                    <ScrollReveal key={property.id} animation="fade-up" delay={100 + index * 100}>
                      <FeaturedPropertyCard property={property} badgeLabel="For Sale" />
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
