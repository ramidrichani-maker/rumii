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
  listing_type: 'rent' | 'sale' | 'both';
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
  /** Pre-fill location from search bar — when set, map pans there and draws a radius circle */
  initialSearchLocation?: string;
  /** Radius in km to draw around the searched location */
  searchRadius?: number;
  /** When true, hides the internal header/controls (parent manages chrome) */
  embedded?: boolean;
}

const CompactPropertyMap: React.FC<CompactPropertyMapProps> = ({
  properties = [],
  className = "",
  onPropertySelect,
  height = "250px",
  defaultExpanded = false,
  onDrawnAreaChange,
  enableDrawing = true,
  initialSearchLocation = '',
  searchRadius = 1,
  embedded = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const searchCircleRef = useRef<L.Circle | null>(null);
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
      
      // Add tile layer with English labels
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Initialize feature group for drawn items
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      // Style the first vertex purple when drawing polygon
      map.on(L.Draw.Event.DRAWVERTEX, (event: any) => {
        const layers = event.layers?.getLayers?.() ?? [];
        if (layers.length >= 1) {
          const firstEl = layers[0]?.getElement?.();
          if (firstEl) {
            firstEl.classList.add('leaflet-draw-vertex-first');
          }
        }
      });

      // Clear partial filter if drawing is stopped/cancelled
      map.on(L.Draw.Event.DRAWSTOP, () => {
        // Only clear if no completed area exists
        if (!drawnItemsRef.current?.getLayers().length) {
          onDrawnAreaChange?.(null);
        }
      });

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
        searchCircleRef.current = null;
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

          // Create rich popup content
          const imageUrl = property.images?.[0] || '/placeholder.svg';
          const priceFormatted = property.listing_type === 'rent' 
            ? `$${property.price.toLocaleString()}/mo` 
            : `$${property.price.toLocaleString()}`;
          const propType = property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1);
          const listingLabel = property.listing_type === 'rent' ? 'For Rent' : property.listing_type === 'both' ? 'Rent & Sale' : 'For Sale';

          const popupContent = document.createElement('div');
          popupContent.innerHTML = `
            <div style="width:260px;font-family:system-ui,sans-serif;">
              <div style="position:relative;width:100%;height:140px;overflow:hidden;border-radius:8px 8px 0 0;">
                <img src="${imageUrl}" alt="${propType}" style="width:100%;height:100%;object-fit:cover;" />
                <span style="position:absolute;top:6px;left:6px;background:hsl(30,20%,45%);color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;">${listingLabel}</span>
              </div>
              <div style="padding:10px;">
                <div style="font-weight:700;font-size:16px;color:#1a1a1a;margin-bottom:2px;">${priceFormatted}</div>
                <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:4px;">${propType} in ${property.city}</div>
                <div style="font-size:11px;color:#666;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${property.address}</div>
                <div style="display:flex;gap:12px;font-size:11px;color:#555;margin-bottom:10px;">
                  <span>🛏 ${property.bedrooms}</span>
                  <span>🛁 ${property.bathrooms}</span>
                  <span>📐 ${property.square_meters}m²</span>
                </div>
                <div style="display:flex;gap:6px;">
                  <button data-action="call" style="flex:1;padding:6px 0;font-size:11px;font-weight:600;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">📞 Call</button>
                  <button data-action="email" style="flex:1;padding:6px 0;font-size:11px;font-weight:600;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">✉️ Email</button>
                  <button data-action="view" style="flex:1;padding:6px 0;font-size:11px;font-weight:600;border:none;border-radius:6px;background:hsl(30,20%,45%);color:white;cursor:pointer;">View</button>
                </div>
              </div>
            </div>
          `;

          // Wire up button actions
          popupContent.querySelector('[data-action="call"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            // Fetch agent phone and call
            import('@/integrations/supabase/client').then(({ supabase }) => {
              supabase
                .from('property_agents')
                .select('agent_id')
                .eq('property_id', property.id)
                .limit(1)
                .single()
                .then(({ data: assignment }) => {
                  if (assignment) {
                    supabase
                      .from('profiles')
                      .select('phone_number')
                      .eq('user_id', assignment.agent_id)
                      .single()
                      .then(({ data: profile }) => {
                        const phone = profile?.phone_number || '+96170612686';
                        window.location.href = `tel:${phone}`;
                      });
                  } else {
                    window.location.href = 'tel:+96170612686';
                  }
                });
            });
          });

          popupContent.querySelector('[data-action="email"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `/property/${property.id}/enquiry`;
          });

          popupContent.querySelector('[data-action="view"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onPropertySelect) {
              onPropertySelect(property);
            }
          });

          marker.bindPopup(popupContent, { maxWidth: 280, minWidth: 260, className: 'property-rich-popup', autoPan: false });
          
          // Open popup on click
          marker.on('click', () => {
            marker.openPopup();
          });

          // Hover logic: show after 1s, close when mouse leaves both pin and popup
          let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
          let closeTimeout: ReturnType<typeof setTimeout> | null = null;
          let isOverPopup = false;

          const clearCloseTimeout = () => {
            if (closeTimeout) { clearTimeout(closeTimeout); closeTimeout = null; }
          };

          const scheduleClose = () => {
            clearCloseTimeout();
            closeTimeout = setTimeout(() => {
              if (!isOverPopup) {
                marker.closePopup();
              }
            }, 100);
          };

          marker.on('mouseover', () => {
            clearCloseTimeout();
            hoverTimeout = setTimeout(() => {
              marker.openPopup();
              // Attach popup hover listeners after opening
              setTimeout(() => {
                const popupEl = marker.getPopup()?.getElement();
                if (popupEl) {
                  popupEl.addEventListener('mouseenter', () => {
                    isOverPopup = true;
                    clearCloseTimeout();
                  });
                  popupEl.addEventListener('mouseleave', () => {
                    isOverPopup = false;
                    scheduleClose();
                  });
                }
              }, 50);
            }, 1000);
          });

          marker.on('mouseout', () => {
            if (hoverTimeout) { clearTimeout(hoverTimeout); hoverTimeout = null; }
            scheduleClose();
          });

          markersRef.current.push(marker);
          bounds.extend([property.latitude, property.longitude]);
        }
      });

      // Fit map to show all properties — but NOT while user is actively drawing
      if (bounds.isValid() && !isDrawingMode && !hasDrawnArea) {
        leafletMapRef.current.fitBounds(bounds, { padding: [10, 10] });
      }

    } catch (error) {
      console.error('Error updating property markers:', error);
    }
  }, [properties, mapInitialized, onPropertySelect, isDrawingMode, hasDrawnArea]);

  // Handle map resize when expanded
  useEffect(() => {
    if (leafletMapRef.current && isExpanded) {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 100);
    }
  }, [isExpanded]);

  // Draw the actual boundary polygon for the searched location
  const searchBoundaryRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapInitialized || !leafletMapRef.current) return;

    // If location is cleared, remove boundary/circle and clear polygon filter
    if (!initialSearchLocation?.trim()) {
      if (searchBoundaryRef.current) {
        searchBoundaryRef.current.remove();
        searchBoundaryRef.current = null;
      }
      if (searchCircleRef.current) {
        searchCircleRef.current.remove();
        searchCircleRef.current = null;
      }
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers();
      }
      setHasDrawnArea(false);
      onDrawnAreaChange?.(null);
      return;
    }

    // Debounce Nominatim requests to avoid rate-limiting
    const timeoutId = setTimeout(() => {
      const drawLocationBoundary = async () => {
        try {
          // Request polygon geometry from Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&polygon_geojson=1&q=${encodeURIComponent(initialSearchLocation + ', Lebanon')}&limit=1`,
            { headers: { 'Accept': 'application/json' } }
          );
          const data = await response.json();
          if (!data || data.length === 0) return;

          const result = data[0];

          // Remove previous boundary & circle
          if (searchBoundaryRef.current) {
            searchBoundaryRef.current.remove();
            searchBoundaryRef.current = null;
          }
          if (searchCircleRef.current) {
            searchCircleRef.current.remove();
            searchCircleRef.current = null;
          }

          // Clear previous drawn items so auto-boundary takes effect
          if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
          }

          const geojson = result.geojson;

          if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon')) {
            // Draw the actual boundary
            const boundaryLayer = L.geoJSON(geojson, {
              style: {
                color: 'hsl(30, 20%, 55%)',
                fillColor: 'hsl(30, 20%, 65%)',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '6 4',
              }
            }).addTo(leafletMapRef.current!);

            searchBoundaryRef.current = boundaryLayer;

            // Extract polygon coordinates for filtering
            const coords: DrawnPolygonCoordinate[] = [];
            if (geojson.type === 'Polygon') {
              geojson.coordinates[0].forEach((c: number[]) => {
                coords.push({ latitude: c[1], longitude: c[0] });
              });
            } else if (geojson.type === 'MultiPolygon') {
              // Use the largest polygon ring
              let largest = geojson.coordinates[0][0];
              for (const poly of geojson.coordinates) {
                if (poly[0].length > largest.length) largest = poly[0];
              }
              largest.forEach((c: number[]) => {
                coords.push({ latitude: c[1], longitude: c[0] });
              });
            }

            if (coords.length >= 3) {
              setHasDrawnArea(true);
              onDrawnAreaChange?.(coords);
            }

            // If radius is set, also draw a dashed circle around the centroid to visualize the extra radius
            if (searchRadius > 0) {
              const bounds = boundaryLayer.getBounds();
              const center = bounds.getCenter();
              // Approximate the polygon's max extent from center + add user radius
              const cornerDist = center.distanceTo(bounds.getNorthEast());
              const totalRadius = cornerDist + searchRadius * 1000;

              const radiusCircle = L.circle([center.lat, center.lng], {
                radius: totalRadius,
                color: 'hsl(30, 20%, 55%)',
                fillColor: 'hsl(30, 20%, 65%)',
                fillOpacity: 0.05,
                weight: 1,
                dashArray: '4 6',
              }).addTo(leafletMapRef.current!);

              searchCircleRef.current = radiusCircle;
              leafletMapRef.current!.fitBounds(radiusCircle.getBounds(), { padding: [10, 10], maxZoom: 16 });
            } else {
              // Fit map to boundary only
              leafletMapRef.current!.fitBounds(boundaryLayer.getBounds(), { padding: [10, 10], maxZoom: 16 });
            }
          } else {
            // Fallback: draw a circle if no polygon geometry available
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            const radiusMeters = searchRadius > 0 ? searchRadius * 1000 : 2000;

            const circle = L.circle([lat, lon], {
              radius: radiusMeters,
              color: 'hsl(30, 20%, 55%)',
              fillColor: 'hsl(30, 20%, 65%)',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '6 4',
            }).addTo(leafletMapRef.current!);

            searchCircleRef.current = circle;
            leafletMapRef.current!.fitBounds(circle.getBounds(), { padding: [5, 5], maxZoom: 16 });
          }
        } catch (err) {
          console.error('Error drawing location boundary:', err);
        }
      };

      drawLocationBoundary();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [mapInitialized, initialSearchLocation, searchRadius]);

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
        `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(searchAddress + ', Lebanon')}&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        leafletMapRef.current.setView([parseFloat(lat), parseFloat(lon)], 15);
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
    
    // Custom vertex icon — small greenish-yellow circle
    const vertexIcon = new L.DivIcon({
      className: 'leaflet-draw-vertex-icon',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    // Create polygon draw handler
    const drawHandler = new (L.Draw as any).Polygon(leafletMapRef.current, {
      shapeOptions: {
        color: 'hsl(var(--primary))',
        fillColor: 'hsl(var(--primary))',
        fillOpacity: 0.2,
        weight: 2
      },
      icon: vertexIcon,
      touchIcon: vertexIcon,
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

  const mapHeight = embedded ? height : (isExpanded ? "60vh" : height);
  const mapClass = embedded ? (className || "h-full") : (isExpanded ? "fixed inset-0 z-40 bg-background p-4" : className);

  if (embedded) {
    return (
      <div className={`${mapClass} flex flex-col relative`} style={{ height }}>
        {/* Draw controls overlay */}
        {enableDrawing && (
          <div className="absolute top-2 right-20 z-[1000] flex gap-1">
            {isDrawingMode ? (
              <button
                onClick={cancelDrawing}
                className="px-3 py-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors text-xs font-medium"
              >
                Cancel Drawing
              </button>
            ) : hasDrawnArea ? (
              <button
                onClick={clearDrawnArea}
                className="px-3 py-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-destructive/10 text-destructive transition-colors text-xs font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear Area
              </button>
            ) : (
              <button
                onClick={startDrawing}
                className="px-3 py-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-accent transition-colors text-xs font-medium flex items-center gap-1"
              >
                <PenTool className="w-3 h-3" />
                Draw Area
              </button>
            )}
          </div>
        )}
        {isDrawingMode && (
          <div className="absolute top-3 left-3 right-3 z-[1000]">
            <p className="text-xs text-foreground bg-background/90 border border-border rounded-md px-3 py-1.5 shadow-sm">
              Click on the map to draw a polygon. Click the first point to close the shape.
            </p>
          </div>
        )}
        <div className="flex-1 relative">
          <div 
            ref={mapRef}
            className="absolute inset-0 rounded-lg"
          />
          <div className="absolute inset-0 rounded-lg ring-[3px] ring-background pointer-events-none z-[500]" />
        </div>
      </div>
    );
  }

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
          <div className="relative" style={{ height: mapHeight }}>
            <div 
              ref={mapRef}
              className="absolute inset-0 rounded-lg"
            />
            <div className="absolute inset-0 rounded-lg ring-[3px] ring-background border border-border pointer-events-none z-[500]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactPropertyMap;