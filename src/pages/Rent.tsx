import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Home, Building, Trees, Waves, Mountain, Crown, Building2, Tractor, Store, Sofa, House } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CompactPropertyMap from "@/components/CompactPropertyMap";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import RangeSlider from "@/components/RangeSlider";
import PropertyCard from "@/components/PropertyCard";
import ScrollReveal from "@/components/ScrollReveal";
import LocationSearchBar from "@/components/LocationSearchBar";
import { usePolygonFilter } from "@/hooks/usePolygonFilter";

const propertyTypes = [
  { id: "apartment", name: "Apartment", icon: Building },
  { id: "villa", name: "Villa", icon: Crown },
  { id: "beach house", name: "Beach House", icon: Waves },
  { id: "chalet", name: "Chalet", icon: Home },
  { id: "duplex", name: "Duplex", icon: Building },
  { id: "triplex", name: "Triplex", icon: Building },
  { id: "penthouse", name: "Penthouse", icon: Mountain },
  { id: "commercial rental", name: "Commercial Rental", icon: Store },
  { id: "farm house", name: "Farm House", icon: Tractor },
  { id: "building", name: "Building", icon: Building2 },
  { id: "venue", name: "Venue", icon: Building2 },
  { id: "studio", name: "Studio", icon: Building2 },
  { id: "rooftop", name: "Rooftop", icon: Mountain },
  { id: "land", name: "Land", icon: Trees },
];

const amenities = [
  "Swimming Pool", "Gym", "Parking", "Balcony", "Garden", 
  "Air Conditioning", "Heating", "Internet", "Security", 
  "Elevator", "Furnished", "Pet Friendly", "Laundry", 
  "Storage", "Terrace", "Sea View", "Mountain View"
];

const Rent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [locationInput, setLocationInput] = useState(searchQuery);
  const [radius, setRadius] = useState(1);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [squareMetersRange, setSquareMetersRange] = useState<[number, number]>([50, 1000]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minBedrooms, setMinBedrooms] = useState(1);
  const [minBathrooms, setMinBathrooms] = useState(1);
  const [barMinBedrooms, setBarMinBedrooms] = useState('');
  const [barMaxBedrooms, setBarMaxBedrooms] = useState('');
  const [barMinPrice, setBarMinPrice] = useState('');
  const [barMaxPrice, setBarMaxPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [unfurnishedOnly, setUnfurnishedOnly] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { setDrawnPolygon, filterPropertiesByPolygon, hasDrawnArea, clearPolygon } = usePolygonFilter();

  const togglePropertyType = (typeId: string) => {
    setSelectedPropertyTypes(prev => prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
  };

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('listing_type', 'rent')
        .eq('status', 'approved');

      // Apply filters
      if (selectedPropertyTypes.length > 0) {
        query = query.in('property_type', selectedPropertyTypes as any);
      }

      // Square meters filter (handle 1000+ case)
      if (squareMetersRange[1] >= 1000) {
        query = query.gte('square_meters', squareMetersRange[0]);
      } else {
        query = query.gte('square_meters', squareMetersRange[0]).lte('square_meters', squareMetersRange[1]);
      }

      if (minBedrooms > 1) {
        query = query.gte('bedrooms', minBedrooms);
      }

      if (minBathrooms > 1) {
        query = query.gte('bathrooms', minBathrooms);
      }

      if (selectedAmenities.length > 0) {
        query = query.contains('amenities', selectedAmenities);
      }

      if (unfurnishedOnly) {
        query = query.eq('unfurnished', true);
      }

      // Price filter
      if (priceRange[0] > 0) {
        query = query.gte('price', priceRange[0]);
      }
      if (priceRange[1] < 10000) {
        query = query.lte('price', priceRange[1]);
      }

      // Location search filter
      if (searchQuery) {
        query = query.or(`city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,municipality.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Auto-fetch when filters change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProperties();
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [selectedPropertyTypes, squareMetersRange, priceRange, minBedrooms, minBathrooms, selectedAmenities, unfurnishedOnly, searchQuery]);

  const handleLocationChange = (value: string) => {
    setLocationInput(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClearFilters = () => {
    setSelectedPropertyTypes([]);
    setSquareMetersRange([50, 1000]);
    setPriceRange([0, 10000]);
    setMinBedrooms(1);
    setMinBathrooms(1);
    setSelectedAmenities([]);
    setUnfurnishedOnly(false);
    clearPolygon();
  };

  const handlePropertySelect = (property: any) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
  };

  const handleDrawnAreaChange = useCallback((polygon: { latitude: number; longitude: number }[] | null) => {
    setDrawnPolygon(polygon);
  }, [setDrawnPolygon]);

  // Filter properties by drawn polygon
  const filteredProperties = filterPropertiesByPolygon(properties);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <ScrollReveal animation="fade-up">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-2">Properties for Rent</h1>
            <p className="text-lg text-muted-foreground">Find and filter rental properties that match your criteria</p>
          </div>
        </ScrollReveal>

        {/* Location Search Bar */}
        <LocationSearchBar
          location={locationInput}
          onLocationChange={handleLocationChange}
          radius={radius}
          onRadiusChange={setRadius}
          minBedrooms={barMinBedrooms}
          maxBedrooms={barMaxBedrooms}
          onMinBedroomsChange={setBarMinBedrooms}
          onMaxBedroomsChange={setBarMaxBedrooms}
          barMinPrice={barMinPrice}
          barMaxPrice={barMaxPrice}
          onBarMinPriceChange={setBarMinPrice}
          onBarMaxPriceChange={setBarMaxPrice}
        />

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Filter Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Property Type Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Property Type</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                {propertyTypes.map(type => {
                const Icon = type.icon;
                const isSelected = selectedPropertyTypes.includes(type.id);
                return <button key={type.id} onClick={() => togglePropertyType(type.id)} className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"}`}>
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-xs font-medium">{type.name}</span>
                    </button>;
              })}
              </div>
            </div>

            {/* Square Meters Filter */}
            <RangeSlider
              value={squareMetersRange}
              onValueChange={setSquareMetersRange}
              min={50}
              max={1000}
              step={5}
              label="Square Meters Range"
              unit=" m²"
              maxLabel="1,000+ m²"
            />

            {/* Price Range Filter */}
            <RangeSlider
              value={priceRange}
              onValueChange={setPriceRange}
              min={0}
              max={10000}
              step={100}
              label="Monthly Rent Range"
              unit="$"
              prefix="$"
              maxLabel="$10,000+/mo"
            />
            {/* Amenities Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {amenities.map(amenity => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={selectedAmenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <label htmlFor={amenity} className="text-sm cursor-pointer">
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Bedrooms Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                Minimum Bedrooms: {minBedrooms}
              </h3>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map(bedroom => (
                  <button 
                    key={bedroom} 
                    onClick={() => setMinBedrooms(bedroom)} 
                    className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all duration-200 ${
                      minBedrooms === bedroom 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {bedroom}
                  </button>
                ))}
              </div>
            </div>

            {/* Bathrooms Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                Minimum Bathrooms: {minBathrooms}
              </h3>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map(bathroom => (
                  <button 
                    key={bathroom} 
                    onClick={() => setMinBathrooms(bathroom)} 
                    className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all duration-200 ${
                      minBathrooms === bathroom 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {bathroom}
                  </button>
                ))}
              </div>
            </div>

            {/* Unfurnished Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Furnishing</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unfurnished-filter"
                  checked={unfurnishedOnly}
                  onCheckedChange={(checked) => setUnfurnishedOnly(checked === true)}
                />
                <label htmlFor="unfurnished-filter" className="text-sm cursor-pointer">
                  Show only unfurnished properties
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="lg" onClick={handleClearFilters}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Property Map */}
        <div className="mb-8">
          <CompactPropertyMap 
            properties={filteredProperties} 
            height="300px"
            defaultExpanded={false}
            onPropertySelect={handlePropertySelect}
            onDrawnAreaChange={handleDrawnAreaChange}
            enableDrawing={true}
          />
        </div>

        {/* Active Filters Display */}
        {(selectedPropertyTypes.length > 0 || squareMetersRange[0] > 50 || squareMetersRange[1] < 1000 || priceRange[0] > 0 || priceRange[1] < 10000 || minBedrooms > 1 || minBathrooms > 1 || selectedAmenities.length > 0 || unfurnishedOnly || hasDrawnArea) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Active Filters:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedPropertyTypes.map(typeId => {
                const type = propertyTypes.find(t => t.id === typeId);
                return (
                  <Badge key={typeId} variant="secondary" className="px-3 py-1">
                    {type?.name}
                  </Badge>
                );
              })}
              {(squareMetersRange[0] > 50 || squareMetersRange[1] < 1000) && (
                <Badge variant="secondary" className="px-3 py-1">
                  {squareMetersRange[0]}-{squareMetersRange[1] >= 1000 ? '1,000+' : squareMetersRange[1]} m²
                </Badge>
              )}
              {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                <Badge variant="secondary" className="px-3 py-1">
                  ${priceRange[0].toLocaleString()}-{priceRange[1] >= 10000 ? '$10,000+' : `$${priceRange[1].toLocaleString()}`}/mo
                </Badge>
              )}
              {minBedrooms > 1 && (
                <Badge variant="secondary" className="px-3 py-1">
                  Min {minBedrooms} bedrooms
                </Badge>
              )}
              {minBathrooms > 1 && (
                <Badge variant="secondary" className="px-3 py-1">
                  Min {minBathrooms} bathrooms
                </Badge>
              )}
              {selectedAmenities.map(amenity => (
                <Badge key={amenity} variant="secondary" className="px-3 py-1">
                  {amenity}
                </Badge>
              ))}
              {unfurnishedOnly && (
                <Badge variant="secondary" className="px-3 py-1">
                  Unfurnished only
                </Badge>
              )}
              {hasDrawnArea && (
                <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary">
                  Custom drawn area
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="text-center mb-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <p className="text-muted-foreground">
              Found {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} for rent
              {hasDrawnArea && ` in selected area`}
            </p>
          ) : (
            <p className="text-muted-foreground">
              No properties match your current filters. Try adjusting your search criteria.
            </p>
          )}
        </div>

        {/* Property Grid */}
        {!isLoading && filteredProperties.length > 0 && (
          <div className="mb-8">
            <ScrollReveal animation="fade-up">
              <h3 className="text-2xl font-semibold mb-6 text-foreground">Properties for Rent</h3>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.map((property, index) => (
                <ScrollReveal key={property.id} animation="fade-up" delay={100 + (index % 4) * 100}>
                  <PropertyCard
                    property={property}
                    onClick={handlePropertySelect}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* Property Detail Modal */}
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          allowDelete={false}
        />
      </div>
    </div>
  );
};

export default Rent;