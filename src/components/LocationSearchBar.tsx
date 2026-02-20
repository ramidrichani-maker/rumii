import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronDown, BedDouble, DollarSign, Home } from 'lucide-react';
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
  'Penthouse', 'Commercial Rental', 'Farm House', 'Building', 'Venue',
  'Studio', 'Rooftop', 'Land',
];

const generatePriceOptions = (): number[] => {
  const prices: number[] = [];
  for (let p = 10000; p < 250000; p += 10000) prices.push(p);
  for (let p = 250000; p < 500000; p += 25000) prices.push(p);
  for (let p = 500000; p < 1000000; p += 50000) prices.push(p);
  for (let p = 1000000; p < 3000000; p += 100000) prices.push(p);
  for (let p = 3000000; p < 5000000; p += 250000) prices.push(p);
  for (let p = 5000000; p <= 10000000; p += 500000) prices.push(p);
  return prices;
};

const priceOptions = generatePriceOptions();

const formatPrice = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
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
  } = props;
  const [activePriceTab, setActivePriceTab] = useState<'min' | 'max' | null>(null);
  const [activeBedroomTab, setActiveBedroomTab] = useState<'min' | 'max' | null>(null);
  const selectedLabel = radiusOptions.find(r => r.value === radius)?.label || `+${radius} km`;

  return (
    <div className="mb-6">
      <p className="text-sm text-muted-foreground mb-2 ml-1 font-medium">Enter location</p>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Search by area, city, address..."
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Radius Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 px-4 gap-2 min-w-[130px]">
              <span className="text-sm font-medium">Radius: {selectedLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50">
            {radiusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onRadiusChange(option.value)}
                className={radius === option.value ? 'bg-primary/10 text-primary' : ''}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bedrooms Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 px-4 gap-2 min-w-[140px]">
              <BedDouble className="w-4 h-4" />
              <span className="text-sm font-medium">Bedrooms</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 bg-popover z-50 p-4">
            <div className="space-y-3">
              {/* Min / Max toggle buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveBedroomTab(activeBedroomTab === 'min' ? null : 'min')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    activeBedroomTab === 'min'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  Min: {minBedrooms || 'No min'}
                </button>
                <button
                  onClick={() => setActiveBedroomTab(activeBedroomTab === 'max' ? null : 'max')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    activeBedroomTab === 'max'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  Max: {maxBedrooms || 'No max'}
                </button>
              </div>

              {/* Options list */}
              {activeBedroomTab && (
                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                  <button
                    onClick={() => {
                      if (activeBedroomTab === 'min') onMinBedroomsChange('');
                      else onMaxBedroomsChange('');
                    }}
                    className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors text-left ${
                      (activeBedroomTab === 'min' ? minBedrooms : maxBedrooms) === ''
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
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
                        className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors text-left ${
                          currentVal === opt
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/50'
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

        {/* Price Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 px-4 gap-2 min-w-[120px]">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Price</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
           <PopoverContent align="end" className="w-72 bg-popover z-50 p-4">
            <div className="space-y-3">
              {/* Min / Max toggle buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActivePriceTab(activePriceTab === 'min' ? null : 'min')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    activePriceTab === 'min'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  Min: {barMinPrice ? formatPrice(Number(barMinPrice)) : 'No min'}
                </button>
                <button
                  onClick={() => setActivePriceTab(activePriceTab === 'max' ? null : 'max')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    activePriceTab === 'max'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  Max: {barMaxPrice ? formatPrice(Number(barMaxPrice)) : 'No max'}
                </button>
              </div>

              {/* Options list */}
              {activePriceTab && (
                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                  <button
                    onClick={() => {
                      if (activePriceTab === 'min') onBarMinPriceChange('');
                      else onBarMaxPriceChange('');
                    }}
                    className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors text-left ${
                      (activePriceTab === 'min' ? barMinPrice : barMaxPrice) === ''
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
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
                        className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors text-left ${
                          currentVal === val
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/50'
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

        {/* Property Type Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 px-4 gap-2 min-w-[150px]">
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Property Type</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 bg-popover z-50 p-4">
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => onPropertyTypesChange([])}
                className={`flex items-center gap-3 px-3 py-2 rounded-md border text-sm font-medium transition-colors text-left ${
                  selectedPropertyTypes.length === 0
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-primary/50'
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-md border text-sm font-medium transition-colors text-left ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
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
    </div>
  );
};

export default LocationSearchBar;
