import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Locate, Search, Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinPointMarkerRef = useRef<L.Marker | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<[number, number]>([latitude, longitude]);
  const [searchAddress, setSearchAddress] = useState('');
  const [isPinPointMode, setIsPinPointMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;

    try {
      // Create custom icon
      const customIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Initialize map
      const map = L.map(mapRef.current).setView(position, 13);
      
      // Add tile layer with English labels
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Add marker with draggable option
      const marker = L.marker(position, { 
        icon: customIcon,
        draggable: true 
      }).addTo(map);
      
      // Add drag event listener to marker
      marker.on('dragend', () => {
        const newPos = marker.getLatLng();
        setPosition([newPos.lat, newPos.lng]);
        onLocationSelect(newPos.lat, newPos.lng);
      });
      
      // Add click handler
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isPinPointMode) {
          const { lat, lng } = e.latlng;
          setPosition([lat, lng]);
          onLocationSelect(lat, lng);
          
          // Remove existing pinpoint marker
          if (pinPointMarkerRef.current) {
            pinPointMarkerRef.current.remove();
          }
          
          // Create new pinpoint marker with custom pin icon
          const pinIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            `),
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          });
          
          pinPointMarkerRef.current = L.marker([lat, lng], { 
            icon: pinIcon,
            draggable: true 
          }).addTo(map);
          
          // Add drag event listener
          pinPointMarkerRef.current.on('dragend', () => {
            if (pinPointMarkerRef.current) {
              const newPos = pinPointMarkerRef.current.getLatLng();
              setPosition([newPos.lat, newPos.lng]);
              onLocationSelect(newPos.lat, newPos.lng);
            }
          });
          
          pinPointMarkerRef.current.bindPopup('Drag me to adjust location').openPopup();
        }
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
      setMapInitialized(true);

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
        pinPointMarkerRef.current = null;
        setMapInitialized(false);
      }
    };
  }, []);

  // Update marker position when position changes
  useEffect(() => {
    if (markerRef.current && leafletMapRef.current) {
      markerRef.current.setLatLng(position);
      leafletMapRef.current.setView(position, leafletMapRef.current.getZoom());
    }
  }, [position]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newPosition: [number, number] = [latitude, longitude];
          setPosition(newPosition);
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
    if (!searchAddress.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(searchAddress)}&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPosition: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPosition);
        onLocationSelect(parseFloat(lat), parseFloat(lon), display_name);
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
    // Re-initialize map size after fullscreen toggle
    setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 100);
  };

  const togglePinPointMode = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsPinPointMode(!isPinPointMode);
    // Remove focus from any input elements to prevent keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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
                onClick={togglePinPointMode}
                onMouseDown={(e) => e.preventDefault()}
                size="sm"
                variant={isPinPointMode ? "default" : "outline"}
                className="flex items-center gap-2"
                type="button"
              >
                <MapPin className="h-4 w-4" />
                {isPinPointMode ? 'Click Map to Pin' : 'Enable Pinpoint'}
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
          <div 
            ref={mapRef}
            style={{ height: mapHeight }} 
            className="rounded-lg overflow-hidden border"
          />
          
          {isPinPointMode && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Click anywhere on the map to set the property location, then drag the pin to fine-tune
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyMap;