import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Locate, Search, Maximize2, PenTool, Trash2, Save } from 'lucide-react';
import { getCityCenter } from '@/utils/cityCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGoogleMaps, MAP_STYLES_NO_POI } from '@/hooks/useGoogleMaps';

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
  initialSearchLocation?: string;
  searchRadius?: number;
  embedded?: boolean;
  onSaveArea?: (coordinates: DrawnPolygonCoordinate[]) => void;
  initialPolygon?: DrawnPolygonCoordinate[] | null;
}

const PROPERTY_ICON_URL =
  'data:image/svg+xml;base64,' +
  btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `);

const CompactPropertyMap: React.FC<CompactPropertyMapProps> = ({
  properties = [],
  className = '',
  onPropertySelect,
  height = '250px',
  defaultExpanded = false,
  onDrawnAreaChange,
  enableDrawing = true,
  initialSearchLocation = '',
  searchRadius = 1,
  embedded = false,
  onSaveArea,
  initialPolygon = null,
}) => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = profile?.role === 'admin';
  const { google, loaded } = useGoogleMaps();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const drawnPolygonRef = useRef<google.maps.Polygon | null>(null);
  const searchBoundaryRef = useRef<google.maps.Polygon | null>(null);
  const searchCircleRef = useRef<google.maps.Circle | null>(null);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [hasDrawnArea, setHasDrawnArea] = useState(false);

  const drawingPointsRef = useRef<google.maps.LatLngLiteral[]>([]);
  const drawingPolylineRef = useRef<google.maps.Polyline | null>(null);
  const drawCleanupRef = useRef<(() => void) | null>(null);

  // Initialize map
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: 33.8938, lng: 35.5018 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      styles: MAP_STYLES_NO_POI,
    });
    infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 280 });
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      drawnPolygonRef.current?.setMap(null);
      searchBoundaryRef.current?.setMap(null);
      searchCircleRef.current?.setMap(null);
      drawingPolylineRef.current?.setMap(null);
      mapInstance.current = null;
    };
  }, [loaded, google]);

  // Render initial polygon
  useEffect(() => {
    if (!loaded || !google || !mapInstance.current) return;
    if (!initialPolygon || initialPolygon.length < 3) return;

    drawnPolygonRef.current?.setMap(null);
    const path = initialPolygon.map((c) => ({ lat: c.latitude, lng: c.longitude }));
    drawnPolygonRef.current = new google.maps.Polygon({
      paths: path,
      strokeColor: 'hsl(262, 83%, 58%)',
      strokeWeight: 2,
      fillColor: 'hsl(262, 83%, 58%)',
      fillOpacity: 0.15,
      map: mapInstance.current,
    });
    setHasDrawnArea(true);
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    mapInstance.current.fitBounds(bounds, 30);
    onDrawnAreaChange?.(initialPolygon);
  }, [loaded, google, initialPolygon, onDrawnAreaChange]);

  // Markers
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
            const c = await getCityCenter(city);
            if (c) cityCenters[city] = c;
          })
        );
      }
      if (cancelled) return;

      const bounds = new google.maps.LatLngBounds();

      properties.forEach((property) => {
        let pos: google.maps.LatLngLiteral;
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
            url: PROPERTY_ICON_URL,
            scaledSize: new google.maps.Size(20, 20),
            anchor: new google.maps.Point(10, 20),
          },
        });

        const images = property.images?.length ? property.images : ['/placeholder.svg'];
        const priceFormatted =
          property.listing_type === 'rent'
            ? `$${property.price.toLocaleString()}/mo`
            : `$${property.price.toLocaleString()}`;
        const propType =
          property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1);
        const listingLabel =
          property.listing_type === 'rent'
            ? 'For Rent'
            : property.listing_type === 'both'
              ? 'Rent & Sale'
              : 'For Sale';

        const html = `
          <div data-action="navigate" data-property-id="${property.id}" style="width:260px;font-family:system-ui,sans-serif;cursor:pointer;">
            <div style="position:relative;width:100%;height:140px;overflow:hidden;border-radius:8px 8px 0 0;">
              <img style="width:100%;height:100%;object-fit:cover;" src="${images[0]}" alt="${propType}" />
              <span style="position:absolute;top:6px;left:6px;background:hsl(30,20%,45%);color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;">${listingLabel}</span>
            </div>
            <div style="padding:10px;">
              <div style="font-weight:700;font-size:16px;color:#1a1a1a;margin-bottom:2px;">${priceFormatted}</div>
              <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:4px;">${propType} in ${property.city}</div>
              <div style="font-size:11px;color:#666;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${property.address}</div>
              <div style="display:flex;gap:12px;font-size:11px;color:#555;">
                <span>🛏 ${property.bedrooms}</span>
                <span>🛁 ${property.bathrooms}</span>
                <span>📐 ${property.square_meters}m²</span>
              </div>
            </div>
          </div>
        `;

        const openInfo = () => {
          if (!infoWindowRef.current || !mapInstance.current) return;
          infoWindowRef.current.setContent(html);
          infoWindowRef.current.open({ map: mapInstance.current, anchor: marker });
          google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
            const el = document.querySelector(`[data-property-id="${property.id}"]`);
            el?.addEventListener('click', () => {
              window.location.href = `/property/${property.id}`;
            });
          });
        };
        marker.addListener('mouseover', openInfo);
        marker.addListener('click', () => {
          openInfo();
          if (onPropertySelect) onPropertySelect(property);
        });

        markersRef.current.push(marker);
        bounds.extend(pos);
      });

      if (!bounds.isEmpty() && mapInstance.current && !isDrawingMode && !hasDrawnArea) {
        mapInstance.current.fitBounds(bounds, 20);
      }
    };

    addMarkers();
    return () => {
      cancelled = true;
    };
  }, [properties, loaded, google, isAdmin, onPropertySelect, isDrawingMode, hasDrawnArea]);

  // Resize on expand
  useEffect(() => {
    if (!google || !mapInstance.current) return;
    setTimeout(() => {
      google.maps.event.trigger(mapInstance.current!, 'resize');
    }, 100);
    setTimeout(() => {
      google.maps.event.trigger(mapInstance.current!, 'resize');
    }, 300);
  }, [isExpanded, google]);

  // Search location boundary using Nominatim (kept for polygon geometry — Google Geocoder does not return boundaries)
  useEffect(() => {
    if (!loaded || !google || !mapInstance.current) return;

    if (!initialSearchLocation?.trim()) {
      searchBoundaryRef.current?.setMap(null);
      searchBoundaryRef.current = null;
      searchCircleRef.current?.setMap(null);
      searchCircleRef.current = null;
      if (!initialPolygon || initialPolygon.length < 3) {
        drawnPolygonRef.current?.setMap(null);
        drawnPolygonRef.current = null;
        setHasDrawnArea(false);
        onDrawnAreaChange?.(null);
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&polygon_geojson=1&q=${encodeURIComponent(
            initialSearchLocation + ', Lebanon'
          )}&limit=1`,
          { headers: { Accept: 'application/json' } }
        );
        const data = await res.json();
        if (!data || data.length === 0) return;
        const result = data[0];

        searchBoundaryRef.current?.setMap(null);
        searchBoundaryRef.current = null;
        searchCircleRef.current?.setMap(null);
        searchCircleRef.current = null;
        drawnPolygonRef.current?.setMap(null);
        drawnPolygonRef.current = null;

        const geojson = result.geojson;
        const map = mapInstance.current!;

        let coords: DrawnPolygonCoordinate[] = [];
        let polygonPath: google.maps.LatLngLiteral[] = [];

        if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon')) {
          let ring: number[][] = [];
          if (geojson.type === 'Polygon') {
            ring = geojson.coordinates[0];
          } else {
            let largest = geojson.coordinates[0][0];
            for (const poly of geojson.coordinates) {
              if (poly[0].length > largest.length) largest = poly[0];
            }
            ring = largest;
          }
          polygonPath = ring.map((c) => ({ lat: c[1], lng: c[0] }));
          coords = ring.map((c) => ({ latitude: c[1], longitude: c[0] }));

          searchBoundaryRef.current = new google.maps.Polygon({
            paths: polygonPath,
            strokeColor: 'hsl(30, 20%, 55%)',
            strokeWeight: 2,
            fillColor: 'hsl(30, 20%, 65%)',
            fillOpacity: 0.15,
            map,
          });

          if (coords.length >= 3) {
            setHasDrawnArea(true);
            onDrawnAreaChange?.(coords);
          }

          const bounds = new google.maps.LatLngBounds();
          polygonPath.forEach((p) => bounds.extend(p));

          if (searchRadius > 0) {
            const center = bounds.getCenter();
            const cornerDist = google.maps.geometry.spherical.computeDistanceBetween(
              center,
              bounds.getNorthEast()
            );
            const totalRadius = cornerDist + searchRadius * 1000;
            searchCircleRef.current = new google.maps.Circle({
              center,
              radius: totalRadius,
              strokeColor: 'hsl(30, 20%, 55%)',
              strokeWeight: 1,
              fillColor: 'hsl(30, 20%, 65%)',
              fillOpacity: 0.05,
              map,
            });
            map.fitBounds(searchCircleRef.current.getBounds()!, 10);
          } else {
            map.fitBounds(bounds, 10);
          }
        } else {
          // Fallback: circle
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          const radiusMeters = searchRadius > 0 ? searchRadius * 1000 : 2000;
          searchCircleRef.current = new google.maps.Circle({
            center: { lat, lng: lon },
            radius: radiusMeters,
            strokeColor: 'hsl(30, 20%, 55%)',
            strokeWeight: 2,
            fillColor: 'hsl(30, 20%, 65%)',
            fillOpacity: 0.15,
            map,
          });
          map.fitBounds(searchCircleRef.current.getBounds()!, 5);
        }
      } catch (err) {
        console.error('Error drawing location boundary:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [loaded, google, initialSearchLocation, searchRadius, initialPolygon, onDrawnAreaChange]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation || !mapInstance.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapInstance.current?.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapInstance.current?.setZoom(13);
      },
      (err) => console.error('Geolocation error:', err)
    );
  };

  const searchLocation = async () => {
    if (!searchAddress.trim() || !google || !mapInstance.current) return;
    setIsSearching(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const r = await geocoder.geocode({ address: searchAddress + ', Lebanon' });
      if (r.results.length > 0) {
        const loc = r.results[0].geometry.location;
        mapInstance.current.setCenter({ lat: loc.lat(), lng: loc.lng() });
        mapInstance.current.setZoom(15);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Drawing
  const finalizeDrawing = useCallback(() => {
    if (!google || !mapInstance.current) return;
    const map = mapInstance.current;
    map.setOptions({ draggable: true, gestureHandling: 'auto' });
    map.getDiv().style.cursor = '';

    drawingPolylineRef.current?.setMap(null);
    drawingPolylineRef.current = null;

    const points = drawingPointsRef.current;
    setIsDrawingMode(false);

    if (points.length < 3) {
      drawingPointsRef.current = [];
      drawCleanupRef.current?.();
      drawCleanupRef.current = null;
      return;
    }

    const step = Math.max(1, Math.floor(points.length / 50));
    const simplified = points.filter((_, i) => i % step === 0);
    if (simplified.length < 3) {
      drawingPointsRef.current = [];
      drawCleanupRef.current?.();
      drawCleanupRef.current = null;
      return;
    }

    drawnPolygonRef.current?.setMap(null);
    drawnPolygonRef.current = new google.maps.Polygon({
      paths: simplified,
      strokeColor: 'hsl(262, 83%, 58%)',
      strokeWeight: 2,
      fillColor: 'hsl(262, 83%, 58%)',
      fillOpacity: 0.2,
      map,
    });

    const coords: DrawnPolygonCoordinate[] = simplified.map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
    drawingPointsRef.current = [];
    setHasDrawnArea(true);
    onDrawnAreaChange?.(coords);
    drawCleanupRef.current?.();
    drawCleanupRef.current = null;
  }, [google, onDrawnAreaChange]);

  const startDrawing = useCallback(() => {
    if (!loaded || !google || !mapInstance.current) return;
    const map = mapInstance.current;
    setIsDrawingMode(true);

    drawnPolygonRef.current?.setMap(null);
    drawnPolygonRef.current = null;
    drawingPointsRef.current = [];

    map.setOptions({ draggable: false, gestureHandling: 'none', disableDoubleClickZoom: true });
    const container = map.getDiv();
    container.style.cursor = 'crosshair';

    // Convert pixel (relative to container) to LatLng using the map's projection.
    const pixelToLatLng = (clientX: number, clientY: number): google.maps.LatLng | null => {
      const rect = container.getBoundingClientRect();
      const bounds = map.getBounds();
      if (!bounds) return null;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const lng = sw.lng() + (ne.lng() - sw.lng()) * (x / rect.width);
      const lat = ne.lat() - (ne.lat() - sw.lat()) * (y / rect.height);
      return new google.maps.LatLng(lat, lng);
    };

    const addPoint = (latLng: google.maps.LatLng | null) => {
      if (!latLng) return;
      drawingPointsRef.current.push({ lat: latLng.lat(), lng: latLng.lng() });
      if (!drawingPolylineRef.current) {
        drawingPolylineRef.current = new google.maps.Polyline({
          path: drawingPointsRef.current,
          strokeColor: 'hsl(262, 83%, 58%)',
          strokeWeight: 3,
          strokeOpacity: 1,
          map,
          clickable: false,
        });
      } else {
        drawingPolylineRef.current.setPath(drawingPointsRef.current);
      }
    };

    let active = false;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      active = true;
      try {
        (e.target as Element)?.setPointerCapture?.(e.pointerId);
      } catch {}
      addPoint(pixelToLatLng(e.clientX, e.clientY));
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!active) return;
      e.preventDefault();
      addPoint(pixelToLatLng(e.clientX, e.clientY));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      e.preventDefault();
      finalizeDrawing();
    };

    // Use capture phase to intercept before Google Maps' own listeners.
    container.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);

    drawCleanupRef.current = () => {
      container.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      container.style.cursor = '';
    };
  }, [loaded, google, finalizeDrawing]);

  const clearDrawnArea = useCallback(() => {
    drawnPolygonRef.current?.setMap(null);
    drawnPolygonRef.current = null;
    drawingPolylineRef.current?.setMap(null);
    drawingPolylineRef.current = null;
    drawingPointsRef.current = [];
    setHasDrawnArea(false);
    setIsDrawingMode(false);
    if (mapInstance.current) {
      mapInstance.current.setOptions({ draggable: true, gestureHandling: 'auto' });
      mapInstance.current.getDiv().style.cursor = '';
    }
    drawCleanupRef.current?.();
    drawCleanupRef.current = null;
    onDrawnAreaChange?.(null);
  }, [onDrawnAreaChange]);

  const cancelDrawing = useCallback(() => {
    setIsDrawingMode(false);
    drawingPolylineRef.current?.setMap(null);
    drawingPolylineRef.current = null;
    drawingPointsRef.current = [];
    if (mapInstance.current) {
      mapInstance.current.setOptions({ draggable: true, gestureHandling: 'auto' });
      mapInstance.current.getDiv().style.cursor = '';
    }
    drawCleanupRef.current?.();
    drawCleanupRef.current = null;
  }, []);

  const handleSaveArea = () => {
    if (!drawnPolygonRef.current || !onSaveArea) return;
    const path = drawnPolygonRef.current.getPath();
    const coords: DrawnPolygonCoordinate[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const ll = path.getAt(i);
      coords.push({ latitude: ll.lat(), longitude: ll.lng() });
    }
    onSaveArea(coords);
  };

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const mapHeight = embedded ? height : isExpanded ? 'calc(100vh - 220px)' : height;
  const mapClass = embedded
    ? className || 'h-full'
    : isExpanded
      ? 'fixed inset-0 z-40 bg-background/95 backdrop-blur-sm p-4 animate-fade-in'
      : `${className} animate-fade-in`;

  if (embedded) {
    return (
      <div className={`${mapClass} flex flex-col relative`} style={{ height }}>
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
              <div className="flex gap-1">
                {onSaveArea && (
                  <button
                    onClick={handleSaveArea}
                    className="px-3 py-1.5 rounded-md bg-primary/90 text-primary-foreground shadow-sm hover:bg-primary transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Save Area
                  </button>
                )}
                <button
                  onClick={clearDrawnArea}
                  className="px-3 py-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-destructive/10 text-destructive transition-colors text-xs font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Area
                </button>
              </div>
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
              {isMobile
                ? 'Draw on the map with your finger'
                : 'Press and drag on the map to draw your search area.'}
            </p>
          </div>
        )}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0 rounded-lg" />
          {!loaded && (
            <div className="absolute inset-0 rounded-lg bg-muted/60 flex items-center justify-center z-[400] pointer-events-none">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
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
                    <Button size="sm" variant="outline" onClick={cancelDrawing} className="text-xs">
                      Cancel
                    </Button>
                  ) : hasDrawnArea ? (
                    <div className="flex gap-1">
                      {onSaveArea && (
                        <Button size="sm" variant="default" onClick={handleSaveArea}>
                          <Save className="h-4 w-4 mr-1" />
                          Save Area
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearDrawnArea}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear Area
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={startDrawing}>
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
              {isMobile
                ? 'Draw on the map with your finger'
                : 'Press and drag on the map to draw your search area.'}
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
            <Button onClick={getCurrentLocation} size="sm" variant="outline" className="h-8">
              <Locate className="h-3 w-3" />
            </Button>
          </div>

          <div className="relative" style={{ height: mapHeight }}>
            <div ref={mapRef} className="absolute inset-0 rounded-lg" />
            {!loaded && (
              <div className="absolute inset-0 rounded-lg bg-muted/60 flex items-center justify-center z-[400] pointer-events-none">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 rounded-lg ring-[3px] ring-background border border-border pointer-events-none z-[500]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactPropertyMap;
