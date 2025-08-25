import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Locate, Search, Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PropertyMapProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  height?: string;
  className?: string;
}

interface LocationMarkerProps {
  position: [number, number] | null;
  onLocationSelect: (lat: number, lng: number) => void;
  isPinPointMode: boolean;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ position, onLocationSelect, isPinPointMode }) => {
  useMapEvents({
    click(e) {
      if (isPinPointMode) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return position ? <Marker position={position} /> : null;
};

const PropertyMap: React.FC<PropertyMapProps> = ({
  latitude = 35.9078,
  longitude = 14.4109, // Default to Malta
  onLocationSelect,
  height = "300px",
  className = ""
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<[number, number]>([latitude, longitude]);
  const [searchAddress, setSearchAddress] = useState('');
  const [isPinPointMode, setIsPinPointMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setPosition([latitude, longitude]);
  }, [latitude, longitude]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPosition([latitude, longitude]);
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
      // Using Nominatim OpenStreetMap API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`
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

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const togglePinPointMode = () => {
    setIsPinPointMode(!isPinPointMode);
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
                size="sm"
                variant={isPinPointMode ? "default" : "outline"}
                className="flex items-center gap-2"
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

          {/* Map */}
          <div style={{ height: mapHeight }} className="rounded-lg overflow-hidden border">
            <MapContainer
              center={position}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              key={`${position[0]}-${position[1]}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker 
                position={position} 
                onLocationSelect={handleLocationSelect}
                isPinPointMode={isPinPointMode}
              />
            </MapContainer>
          </div>
          
          {isPinPointMode && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Click anywhere on the map to set the property location
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyMap;