import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Home, Building, Trees, Waves, Mountain, Crown, Building2, Tractor, Store, Sofa, House, Map, Maximize2, Minimize2, X } from "lucide-react";
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

const Purchase = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const urlMinBeds = searchParams.get('minBeds') || '';
  const urlMaxPrice = searchParams.get('maxPrice') || '';
  const urlMinYearBuilt = searchParams.get('minYearBuilt') || '';
  const [locationInput, setLocationInput] = useState(searchQuery);
  const [radius, setRadius] = useState(1);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [squareMetersRange, setSquareMetersRange] = useState<[number, number]>([50, 1000]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [minBedrooms, setMinBedrooms] = useState(1);
  const [minBathrooms, setMinBathrooms] = useState(1);
  const [barMinBedrooms, setBarMinBedrooms] = useState(urlMinBeds);
  const [barMaxBedrooms, setBarMaxBedrooms] = useState('');
  const [barMinPrice, setBarMinPrice] = useState('');
  const [barMaxPrice, setBarMaxPrice] = useState(urlMaxPrice);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedMustHaves, setSelectedMustHaves] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [addedToOracle, setAddedToOracle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [unfurnishedOnly, setUnfurnishedOnly] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  
  const { setDrawnPolygon, filterPropertiesByPolygon, hasDrawnArea, clearPolygon } = usePolygonFilter();

  const togglePropertyType = (typeId: string) => {
    setSelectedPropertyTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
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
        .eq('listing_type', 'sale')
        .eq('status', 'approved');

      if (selectedPropertyTypes.length > 0) {
        query = query.in('property_type', selectedPropertyTypes as any);
      }

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

      if (unfurnishedOnly) {
        query = query.eq('unfurnished', true);
      }

      if (priceRange[0] > 0) {
        query = query.gte('price', priceRange[0]);
      }
      if (priceRange[1] < 5000000) {
        query = query.lte('price', priceRange[1]);
      }

      if (searchQuery) {
        query = query.or(`city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,municipality.ilike.%${searchQuery}%`);
      }

      const parsedBarMinBed = barMinBedrooms ? parseInt(barMinBedrooms) : null;
      const parsedBarMaxBed = barMaxBedrooms ? parseInt(barMaxBedrooms) : null;
      if (parsedBarMinBed && parsedBarMinBed > 0) {
        query = query.gte('bedrooms', parsedBarMinBed);
      }
      if (parsedBarMaxBed && parsedBarMaxBed > 0) {
        query = query.lte('bedrooms', parsedBarMaxBed);
      }

      const parsedBarMinPrice = barMinPrice ? parseInt(barMinPrice.replace(/[^0-9]/g, '')) : null;
      const parsedBarMaxPrice = barMaxPrice ? parseInt(barMaxPrice.replace(/[^0-9]/g, '')) : null;
      if (parsedBarMinPrice && parsedBarMinPrice > 0) {
        query = query.gte('price', parsedBarMinPrice);
      }
      if (parsedBarMaxPrice && parsedBarMaxPrice > 0) {
        query = query.lte('price', parsedBarMaxPrice);
      }

      const allAmenityFilters = [...selectedAmenities, ...selectedMustHaves, ...selectedFeatures];
      if (allAmenityFilters.length > 0) {
        const unique = [...new Set(allAmenityFilters)];
        query = query.contains('amenities', unique);
      }

      if (addedToOracle && addedToOracle !== 'anytime') {
        const daysMap: Record<string, number> = { '24h': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30 };
        const days = daysMap[addedToOracle];
        if (days) {
          const sinceDate = new Date();
          sinceDate.setDate(sinceDate.getDate() - days);
          query = query.gte('created_at', sinceDate.toISOString());
        }
      }

      if (keywords.trim()) {
        query = query.or(`address.ilike.%${keywords.trim()}%,city.ilike.%${keywords.trim()}%,municipality.ilike.%${keywords.trim()}%`);
      }

      if (urlMinYearBuilt) {
        const minYear = parseInt(urlMinYearBuilt);
        if (minYear > 0) {
          query = query.gte('year_built', minYear);
        }
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProperties();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedPropertyTypes, squareMetersRange, priceRange, minBedrooms, minBathrooms, selectedAmenities, unfurnishedOnly, searchQuery, barMinBedrooms, barMaxBedrooms, barMinPrice, barMaxPrice, selectedMustHaves, selectedFeatures, addedToOracle, keywords, urlMinYearBuilt]);

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
    setPriceRange([0, 5000000]);
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

  const filteredProperties = filterPropertiesByPolygon(properties);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header & Filters - always in container */}
      <div className="container mx-auto px-4 py-8 pb-0">
        <ScrollReveal animation="fade-up">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-2">Properties for Purchase</h1>
            <p className="text-lg text-muted-foreground">Find and filter properties that match your buying criteria</p>
          </div>
        </ScrollReveal>

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
          selectedPropertyTypes={selectedPropertyTypes}
          onPropertyTypesChange={setSelectedPropertyTypes}
          selectedMustHaves={selectedMustHaves}
          onMustHavesChange={setSelectedMustHaves}
          selectedFeatures={selectedFeatures}
          onFeaturesChange={setSelectedFeatures}
          addedToOracle={addedToOracle}
          onAddedToOracleChange={setAddedToOracle}
          keywords={keywords}
          onKeywordsChange={setKeywords}
        />

        <div className="mb-4 flex items-center">
          <button
            onClick={() => setShowMap(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
              showMap
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="w-4 h-4" />
            Map View
          </button>
        </div>

        <div className="mb-6 flex items-center space-x-2">
          <Checkbox
            id="unfurnished-filter"
            checked={unfurnishedOnly}
            onCheckedChange={(checked) => setUnfurnishedOnly(checked === true)}
          />
          <label htmlFor="unfurnished-filter" className="text-sm cursor-pointer">
            Show only unfurnished properties
          </label>
        </div>

        <div className="text-center mb-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <p className="text-muted-foreground">
              Found {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} for sale
              {hasDrawnArea && ` in selected area`}
            </p>
          ) : (
            <p className="text-muted-foreground">
              No properties match your current filters. Try adjusting your search criteria.
            </p>
          )}
        </div>
      </div>

      {/* Split Layout: full-width when map is shown */}
      <div className={`${showMap ? 'px-4' : 'container mx-auto px-4'}`}>
        <div className={`flex flex-col ${showMap ? 'md:flex-row' : ''} gap-6`}>
          {/* Property Grid */}
          <div
            className={`${showMap ? 'w-full md:w-1/2 overflow-y-auto' : 'w-full'} transition-all duration-300`}
            style={showMap ? { maxHeight: 'calc(100vh - 120px)' } : undefined}
          >
            {!isLoading && filteredProperties.length > 0 && (
              <div className="mb-8">
                <ScrollReveal animation="fade-up">
                  <h3 className="text-2xl font-semibold mb-6 text-foreground">Properties for Sale</h3>
                </ScrollReveal>
                <div className={`grid ${showMap ? 'grid-cols-1 lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
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
          </div>

          {/* Map Panel - right half of viewport */}
          {showMap && !mapFullscreen && (
            <div className="w-full md:w-1/2 md:sticky md:top-0 md:self-start relative" style={{ height: 'calc(100vh - 120px)' }}>
              <div className="absolute top-2 right-2 z-[1000] flex gap-1">
                <button
                  onClick={() => setMapFullscreen(true)}
                  className="p-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowMap(false)}
                  className="p-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors"
                  title="Close map"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CompactPropertyMap
                properties={filteredProperties}
                height="100%"
                defaultExpanded={true}
                onPropertySelect={handlePropertySelect}
                onDrawnAreaChange={handleDrawnAreaChange}
                enableDrawing={true}
                initialSearchLocation={locationInput}
                searchRadius={radius}
              />
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Map Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-background transition-all duration-500 ease-in-out ${
          showMap && mapFullscreen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ transformOrigin: "right center" }}
      >
        <div className="absolute top-4 right-4 z-[1000] flex gap-1">
          <button
            onClick={() => setMapFullscreen(false)}
            className="p-2 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors"
            title="Exit fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setMapFullscreen(false); setShowMap(false); }}
            className="p-2 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors"
            title="Close map"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {showMap && (
          <CompactPropertyMap
            properties={filteredProperties}
            height="100vh"
            defaultExpanded={true}
            onPropertySelect={handlePropertySelect}
            onDrawnAreaChange={handleDrawnAreaChange}
            enableDrawing={true}
            initialSearchLocation={locationInput}
            searchRadius={radius}
          />
        )}
      </div>

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        allowDelete={false}
      />
    </div>
  );
};

export default Purchase;
