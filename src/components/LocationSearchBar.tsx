import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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

interface LocationSearchBarProps {
  location: string;
  onLocationChange: (location: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const LocationSearchBar = ({ location, onLocationChange, radius, onRadiusChange }: LocationSearchBarProps) => {
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 px-4 gap-2 min-w-[130px]">
              <span className="text-sm font-medium">Radius: {selectedLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
      </div>
    </div>
  );
};

export default LocationSearchBar;
