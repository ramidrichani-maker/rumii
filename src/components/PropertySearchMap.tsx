import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCityCenter } from '@/utils/cityCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleMaps, MAP_STYLES_NO_POI } from '@/hooks/useGoogleMaps';

function hashStringToUnit(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}

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
  listing_type: 'rent' | 'sale' | 'both';
}

interface PropertySearchMapProps {
  properties: Property[];
  height?: string;
  className?: string;
  onPropertySelect?: (property: Property) => void;
}

const MARKER_ICON_URL =
  'data:image/svg+xml;base64,' +
  btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `);

const PropertySearchMap: React.FC<PropertySearchMapProps> = ({
  properties = [],
  height = '400px',
  className = '',
  onPropertySelect,
}) => {
  const { profile } = useAuth();
  const { google, loaded } = useGoogleMaps();
  const isAdmin = profile?.role === 'admin';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [locating, setLocating] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: 33.8938, lng: 35.5018 },
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      styles: MAP_STYLES_NO_POI,
    });
    infoWindowRef.current = new google.maps.InfoWindow();
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstance.current = null;
    };
  }, [loaded, google]);

  // Update markers when properties change
  useEffect(() => {
    if (!loaded || !google || !mapInstance.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (properties.length === 0) return;

    let cancelled = false;

    const addMarkers = async () => {
      let cityCenters: Record<string, { lat: number; lng: number }> = {};
      if (!isAdmin) {
        const uniqueCities = [...new Set(properties.map((p) => p.city).filter(Boolean))];
        await Promise.all(
          uniqueCities.map(async (city) => {
            const center = await getCityCenter(city);
            if (center) cityCenters[city] = center;
          })
        );
      }
      if (cancelled) return;

      const bounds = new google.maps.LatLngBounds();

      properties.forEach((property) => {
        let pos: { lat: number; lng: number };
        if (isAdmin && property.latitude && property.longitude) {
          pos = { lat: property.latitude, lng: property.longitude };
        } else {
          const c = cityCenters[property.city];
          if (!c) return;
          pos = {
            lat: c.lat + (Math.random() - 0.5) * 0.008,
            lng: c.lng + (Math.random() - 0.5) * 0.008,
          };
        }

        const marker = new google.maps.Marker({
          position: pos,
          map: mapInstance.current!,
          icon: {
            url: MARKER_ICON_URL,
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 24),
          },
        });

        const propTypeCap =
          property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1);

        const popupHtml = `
          <div style="padding:8px;min-width:200px;">
            <h3 style="font-weight:600;font-size:14px;margin:0 0 4px 0;">${propTypeCap} in ${property.city}</h3>
            <p style="font-size:12px;color:#666;margin:0 0 8px 0;">${property.address}</p>
            <div style="font-size:12px;line-height:1.5;">
              <div><strong>Price:</strong> $${property.price.toLocaleString()}</div>
              <div><strong>Size:</strong> ${property.square_meters}m²</div>
              <div><strong>Bedrooms:</strong> ${property.bedrooms} | <strong>Bathrooms:</strong> ${property.bathrooms}</div>
              <div><strong>Type:</strong> For ${property.listing_type}</div>
            </div>
          </div>
        `;

        const openInfo = () => {
          if (infoWindowRef.current && mapInstance.current) {
            infoWindowRef.current.setContent(popupHtml);
            infoWindowRef.current.open({ map: mapInstance.current, anchor: marker });
          }
        };
        marker.addListener('mouseover', openInfo);
        marker.addListener('click', () => {
          openInfo();
          if (onPropertySelect) onPropertySelect(property);
        });

        markersRef.current.push(marker);
        bounds.extend(pos);
      });

      // Keep the default Beirut center; do not auto-fit to all property
      // markers when no search has been performed.
    };

    addMarkers();
    return () => {
      cancelled = true;
    };
  }, [properties, loaded, google, isAdmin, onPropertySelect]);

  const goToCurrentLocation = () => {
    if (!mapInstance.current || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current?.setCenter({ lat: latitude, lng: longitude });
        mapInstance.current?.setZoom(15);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert('Unable to get your location. Please ensure location services are enabled.');
      }
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Locations ({properties.length} properties)
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={goToCurrentLocation}
            disabled={!loaded || locating}
          >
            {locating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Locate className="h-4 w-4 mr-1" />}
            Current location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          <div ref={mapRef} className="rounded-lg overflow-hidden border absolute inset-0" />
          {!loaded && (
            <div className="absolute inset-0 rounded-lg bg-muted/60 flex items-center justify-center z-[400] pointer-events-none">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertySearchMap;
