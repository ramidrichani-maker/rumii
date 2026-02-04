import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Locate, Search, Maximize2, PenTool, Trash2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

interface Property {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  municipality?: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: 'rent' | 'sale';
  year_built?: number;
  last_renovated?: number;
  amenities: string[];
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
}

interface DrawnPolygonCoordinate {
  latitude: number;
  longitude: number;
}

interface CompactPropertyMapProps {
  properties: Property[];
  className?: string;
  onPropertySelect?: (property: Property) => void;
  height?: string;
  defaultExpanded?: boolean;
  onDrawnAreaChange?: (polygon: DrawnPolygonCoordinate[] | null) => void;
  enableDrawing?: boolean;
}

const CompactPropertyMap: React.FC<CompactPropertyMapProps> = ({
  properties = [],
  className = "",
  onPropertySelect,
  height = "250px",
  defaultExpanded = false,
  onDrawnAreaChange,
  enableDrawing = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [hasDrawnArea, setHasDrawnArea] = useState(false);
  const drawHandlerRef = useRef<L.Draw.Polygon | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;

    try {
      // Initialize map with Beirut, Lebanon as default center
      const map = L.map(mapRef.current).setView([33.8938, 35.5018], 12);
      
      // Add tile layer with English labels (Esri World Street Map)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }).addTo(map);

      // Initialize feature group for drawn items
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      // Handle draw created event
      map.on(L.Draw.Event.CREATED, (event: any) => {
        const layer = event.layer;
        
        // Clear previous drawings
        drawnItems.clearLayers();
        
        // Add new layer
        drawnItems.addLayer(layer);
        
        // Extract polygon coordinates
        if (layer instanceof L.Polygon) {
          const latLngs = layer.getLatLngs()[0] as L.LatLng[];
          const coordinates: DrawnPolygonCoordinate[] = latLngs.map(latLng => ({
            latitude: latLng.lat,
            longitude: latLng.lng
          }));
          
          setHasDrawnArea(true);
          onDrawnAreaChange?.(coordinates);
        }
        
        setIsDrawingMode(false);
      });

      // Handle draw deleted event
      map.on(L.Draw.Event.DELETED, () => {
        setHasDrawnArea(false);
        onDrawnAreaChange?.(null);
      });

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
        drawnItemsRef.current = null;
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

  const startDrawing = useCallback(() => {
    if (!leafletMapRef.current || !mapInitialized) return;
    
    setIsDrawingMode(true);
    
    // Create polygon draw handler
    const drawHandler = new (L.Draw as any).Polygon(leafletMapRef.current, {
      shapeOptions: {
        color: 'hsl(var(--primary))',
        fillColor: 'hsl(var(--primary))',
        fillOpacity: 0.2,
        weight: 2
      },
      showArea: true,
      metric: true
    });
    
    drawHandlerRef.current = drawHandler;
    drawHandler.enable();
  }, [mapInitialized]);

  const clearDrawnArea = useCallback(() => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    setHasDrawnArea(false);
    setIsDrawingMode(false);
    onDrawnAreaChange?.(null);
    
    // Disable any active draw handler
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
  }, [onDrawnAreaChange]);

  const cancelDrawing = useCallback(() => {
    setIsDrawingMode(false);
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
  }, []);

  const mapHeight = isExpanded ? "60vh" : height;
  const mapClass = isExpanded ? "fixed inset-0 z-40 bg-background p-4" : className;

  return (
    <div className={mapClass}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Map View ({properties.length})
              {hasDrawnArea && (
                <span className="text-xs text-primary font-normal">(Filtered by area)</span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {enableDrawing && (
                <>
                  {isDrawingMode ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelDrawing}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  ) : hasDrawnArea ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearDrawnArea}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear Area
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startDrawing}
                    >
                      <PenTool className="h-4 w-4 mr-1" />
                      Draw Area
                    </Button>
                  )}
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded();
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isDrawingMode && (
            <p className="text-xs text-muted-foreground mt-2">
              Click on the map to draw a polygon around your desired search area. Click the first point to close the shape.
            </p>
          )}
          {isExpanded && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="mt-2"
            >
              Close Map
            </Button>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          {/* Search Controls */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Search district..."
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