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
        .select('id, address, city, price, rental_price, listing_type, property_type, bedrooms, bathrooms, square_meters, images, featured_section, agency_id')
        .eq('status', 'approved')
        .is('parent_property_id', null)
        .not('featured_section', 'is', null);

      if (error) throw error;

      setFeaturedRentals((data || []).filter(p => p.featured_section === 'featured_rentals' && p.listing_type === 'rent'));
      setFeaturedSales((data || []).filter(p => p.featured_section === 'properties_for_sale' && p.listing_type === 'sale'));
    } catch (error) {
      console.error('Error loading featured properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8 text-primary">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-8 md:mb-12 px-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-3 md:mb-5 leading-tight text-primary">
              Find your place with <span className="font-bold text-primary">Rumi</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
              Your next home is closer than you think.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150} className="relative z-[60]">
          <HeroSearch />
        </ScrollReveal>
        
        {!isLoading && (featuredRentals.length > 0 || featuredSales.length > 0) && (
          <div className="mt-12">
            <ScrollReveal animation="fade-up">
              <div className="text-center mb-12">
                <h2 className="font-bold mb-4 text-foreground text-2xl text-[#b8a694]">Featured Listings</h2>
                <p className="text-lg text-muted-foreground">
                  Discover the most sought-after properties&nbsp;
                </p>
              </div>
            </ScrollReveal>
            
            {featuredRentals.length > 0 && (
              <div className="mb-16">
                <ScrollReveal animation="fade-right">
                  <div className="flex justify-start mb-4">
                    <span className="inline-flex items-center px-5 py-2 rounded-md text-sm font-medium bg-[#b8a694] text-white shadow-sm tracking-wide opacity-100">
                      For rent
                    </span>
                  </div>
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
                  <div className="flex justify-start mb-4">
                    <span className="inline-flex items-center px-5 py-2 rounded-md text-sm font-medium bg-[#b8a694] text-white shadow-sm tracking-wide opacity-100">
                      For sale
                    </span>
                  </div>
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
