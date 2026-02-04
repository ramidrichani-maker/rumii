import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
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

interface PropertySearchMapProps {
  properties: Property[];
  height?: string;
  className?: string;
  onPropertySelect?: (property: Property) => void;
}

const PropertySearchMap: React.FC<PropertySearchMapProps> = ({
  properties = [],
  height = "400px",
  className = "",
  onPropertySelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;

    try {
      // Create custom icon for property markers
      const propertyIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      // Initialize map with Beirut, Lebanon as default center
      const map = L.map(mapRef.current).setView([33.8938, 35.5018], 12);
      
      // Add tile layer with English labels (Esri World Street Map)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
      setMapInitialized(true);

    } catch (error) {
      console.error('Error initializing property search map:', error);
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
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
      });

      const bounds = L.latLngBounds([]);

      properties.forEach(property => {
        if (property.latitude && property.longitude) {
          const marker = L.marker([property.latitude, property.longitude], { icon: propertyIcon })
            .addTo(leafletMapRef.current!);

          // Create popup content
          const popupContent = `
            <div class="p-2 min-w-[200px]">
              <h3 class="font-semibold text-sm mb-1">${property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)} in ${property.city}</h3>
              <p class="text-xs text-gray-600 mb-2">${property.address}</p>
              <div class="text-xs space-y-1">
                <div><strong>Price:</strong> $${property.price.toLocaleString()}</div>
                <div><strong>Size:</strong> ${property.square_meters}m²</div>
                <div><strong>Bedrooms:</strong> ${property.bedrooms} | <strong>Bathrooms:</strong> ${property.bathrooms}</div>
                <div><strong>Type:</strong> For ${property.listing_type}</div>
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
        leafletMapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }

    } catch (error) {
      console.error('Error updating property markers:', error);
    }
  }, [properties, mapInitialized, onPropertySelect]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Property Locations ({properties.length} properties)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef}
          style={{ height }} 
          className="rounded-lg overflow-hidden border"
        />
      </CardContent>
    </Card>
  );
};

export default PropertySearchMap;