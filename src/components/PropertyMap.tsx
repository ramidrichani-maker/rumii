import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Locate, Search, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface PropertyMapProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  height?: string;
  className?: string;
}

const PropertyMap: React.FC<PropertyMapProps> = ({
  latitude = 33.8938,
  longitude = 35.5018, // Default to Beirut, Lebanon
  onLocationSelect,
  height = "300px",
  className = ""
}) => {
  const { google, loaded } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number }>({ lat: latitude, lng: longitude });
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Initialize map once Google is loaded
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new google.maps.Marker({
      position,
      map,
      draggable: true,
      title: 'Drag to adjust location',
    });

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      const newPos = { lat: pos.lat(), lng: pos.lng() };
      setPosition(newPos);
      onLocationSelect(newPos.lat, newPos.lng);
    });

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
      marker.setPosition(newPos);
      onLocationSelect(newPos.lat, newPos.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [loaded, google]);

  // Sync external lat/lng changes
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    const newPos = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(newPos);
    mapInstanceRef.current.setCenter(newPos);
    setPosition(newPos);
  }, [latitude, longitude]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newPos = { lat: latitude, lng: longitude };
          setPosition(newPos);
          markerRef.current?.setPosition(newPos);
          mapInstanceRef.current?.setCenter(newPos);
          mapInstanceRef.current?.setZoom(15);
          onLocationSelect(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please ensure location services are enabled.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const searchLocation = async () => {
    if (!searchAddress.trim() || !google) return;
    setIsSearching(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: searchAddress, region: 'LB' });
      if (result.results.length > 0) {
        const r = result.results[0];
        const loc = r.geometry.location;
        const newPos = { lat: loc.lat(), lng: loc.lng() };
        setPosition(newPos);
        markerRef.current?.setPosition(newPos);
        mapInstanceRef.current?.setCenter(newPos);
        mapInstanceRef.current?.setZoom(15);
        onLocationSelect(newPos.lat, newPos.lng, r.formatted_address);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapInstanceRef.current && google) {
        google.maps.event.trigger(mapInstanceRef.current, 'resize');
        mapInstanceRef.current.setCenter(position);
      }
    }, 100);
  };
  const mapHeight = isFullscreen ? "70vh" : height;
  const mapClass = isFullscreen ? "fixed inset-0 z-50 bg-background p-4" : className;

  return (
    <div className={mapClass}>
      <Card className="h-full">
        <CardContent className="p-4 h-full">
          {/* Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Search address..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  className="flex-1"
                />
                <Button 
                  onClick={searchLocation} 
                  disabled={isSearching}
                  size="sm"
                  variant="outline"
                >
                  {isSearching ? 'Searching...' : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={getCurrentLocation} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Locate className="h-4 w-4" />
                Current Location
              </Button>
              
              <Button 
                onClick={toggleFullscreen}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isFullscreen ? 'Minimize' : 'Expand'}
              </Button>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative" style={{ height: mapHeight }}>
            <div 
              ref={mapRef}
              className="rounded-lg overflow-hidden border absolute inset-0"
            />
            {!loaded && (
              <div className="absolute inset-0 rounded-lg bg-muted/60 flex items-center justify-center z-[400] pointer-events-none">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Click anywhere on the map to set the property location, then drag the pin to fine-tune
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-center font-medium">
            🔒 For privacy, the exact location will not be shown to users. Only the general city area will be displayed on public maps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyMap;