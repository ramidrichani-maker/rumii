import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Locate, Search, Maximize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Property {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: 'rent' | 'sale';
}

interface CompactPropertyMapProps {
  properties: Property[];
  className?: string;
  onPropertySelect?: (property: Property) => void;
}

const CompactPropertyMap: React.FC<CompactPropertyMapProps> = ({
  properties = [],
  className = "",
  onPropertySelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;

    try {
      // Initialize map with Beirut, Lebanon as default center
      const map = L.map(mapRef.current).setView([33.8938, 35.5018], 12);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
      setMapInitialized(true);

    } catch (error) {
      console.error('Error initializing compact property search map:', error);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = [];
        setMapInitialized(false);
      }
    };
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!leafletMapRef.current || !mapInitialized) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (properties.length === 0) return;

    try {
      const propertyIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `),
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20],
      });

      const bounds = L.latLngBounds([]);

      properties.forEach(property => {
        if (property.latitude && property.longitude) {
          const marker = L.marker([property.latitude, property.longitude], { icon: propertyIcon })
            .addTo(leafletMapRef.current!);

          // Create popup content
          const popupContent = `
            <div class="p-2 min-w-[180px]">
              <h3 class="font-semibold text-sm mb-1">${property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)} in ${property.city}</h3>
              <p class="text-xs text-gray-600 mb-2">${property.address}</p>
              <div class="text-xs space-y-1">
                <div><strong>Price:</strong> $${property.price.toLocaleString()}</div>
                <div><strong>Size:</strong> ${property.square_meters}m²</div>
                <div><strong>Beds:</strong> ${property.bedrooms} | <strong>Baths:</strong> ${property.bathrooms}</div>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          
          // Add click handler
          marker.on('click', () => {
            if (onPropertySelect) {
              onPropertySelect(property);
            }
          });

          markersRef.current.push(marker);
          bounds.extend([property.latitude, property.longitude]);
        }
      });

      // Fit map to show all properties
      if (bounds.isValid()) {
        leafletMapRef.current.fitBounds(bounds, { padding: [10, 10] });
      }

    } catch (error) {
      console.error('Error updating property markers:', error);
    }
  }, [properties, mapInitialized, onPropertySelect]);

  // Handle map resize when expanded
  useEffect(() => {
    if (leafletMapRef.current && isExpanded) {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 100);
    }
  }, [isExpanded]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([latitude, longitude], 13);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const searchLocation = async () => {
    if (!searchAddress.trim() || !leafletMapRef.current) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress + ', Lebanon')}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        leafletMapRef.current.setView([parseFloat(lat), parseFloat(lon)], 13);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const mapHeight = isExpanded ? "60vh" : "250px";
  const mapClass = isExpanded ? "fixed inset-0 z-50 bg-background p-4" : className;

  return (
    <div className={mapClass}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Map View ({properties.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleExpanded}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {/* Search Controls */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Search municipality..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
              className="flex-1 h-8 text-sm"
            />
            <Button 
              onClick={searchLocation} 
              disabled={isSearching}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Search className="h-3 w-3" />
            </Button>
            <Button 
              onClick={getCurrentLocation} 
              size="sm" 
              variant="outline"
              className="h-8"
            >
              <Locate className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Map Container */}
          <div 
            ref={mapRef}
            style={{ height: mapHeight }} 
            className="rounded-lg overflow-hidden border"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactPropertyMap;