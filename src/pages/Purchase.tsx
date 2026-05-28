import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Building, Trees, Waves, Mountain, Crown, Building2, Tractor, Store, Sofa, House, Map, Maximize2, Minimize2, X, ArrowUpDown } from "lucide-react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CompactPropertyMap from "@/components/CompactPropertyMap";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import PropertyCard from "@/components/PropertyCard";
import PropertyCardSkeleton from "@/components/PropertyCardSkeleton";
import RangeSlider from "@/components/RangeSlider";
import ScrollReveal from "@/components/ScrollReveal";
import LocationSearchBar from "@/components/LocationSearchBar";
import { usePolygonFilter } from "@/hooks/usePolygonFilter";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import { buildFilterChips } from "@/lib/buildFilterChips";
import { loadFilters, saveFilters, clearStoredFilters } from "@/lib/persistFilters";
import PropertyPagination from "@/components/PropertyPagination";

const PAGE_SIZE = 12;

const propertyTypes = [
  { id: "apartment", name: "Apartment", icon: Building },
  { id: "villa", name: "Villa", icon: Crown },
  { id: "beach house", name: "Beach House", icon: Waves },
  { id: "chalet", name: "Chalet", icon: Home },
  { id: "duplex", name: "Duplex", icon: Building },
  { id: "triplex", name: "Triplex", icon: Building },
  { id: "penthouse", name: "Penthouse", icon: Mountain },
  { id: "commercial", name: "Commercial", icon: Store },
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
  const location = useLocation();
  const searchQuery = searchParams.get('search') || '';
  const urlMinBeds = searchParams.get('minBeds') || '';
  const urlMaxPrice = searchParams.get('maxPrice') || '';
  const urlMinYearBuilt = searchParams.get('minYearBuilt') || '';
  const urlType = searchParams.get('type') || '';
  const stored = useMemo(() => loadFilters<any>('purchase'), []);
  const pick = <T,>(k: string, fallback: T): T => (stored[k] !== undefined ? stored[k] as T : fallback);
  const [locationInput, setLocationInput] = useState<string>(searchQuery || pick('locationInput', ''));
  const [radius, setRadius] = useState<number>(pick('radius', 0));
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(urlType ? [urlType] : pick('selectedPropertyTypes', [] as string[]));
  const [squareMetersRange, setSquareMetersRange] = useState<[number, number]>(pick('squareMetersRange', [50, 1000] as [number, number]));
  const [priceRange, setPriceRange] = useState<[number, number]>(pick('priceRange', [0, 5000000] as [number, number]));
  const [minBedrooms, setMinBedrooms] = useState<number>(pick('minBedrooms', 1));
  const [minBathrooms, setMinBathrooms] = useState<number>(pick('minBathrooms', 1));
  const [barMinBedrooms, setBarMinBedrooms] = useState<string>(urlMinBeds || pick('barMinBedrooms', ''));
  const [barMaxBedrooms, setBarMaxBedrooms] = useState<string>(pick('barMaxBedrooms', ''));
  const [barMinPrice, setBarMinPrice] = useState<string>(pick('barMinPrice', ''));
  const [barMaxPrice, setBarMaxPrice] = useState<string>(urlMaxPrice || pick('barMaxPrice', ''));
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(pick('selectedAmenities', [] as string[]));
  const [selectedMustHaves, setSelectedMustHaves] = useState<string[]>(pick('selectedMustHaves', [] as string[]));
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(pick('selectedFeatures', [] as string[]));
  const [addedToOracle, setAddedToOracle] = useState<string>(pick('addedToOracle', ''));
  const [keywords, setKeywords] = useState<string>(pick('keywords', ''));
  const [unfurnishedOnly, setUnfurnishedOnly] = useState<boolean>(pick('unfurnishedOnly', false));
  const [newHomesOnly, setNewHomesOnly] = useState<boolean>(!!urlMinYearBuilt || pick('newHomesOnly', false));
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showMap, setShowMap] = useState(!!searchQuery);
  const [mapClosing, setMapClosing] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const hasActiveFiltersRef = useRef(false);

  const closeMap = useCallback(() => {
    setMapClosing(true);
    setTimeout(() => {
      setShowMap(false);
      setMapClosing(false);
    }, 300);
  }, []);
  
  const { setDrawnPolygon, filterPropertiesByPolygon, hasDrawnArea, clearPolygon, resolveCityCenters } = usePolygonFilter();
  const prevHasDrawnAreaRef = useRef(hasDrawnArea);

  // Read polygon from URL query param (passed from homepage draw)
  const initialPolygon = useMemo(() => {
    const raw = searchParams.get('polygon');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length >= 3 ? parsed : null;
    } catch { return null; }
  }, [searchParams]);

  // Apply polygon filter when initialPolygon is available
  useEffect(() => {
    if (initialPolygon) {
      setDrawnPolygon(initialPolygon);
      setShowMap(true);
    }
  }, [initialPolygon]);

  // Clear radius when search area is cleared
  useEffect(() => {
    if (prevHasDrawnAreaRef.current && !hasDrawnArea && radius > 0) {
      setRadius(0);
    }
    prevHasDrawnAreaRef.current = hasDrawnArea;
  }, [hasDrawnArea, radius]);



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
        .from('properties_public' as any)
        .select('*')
        .in('listing_type', ['sale', 'both'])
        .eq('status', 'approved')
        .is('parent_property_id', null);

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

      // NOTE: searchQuery is intentionally NOT applied as a SQL filter.
      // Spatial filtering happens client-side via the auto-drawn boundary
      // polygon (see filterPropertiesByPolygon below), which correctly
      // includes properties stored under neighborhood names (e.g. Achrafieh)
      // that fall inside the searched city's boundary (e.g. Beirut).

      const isMinStudio = barMinBedrooms === 'Studio';
      const isMaxStudio = barMaxBedrooms === 'Studio';
      const parsedBarMinBed = barMinBedrooms ? (isMinStudio ? 0 : parseInt(barMinBedrooms)) : null;
      const parsedBarMaxBed = barMaxBedrooms ? (isMaxStudio ? 0 : parseInt(barMaxBedrooms)) : null;

      if (isMinStudio && isMaxStudio) {
        // Only studio properties
        query = query.or('property_type.eq.studio,bedrooms.eq.0');
      } else if (isMinStudio) {
        // Include studios alongside properties up to max bedrooms
        if (parsedBarMaxBed !== null && parsedBarMaxBed > 0) {
          query = query.or(`property_type.eq.studio,bedrooms.lte.${parsedBarMaxBed}`);
        } else {
          query = query.or('property_type.eq.studio,bedrooms.gte.0');
        }
      } else if (isMaxStudio) {
        // Max = studio means only 0-bedroom / studio properties
        query = query.or('property_type.eq.studio,bedrooms.eq.0');
      } else {
        if (parsedBarMinBed !== null && parsedBarMinBed > 0) {
          query = query.gte('bedrooms', parsedBarMinBed);
        }
        if (parsedBarMaxBed !== null && parsedBarMaxBed > 0) {
          query = query.lte('bedrooms', parsedBarMaxBed);
        }
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

      if (newHomesOnly) {
        const minYear = new Date().getFullYear() - 5;
        query = query.gte('year_built', minYear);
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

  // Realtime: refetch when properties change (new approvals, edits, deletes)
  useEffect(() => {
    const channel = supabase
      .channel('purchase-properties-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties' },
        () => {
          if (hasActiveFiltersRef.current) {
            setHasNewUpdates(true);
          } else {
            fetchProperties();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProperties();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedPropertyTypes, squareMetersRange, priceRange, minBedrooms, minBathrooms, selectedAmenities, unfurnishedOnly, newHomesOnly, searchQuery, barMinBedrooms, barMaxBedrooms, barMinPrice, barMaxPrice, selectedMustHaves, selectedFeatures, addedToOracle, keywords]);

  const handleLocationChange = (value: string) => {
    setLocationInput(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
      // Auto-open map to show boundary polygon for the searched area
      setShowMap(true);
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
    setSelectedMustHaves([]);
    setSelectedFeatures([]);
    setAddedToOracle('');
    setKeywords('');
    setNewHomesOnly(false);
    setBarMinBedrooms('');
    setBarMaxBedrooms('');
    setBarMinPrice('');
    setBarMaxPrice('');
    setRadius(0);
    clearStoredFilters('purchase');
  };

  // Persist active filters across navigations and refreshes
  useEffect(() => {
    saveFilters('purchase', {
      locationInput,
      radius,
      selectedPropertyTypes,
      squareMetersRange,
      priceRange,
      minBedrooms,
      minBathrooms,
      barMinBedrooms,
      barMaxBedrooms,
      barMinPrice,
      barMaxPrice,
      selectedAmenities,
      selectedMustHaves,
      selectedFeatures,
      addedToOracle,
      keywords,
      unfurnishedOnly,
      newHomesOnly,
    });
  }, [locationInput, radius, selectedPropertyTypes, squareMetersRange, priceRange, minBedrooms, minBathrooms, barMinBedrooms, barMaxBedrooms, barMinPrice, barMaxPrice, selectedAmenities, selectedMustHaves, selectedFeatures, addedToOracle, keywords, unfurnishedOnly, newHomesOnly]);

  const handlePropertySelect = (property: any) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
  };

  const handleDrawnAreaChange = useCallback((polygon: { latitude: number; longitude: number }[] | null) => {
    setDrawnPolygon(polygon);
    if (polygon === null && locationInput) {
      setLocationInput('');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams, { replace: true });
    }
  }, [setDrawnPolygon, locationInput, searchParams, setSearchParams, setLocationInput]);

  const handleSaveArea = useCallback(async (coordinates: { latitude: number; longitude: number }[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save search areas.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('saved_search_areas' as any).insert({
      user_id: user.id,
      name: locationInput || 'Custom Area',
      coordinates: JSON.stringify(coordinates),
      page: 'purchase',
    });
    if (error) {
      toast({ title: "Error", description: "Failed to save area.", variant: "destructive" });
    } else {
      toast({ title: "Area saved", description: "You can view it in My rumi." });
    }
  }, [locationInput]);

  // Resolve city centers for polygon filtering when properties load
  useEffect(() => {
    if (hasDrawnArea && properties.length > 0) {
      const cities = properties.map(p => p.city).filter(Boolean);
      resolveCityCenters(cities);
    }
  }, [properties, hasDrawnArea]);

  const filteredProperties = filterPropertiesByPolygon(properties, radius);

  const sortedProperties = useMemo(() => {
    const arr = [...filteredProperties];
    switch (sortBy) {
      case "price-asc":
        return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case "price-desc":
        return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case "size-desc":
        return arr.sort((a, b) => (b.square_meters ?? 0) - (a.square_meters ?? 0));
      case "newest":
      default:
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [filteredProperties, sortBy]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / PAGE_SIZE));
  useEffect(() => { setCurrentPage(1); }, [sortedProperties.length, sortBy]);
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, sortedProperties.length);
  const paginatedProperties = useMemo(
    () => sortedProperties.slice(startIdx, endIdx),
    [sortedProperties, startIdx, endIdx]
  );
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setTimeout(() => {
      document.getElementById('results-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const filterChips = buildFilterChips({
    selectedPropertyTypes, setSelectedPropertyTypes,
    squareMetersRange, setSquareMetersRange, sqmDefault: [50, 1000],
    priceRange, setPriceRange, priceDefault: [0, 5000000],
    minBedrooms, setMinBedrooms,
    minBathrooms, setMinBathrooms,
    barMinBedrooms, setBarMinBedrooms,
    barMaxBedrooms, setBarMaxBedrooms,
    barMinPrice, setBarMinPrice,
    barMaxPrice, setBarMaxPrice,
    selectedAmenities, setSelectedAmenities,
    selectedMustHaves, setSelectedMustHaves,
    selectedFeatures, setSelectedFeatures,
    addedToOracle, setAddedToOracle,
    keywords, setKeywords,
    unfurnishedOnly, setUnfurnishedOnly,
    newHomesOnly, setNewHomesOnly,
  });

  useEffect(() => {
    hasActiveFiltersRef.current = filterChips.length > 0 || !!searchQuery || hasDrawnArea;
  }, [filterChips.length, searchQuery, hasDrawnArea]);

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
          hasDrawnArea={hasDrawnArea}
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
          unfurnishedOnly={unfurnishedOnly}
          onUnfurnishedChange={setUnfurnishedOnly}
          newHomesOnly={newHomesOnly}
          onNewHomesOnlyChange={setNewHomesOnly}
          onApplyMobileFilters={() => {
            document.getElementById('results-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          trailingContent={
            <button
              onClick={() => showMap ? closeMap() : setShowMap(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                showMap
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="w-4 h-4" />
              Map View
            </button>
          }
        />

        <div className="mb-4 hidden md:flex items-center">
          <button
            onClick={() => showMap ? closeMap() : setShowMap(true)}
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

        <div id="results-anchor" className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 scroll-mt-4">
          <div className="text-center sm:text-left">
            {isLoading ? (
              <p className="text-muted-foreground">Loading properties...</p>
            ) : sortedProperties.length > 0 ? (
              <p className="text-muted-foreground">
                Showing {startIdx + 1}–{endIdx} of {sortedProperties.length} {sortedProperties.length === 1 ? 'property' : 'properties'} for sale
                {hasDrawnArea && ` in selected area`}
              </p>
            ) : (
              <p className="text-muted-foreground">
                No properties match your current filters. Try adjusting your search criteria.
              </p>
            )}
          </div>
          {!isLoading && sortedProperties.length > 0 && (
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px] text-sm">
                <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
                <SelectItem value="size-desc">Largest first</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <ActiveFilterChips chips={filterChips} onClearAll={handleClearFilters} />
        {hasNewUpdates && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
            <span className="text-foreground">New listings available</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setHasNewUpdates(false); fetchProperties(); }}
            >
              Refresh results
            </Button>
          </div>
        )}
      </div>

      {/* Split Layout: full-width when map is shown */}
      <div className={`${showMap ? 'px-4' : 'container mx-auto px-4'}`}>
        <div className={`flex ${showMap ? 'flex-col-reverse md:flex-row' : 'flex-col'} gap-6`}>
          {/* Property Grid */}
          <div
            className={`${showMap ? 'w-full md:w-[45%] overflow-y-auto max-h-[calc(50vh-120px)] md:max-h-[calc(100vh-120px)]' : 'w-full'} transition-all duration-300`}
          >
            {isLoading ? (
              <div className="mb-8 grid grid-cols-1 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedProperties.length > 0 ? (
              <div className="mb-8">
                <ScrollReveal animation="fade-up">
                  <h3 className="text-2xl font-semibold mb-6 text-foreground">Properties for Sale</h3>
                </ScrollReveal>
                <div className={`grid grid-cols-1 gap-6`}>
                  {paginatedProperties.map((property, index) => (
                    <ScrollReveal key={property.id} animation="fade-up" delay={100 + (index % 4) * 100}>
                      <PropertyCard
                        property={property}
                        onClick={handlePropertySelect}
                      />
                    </ScrollReveal>
                  ))}
                </div>
                <PropertyPagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </div>

          {/* Map Panel - right half of viewport */}
          {showMap && !mapFullscreen && (
            <div className={`w-full h-[50vh] md:h-[calc(100vh-120px)] md:w-[55%] md:sticky md:top-0 md:self-start z-30 bg-background relative overflow-hidden rounded-lg ${mapClosing ? 'animate-slide-fade-out-right' : 'animate-slide-fade-in-right'}`}>
              <div className="absolute top-2 right-2 z-[1000] flex gap-1">
                <button
                  onClick={() => setMapFullscreen(true)}
                  className="p-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={closeMap}
                  className="p-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors"
                  title="Close map"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CompactPropertyMap
                properties={sortedProperties}
                height="100%"
                defaultExpanded={false}
                onPropertySelect={handlePropertySelect}
                onDrawnAreaChange={handleDrawnAreaChange}
                enableDrawing={true}
                initialSearchLocation={locationInput}
                searchRadius={radius}
                embedded={true}
                onSaveArea={handleSaveArea}
                initialPolygon={initialPolygon}
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
        {showMap && mapFullscreen && (
          <CompactPropertyMap
            properties={sortedProperties}
            height="100vh"
            defaultExpanded={false}
            onPropertySelect={handlePropertySelect}
            onDrawnAreaChange={handleDrawnAreaChange}
            enableDrawing={true}
            initialSearchLocation={locationInput}
            searchRadius={radius}
            embedded={true}
            onSaveArea={handleSaveArea}
            initialPolygon={initialPolygon}
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
