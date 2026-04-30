import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronDown, BedDouble, DollarSign, Home, SlidersHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const radiusOptions = [
  { label: 'None', value: 0 },
  { label: '+0.2 km', value: 0.2 },
  { label: '+0.5 km', value: 0.5 },
  { label: '+1 km', value: 1 },
  { label: '+1.5 km', value: 1.5 },
  { label: '+2 km', value: 2 },
  { label: '+3 km', value: 3 },
  { label: '+5 km', value: 5 },
  { label: '+10 km', value: 10 },
];

const bedroomOptions = ['Studio', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];

const propertyTypeOptions = [
  'Apartment', 'Villa', 'Beach House', 'Chalet', 'Duplex', 'Triplex',
  'Penthouse', 'Commercial', 'Farm House', 'Building', 'Venue',
  'Studio', 'Rooftop', 'Land',
];

const mustHaveOptions = ['Garden', 'Parking/Garage', 'Balcony/Terrace'];

const propertyFeatureOptions = [
  'Swimming Pool', 'Gym', 'Elevator', 'Storage Room',
  'Security', 'Concierge', 'EV Charging', 'Patio', 'Basement',
  'Sea View', 'Mountain View', 'Fireplace', 'Smart-home',
];

const addedToOracleOptions = [
  { label: 'Anytime', value: '' },
  { label: 'Last 24 hours', value: '1' },
  { label: 'Last 3 days', value: '3' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 14 days', value: '14' },
  { label: 'Last 30 days', value: '30' },
];

const generatePriceOptions = (): number[] => {
  const prices: number[] = [];
  for (let p = 50000; p < 250000; p += 10000) prices.push(p);
  for (let p = 250000; p < 500000; p += 25000) prices.push(p);
  for (let p = 500000; p < 1000000; p += 50000) prices.push(p);
  for (let p = 1000000; p < 3000000; p += 100000) prices.push(p);
  for (let p = 3000000; p < 5000000; p += 250000) prices.push(p);
  for (let p = 5000000; p <= 10000000; p += 500000) prices.push(p);
  return prices;
};

const priceOptions = generatePriceOptions();

const formatPrice = (value: number): string => {
  return `$${value.toLocaleString()}`;
};

interface LocationSearchBarProps {
  location: string;
  onLocationChange: (location: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  minBedrooms: string;
  maxBedrooms: string;
  onMinBedroomsChange: (value: string) => void;
  onMaxBedroomsChange: (value: string) => void;
  barMinPrice: string;
  barMaxPrice: string;
  onBarMinPriceChange: (value: string) => void;
  onBarMaxPriceChange: (value: string) => void;
  selectedPropertyTypes: string[];
  onPropertyTypesChange: (types: string[]) => void;
  selectedMustHaves: string[];
  onMustHavesChange: (items: string[]) => void;
  selectedFeatures: string[];
  onFeaturesChange: (items: string[]) => void;
  addedToOracle: string;
  onAddedToOracleChange: (value: string) => void;
  keywords: string;
  onKeywordsChange: (value: string) => void;
  unfurnishedOnly?: boolean;
  onUnfurnishedChange?: (value: boolean) => void;
}

const LocationSearchBar = (props: LocationSearchBarProps) => {
  const {
    location,
    onLocationChange,
    radius,
    onRadiusChange,
    minBedrooms,
    maxBedrooms,
    onMinBedroomsChange,
    onMaxBedroomsChange,
    barMinPrice,
    barMaxPrice,
    onBarMinPriceChange,
    onBarMaxPriceChange,
    selectedPropertyTypes,
    onPropertyTypesChange,
    selectedMustHaves,
    onMustHavesChange,
    selectedFeatures,
    onFeaturesChange,
    addedToOracle,
    onAddedToOracleChange,
    keywords,
    onKeywordsChange,
    unfurnishedOnly,
    onUnfurnishedChange,
  } = props;
  const isMobile = useIsMobile();
  const [activePriceTab, setActivePriceTab] = useState<'min' | 'max' | null>(null);
  const [activeBedroomTab, setActiveBedroomTab] = useState<'min' | 'max' | null>(null);
  const [activeFilterBedroomTab, setActiveFilterBedroomTab] = useState<'min' | 'max' | null>(null);
  const [activeFilterPriceTab, setActiveFilterPriceTab] = useState<'min' | 'max' | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const selectedLabel = radius === 0 ? 'None' : (radiusOptions.find(r => r.value === radius)?.label || `+${radius} km`);

  // Count of active filters (excluding the location input itself), used for
  // the mobile collapsed "Filters" button badge.
  const activeFilterCount = [
    radius !== 0,
    !!minBedrooms,
    !!maxBedrooms,
    !!barMinPrice,
    !!barMaxPrice,
    selectedPropertyTypes.length > 0,
    selectedMustHaves.length > 0,
    selectedFeatures.length > 0,
    !!addedToOracle,
    !!keywords,
    !!unfurnishedOnly,
  ].filter(Boolean).length;

  const bedroomMobileRef = useRef<HTMLDivElement>(null);
  const priceMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile) return;
    if (!activeBedroomTab && !activePriceTab) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (activeBedroomTab && bedroomMobileRef.current && !bedroomMobileRef.current.contains(target)) {
        setActiveBedroomTab(null);
      }
      if (activePriceTab && priceMobileRef.current && !priceMobileRef.current.contains(target)) {
        setActivePriceTab(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isMobile, activeBedroomTab, activePriceTab]);

  return (
    <div className="mb-6 sticky top-0 z-30 bg-background/15 backdrop-blur-md pt-2 pb-1 md:static md:z-auto md:pt-0 md:pb-0 md:bg-transparent md:backdrop-blur-none">
      <p className="text-sm text-muted-foreground mb-2 ml-1 font-medium">Enter location</p>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 items-stretch md:flex-1 md:min-w-0">
          <div className="relative flex-1 min-w-0">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Search by area, city, address..."
              className="pl-10 h-12 text-base"
            />
          </div>
          {/* Mobile-only: collapse all filters behind a single button */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(o => !o)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-filters-panel"
            className="md:hidden h-12 px-4 rounded-md border border-border bg-background/40 text-sm font-medium flex items-center gap-2 shrink-0 hover:border-primary/50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <div
          id="mobile-filters-panel"
          className={`${mobileFiltersOpen ? 'flex' : 'hidden'} md:flex flex-col gap-2 md:flex-row md:gap-3 md:overflow-x-visible w-full md:w-auto shrink-0`}
        >
        {/* Row 1: Radius */}
        <div className="flex flex-col gap-1 md:contents">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap md:hidden">Search radius</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 md:h-12 px-4 gap-2 min-w-[130px] flex-1 md:flex-initial">
                <span className="text-sm font-medium">Radius: {selectedLabel}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto bg-background/15 backdrop-blur-md z-50 p-3 border-border/50 rounded-2xl">
              <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-200px)] overflow-y-auto rounded-2xl p-2 w-fit">
                {radiusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onRadiusChange(option.value)}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                      radius === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-transparent bg-transparent hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 2: Bedrooms */}
        <div className="flex flex-col gap-1 md:contents">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap md:hidden">No. of bedrooms</span>
          {/* Mobile: inline min/max */}
          {isMobile ? (
            <div className="space-y-2" ref={bedroomMobileRef}>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveBedroomTab(activeBedroomTab === 'min' ? null : 'min')}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    activeBedroomTab === 'min'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/15 hover:border-primary/50'
                  }`}
                >
                  Min: {minBedrooms || 'No min'}
                </button>
                <button
                  onClick={() => setActiveBedroomTab(activeBedroomTab === 'max' ? null : 'max')}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    activeBedroomTab === 'max'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/15 hover:border-primary/50'
                  }`}
                >
                  Max: {maxBedrooms || 'No max'}
                </button>
              </div>
              {activeBedroomTab && (
                <div className="grid grid-cols-1 gap-1 max-h-[70vh] overflow-y-auto rounded-2xl p-2 w-full bg-background/15 backdrop-blur-md border border-border/50">
                  <button
                    onClick={() => {
                      if (activeBedroomTab === 'min') onMinBedroomsChange('');
                      else onMaxBedroomsChange('');
                      setActiveBedroomTab(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                      (activeBedroomTab === 'min' ? minBedrooms : maxBedrooms) === ''
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-transparent bg-transparent hover:border-primary/50'
                    }`}
                  >
                    {activeBedroomTab === 'min' ? 'No min' : 'No max'}
                  </button>
                  {bedroomOptions.map((opt) => {
                    const currentVal = activeBedroomTab === 'min' ? minBedrooms : maxBedrooms;
                    const onChange = activeBedroomTab === 'min' ? onMinBedroomsChange : onMaxBedroomsChange;
                    return (
                      <button
                        key={`${activeBedroomTab}-${opt}`}
                        onClick={() => {
                          onChange(currentVal === opt ? '' : opt);
                          setActiveBedroomTab(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                          currentVal === opt
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-transparent hover:border-primary/50'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Desktop: popover */
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 px-4 gap-2 min-w-[140px]">
                  <BedDouble className="w-4 h-4" />
                  <span className="text-sm font-medium">Bedrooms</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto bg-background/15 backdrop-blur-md z-50 p-3 border-border/50 rounded-2xl">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveBedroomTab(activeBedroomTab === 'min' ? null : 'min')}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        activeBedroomTab === 'min'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background/15 hover:border-primary/50'
                      }`}
                    >
                      Min: {minBedrooms || 'No min'}
                    </button>
                    <button
                      onClick={() => setActiveBedroomTab(activeBedroomTab === 'max' ? null : 'max')}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        activeBedroomTab === 'max'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background/15 hover:border-primary/50'
                      }`}
                    >
                      Max: {maxBedrooms || 'No max'}
                    </button>
                  </div>
                  {activeBedroomTab && (
                    <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-200px)] overflow-y-auto rounded-2xl p-2 w-fit">
                      <button
                        onClick={() => {
                          if (activeBedroomTab === 'min') onMinBedroomsChange('');
                          else onMaxBedroomsChange('');
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                          (activeBedroomTab === 'min' ? minBedrooms : maxBedrooms) === ''
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-transparent hover:border-primary/50'
                        }`}
                      >
                        {activeBedroomTab === 'min' ? 'No min' : 'No max'}
                      </button>
                      {bedroomOptions.map((opt) => {
                        const currentVal = activeBedroomTab === 'min' ? minBedrooms : maxBedrooms;
                        const onChange = activeBedroomTab === 'min' ? onMinBedroomsChange : onMaxBedroomsChange;
                        return (
                          <button
                            key={`${activeBedroomTab}-${opt}`}
                            onClick={() => onChange(currentVal === opt ? '' : opt)}
                            className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                              currentVal === opt
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-transparent bg-transparent hover:border-primary/50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Row 3: Price */}
        <div className="flex flex-col gap-1 md:contents">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap md:hidden">Price range</span>
          {isMobile ? (
            <div className="space-y-2" ref={priceMobileRef}>
              <div className="flex gap-2">
                <button
                  onClick={() => setActivePriceTab(activePriceTab === 'min' ? null : 'min')}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    activePriceTab === 'min'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/15 hover:border-primary/50'
                  }`}
                >
                  Min: {barMinPrice ? formatPrice(Number(barMinPrice)) : 'No min'}
                </button>
                <button
                  onClick={() => setActivePriceTab(activePriceTab === 'max' ? null : 'max')}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    activePriceTab === 'max'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/15 hover:border-primary/50'
                  }`}
                >
                  Max: {barMaxPrice ? formatPrice(Number(barMaxPrice)) : 'No max'}
                </button>
              </div>
              {activePriceTab && (
                <div className="grid grid-cols-1 gap-1 max-h-[70vh] overflow-y-auto rounded-2xl p-2 w-full bg-background/15 backdrop-blur-md border border-border/50">
                  <button
                    onClick={() => {
                      if (activePriceTab === 'min') onBarMinPriceChange('');
                      else onBarMaxPriceChange('');
                      setActivePriceTab(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                      (activePriceTab === 'min' ? barMinPrice : barMaxPrice) === ''
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-transparent bg-transparent hover:border-primary/50'
                    }`}
                  >
                    {activePriceTab === 'min' ? 'No min' : 'No max'}
                  </button>
                  {priceOptions.map((price) => {
                    const val = String(price);
                    const currentVal = activePriceTab === 'min' ? barMinPrice : barMaxPrice;
                    const onChange = activePriceTab === 'min' ? onBarMinPriceChange : onBarMaxPriceChange;
                    return (
                      <button
                        key={`${activePriceTab}-${price}`}
                        onClick={() => {
                          onChange(currentVal === val ? '' : val);
                          setActivePriceTab(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                          currentVal === val
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-transparent hover:border-primary/50'
                        }`}
                      >
                        {formatPrice(price)}{price === 10000000 ? '+' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 px-4 gap-2 min-w-[120px]">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Price</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto bg-background/15 backdrop-blur-md z-50 p-3 border-border/50 rounded-2xl">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActivePriceTab(activePriceTab === 'min' ? null : 'min')}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        activePriceTab === 'min'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background/15 hover:border-primary/50'
                      }`}
                    >
                      Min: {barMinPrice ? formatPrice(Number(barMinPrice)) : 'No min'}
                    </button>
                    <button
                      onClick={() => setActivePriceTab(activePriceTab === 'max' ? null : 'max')}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        activePriceTab === 'max'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background/15 hover:border-primary/50'
                      }`}
                    >
                      Max: {barMaxPrice ? formatPrice(Number(barMaxPrice)) : 'No max'}
                    </button>
                  </div>
                  {activePriceTab && (
                    <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-200px)] overflow-y-auto rounded-2xl p-2 w-fit">
                      <button
                        onClick={() => {
                          if (activePriceTab === 'min') onBarMinPriceChange('');
                          else onBarMaxPriceChange('');
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                          (activePriceTab === 'min' ? barMinPrice : barMaxPrice) === ''
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-transparent hover:border-primary/50'
                        }`}
                      >
                        {activePriceTab === 'min' ? 'No min' : 'No max'}
                      </button>
                      {priceOptions.map((price) => {
                        const val = String(price);
                        const currentVal = activePriceTab === 'min' ? barMinPrice : barMaxPrice;
                        const onChange = activePriceTab === 'min' ? onBarMinPriceChange : onBarMaxPriceChange;
                        return (
                          <button
                            key={`${activePriceTab}-${price}`}
                            onClick={() => onChange(currentVal === val ? '' : val)}
                            className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                              currentVal === val
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-transparent bg-transparent hover:border-primary/50'
                            }`}
                          >
                            {formatPrice(price)}{price === 10000000 ? '+' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Row 4: Property Type */}
        <div className="flex flex-col gap-1 md:contents">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap md:hidden">Property type</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 md:h-12 px-4 gap-2 min-w-[150px] flex-1 md:flex-initial">
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Property Type</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto bg-background/15 backdrop-blur-md z-50 p-3 border-border/50 rounded-2xl">
              <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-200px)] overflow-y-auto rounded-2xl p-2 w-fit">
                <button
                  onClick={() => onPropertyTypesChange([])}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-colors text-left ${
                    selectedPropertyTypes.length === 0
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-transparent bg-transparent hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedPropertyTypes.length === 0}
                    className="pointer-events-none"
                  />
                  Show All
                </button>
                {propertyTypeOptions.map((type) => {
                  const typeId = type.toLowerCase();
                  const isSelected = selectedPropertyTypes.includes(typeId);
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (isSelected) {
                          onPropertyTypesChange(selectedPropertyTypes.filter(t => t !== typeId));
                        } else {
                          onPropertyTypesChange([...selectedPropertyTypes, typeId]);
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-colors text-left ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-transparent bg-transparent hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      {type}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 5: Advanced Filter */}
        <div className="flex flex-col gap-1 md:contents">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap md:hidden">Advanced</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 md:h-12 px-4 gap-2 min-w-[110px] flex-1 md:flex-initial">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          <PopoverContent align="end" className="w-[400px] bg-background/15 backdrop-blur-md z-50 p-4 max-h-[80vh] overflow-y-auto border-border/50 rounded-2xl">
            <div className="space-y-5">
              {/* Bedrooms section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Bedrooms</h4>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setActiveFilterBedroomTab(activeFilterBedroomTab === 'min' ? null : 'min')}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      activeFilterBedroomTab === 'min'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background/15 hover:border-primary/50'
                    }`}
                  >
                    Min: {minBedrooms || 'No min'}
                  </button>
                  <button
                    onClick={() => setActiveFilterBedroomTab(activeFilterBedroomTab === 'max' ? null : 'max')}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      activeFilterBedroomTab === 'max'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background/15 hover:border-primary/50'
                    }`}
                  >
                    Max: {maxBedrooms || 'No max'}
                  </button>
                </div>
                {activeFilterBedroomTab && (
                  <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-300px)] overflow-y-auto rounded-2xl p-2 w-fit">
                    <button
                      onClick={() => {
                        if (activeFilterBedroomTab === 'min') onMinBedroomsChange('');
                        else onMaxBedroomsChange('');
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                        (activeFilterBedroomTab === 'min' ? minBedrooms : maxBedrooms) === ''
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-transparent bg-transparent hover:border-primary/50'
                      }`}
                    >
                      {activeFilterBedroomTab === 'min' ? 'No min' : 'No max'}
                    </button>
                    {bedroomOptions.map((opt) => {
                      const currentVal = activeFilterBedroomTab === 'min' ? minBedrooms : maxBedrooms;
                      const onChange = activeFilterBedroomTab === 'min' ? onMinBedroomsChange : onMaxBedroomsChange;
                      return (
                        <button
                          key={`filter-bed-${activeFilterBedroomTab}-${opt}`}
                          onClick={() => onChange(currentVal === opt ? '' : opt)}
                          className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                            currentVal === opt
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-transparent bg-transparent hover:border-primary/50'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Price section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Price</h4>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setActiveFilterPriceTab(activeFilterPriceTab === 'min' ? null : 'min')}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      activeFilterPriceTab === 'min'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background/15 hover:border-primary/50'
                    }`}
                  >
                    Min: {barMinPrice ? formatPrice(Number(barMinPrice)) : 'No min'}
                  </button>
                  <button
                    onClick={() => setActiveFilterPriceTab(activeFilterPriceTab === 'max' ? null : 'max')}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      activeFilterPriceTab === 'max'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background/15 hover:border-primary/50'
                    }`}
                  >
                    Max: {barMaxPrice ? formatPrice(Number(barMaxPrice)) : 'No max'}
                  </button>
                </div>
                {activeFilterPriceTab && (
                  <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-300px)] overflow-y-auto rounded-2xl p-2 w-fit">
                      <button
                        onClick={() => {
                          if (activeFilterPriceTab === 'min') onBarMinPriceChange('');
                          else onBarMaxPriceChange('');
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                          (activeFilterPriceTab === 'min' ? barMinPrice : barMaxPrice) === ''
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-transparent hover:border-primary/50'
                        }`}
                      >
                        {activeFilterPriceTab === 'min' ? 'No min' : 'No max'}
                      </button>
                      {priceOptions.map((price) => {
                        const val = String(price);
                        const currentVal = activeFilterPriceTab === 'min' ? barMinPrice : barMaxPrice;
                        const onChange = activeFilterPriceTab === 'min' ? onBarMinPriceChange : onBarMaxPriceChange;
                        return (
                          <button
                            key={`filter-price-${activeFilterPriceTab}-${price}`}
                            onClick={() => onChange(currentVal === val ? '' : val)}
                            className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                              currentVal === val
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-transparent bg-transparent hover:border-primary/50'
                            }`}
                          >
                            {formatPrice(price)}{price === 10000000 ? '+' : ''}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Property Type section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Property Type</h4>
                <div className="grid grid-cols-1 gap-1 max-h-[calc(100vh-300px)] overflow-y-auto rounded-2xl p-2 w-fit">
                  <button
                    onClick={() => onPropertyTypesChange([])}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-colors text-left ${
                      selectedPropertyTypes.length === 0
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-transparent bg-transparent hover:border-primary/50'
                    }`}
                  >
                    <Checkbox checked={selectedPropertyTypes.length === 0} className="pointer-events-none" />
                    Show All
                  </button>
                  {propertyTypeOptions.map((type) => {
                    const typeId = type.toLowerCase();
                    const isSelected = selectedPropertyTypes.includes(typeId);
                    return (
                      <button
                        key={`filter-type-${type}`}
                        onClick={() => {
                          if (isSelected) {
                            onPropertyTypesChange(selectedPropertyTypes.filter(t => t !== typeId));
                          } else {
                            onPropertyTypesChange([...selectedPropertyTypes, typeId]);
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-colors text-left ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-transparent hover:border-primary/50'
                        }`}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unfurnished toggle */}
              {onUnfurnishedChange !== undefined && (
                <div className="mt-2">
                  <button
                    onClick={() => onUnfurnishedChange(!unfurnishedOnly)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left w-full"
                  >
                    <Checkbox checked={!!unfurnishedOnly} className="pointer-events-none" />
                    <span className="text-sm font-medium">Show only unfurnished properties</span>
                  </button>
                </div>
              )}

              <div className="border-t border-border" />

              {/* Must-Haves section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Must-Haves</h4>
                <div className="flex flex-col gap-2">
                  {mustHaveOptions.map((item) => {
                    const isSelected = selectedMustHaves.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => {
                          if (isSelected) {
                            onMustHavesChange(selectedMustHaves.filter(m => m !== item));
                          } else {
                            onMustHavesChange([...selectedMustHaves, item]);
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="text-sm font-medium">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Property Features section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Property Features</h4>
                <div className="grid grid-cols-2 gap-1">
                  {propertyFeatureOptions.map((item) => {
                    const isSelected = selectedFeatures.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => {
                          if (isSelected) {
                            onFeaturesChange(selectedFeatures.filter(f => f !== item));
                          } else {
                            onFeaturesChange([...selectedFeatures, item]);
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="text-sm font-medium">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Added to Oracle section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Added to Oracle</h4>
                <div className="flex flex-col gap-1">
                  {addedToOracleOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => onAddedToOracleChange(option.value)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                        addedToOracle === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        addedToOracle === option.value ? 'border-primary-foreground' : 'border-muted-foreground'
                      }`}>
                        {addedToOracle === option.value && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Keywords section */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Keywords</h4>
                <Input
                  value={keywords}
                  onChange={(e) => onKeywordsChange(e.target.value)}
                  placeholder="e.g. sea view, modern, quiet..."
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        </div>
        {(minBedrooms || maxBedrooms || barMinPrice || barMaxPrice ||
          selectedPropertyTypes.length > 0 || selectedMustHaves.length > 0 ||
          selectedFeatures.length > 0 || addedToOracle || keywords ||
          unfurnishedOnly || radius > 0) && (
          <button
            onClick={() => {
              onMinBedroomsChange('');
              onMaxBedroomsChange('');
              onBarMinPriceChange('');
              onBarMaxPriceChange('');
              onPropertyTypesChange([]);
              onMustHavesChange([]);
              onFeaturesChange([]);
              onAddedToOracleChange('');
              onKeywordsChange('');
              onRadiusChange(0);
              if (onUnfurnishedChange) onUnfurnishedChange(false);
              setActiveBedroomTab(null);
              setActivePriceTab(null);
              setActiveFilterBedroomTab(null);
              setActiveFilterPriceTab(null);
            }}
            className="md:hidden h-10 px-4 rounded-xl border border-border bg-background/15 text-sm font-medium hover:border-primary/50 transition-colors"
          >
            Clear all filters
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

export default LocationSearchBar;
