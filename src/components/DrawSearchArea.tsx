import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { useGoogleMaps, MAP_STYLES_NO_POI } from '@/hooks/useGoogleMaps';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface DrawSearchAreaProps {
  onDrawComplete: (polygon: Coordinate[]) => void;
}

const DrawSearchArea = ({ onDrawComplete }: DrawSearchAreaProps) => {
  const { google, loaded } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingPointsRef = useRef<google.maps.LatLngLiteral[]>([]);
  const isDrawingRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(false);

  // Init map
  useEffect(() => {
    if (!loaded || !google || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: 33.8938, lng: 35.5018 },
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false,
      styles: MAP_STYLES_NO_POI,
    });
    return () => {
      polygonRef.current?.setMap(null);
      polylineRef.current?.setMap(null);
      mapInstance.current = null;
    };
  }, [loaded, google]);

  const clearDrawing = useCallback(() => {
    polygonRef.current?.setMap(null);
    polygonRef.current = null;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    drawingPointsRef.current = [];
    setHasPolygon(false);
    setIsDrawing(false);
    isDrawingRef.current = false;
    if (mapInstance.current) {
      mapInstance.current.setOptions({ draggable: true, gestureHandling: 'greedy' });
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const startDrawing = useCallback(() => {
    if (!loaded || !google || !mapInstance.current) return;
    const map = mapInstance.current;

    polygonRef.current?.setMap(null);
    polygonRef.current = null;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    drawingPointsRef.current = [];
    setHasPolygon(false);
    setIsDrawing(true);
    isDrawingRef.current = true;

    map.setOptions({ draggable: false, gestureHandling: 'none' });
    map.getDiv().style.cursor = 'crosshair';

    const addPoint = (latLng: google.maps.LatLng | null) => {
      if (!latLng || !isDrawingRef.current) return;
      drawingPointsRef.current.push({ lat: latLng.lat(), lng: latLng.lng() });
      if (polylineRef.current) polylineRef.current.setMap(null);
      polylineRef.current = new google.maps.Polyline({
        path: drawingPointsRef.current,
        strokeColor: 'hsl(262, 83%, 58%)',
        strokeWeight: 3,
        strokeOpacity: 1,
        map,
      });
    };

    const finishDrawing = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setIsDrawing(false);
      map.setOptions({ draggable: true, gestureHandling: 'greedy' });
      map.getDiv().style.cursor = '';

      polylineRef.current?.setMap(null);
      polylineRef.current = null;

      const points = drawingPointsRef.current;
      if (points.length < 3) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        return;
      }

      const step = Math.max(1, Math.floor(points.length / 50));
      const simplified = points.filter((_, i) => i % step === 0);
      if (simplified.length < 3) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        return;
      }

      polygonRef.current = new google.maps.Polygon({
        paths: simplified,
        strokeColor: 'hsl(262, 83%, 58%)',
        strokeWeight: 2,
        fillColor: 'hsl(262, 83%, 58%)',
        fillOpacity: 0.15,
        map,
      });
      setHasPolygon(true);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };

    const mouseDownListener = map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      if (!isDrawingRef.current) return;
      addPoint(e.latLng);
    });
    const mouseMoveListener = map.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
      if (!isDrawingRef.current) return;
      addPoint(e.latLng);
    });
    const mouseUpListener = map.addListener('mouseup', () => finishDrawing());

    // Touch support
    const container = map.getDiv();
    const containerRect = () => container.getBoundingClientRect();
    const projection = () => map.getProjection();

    const pixelToLatLng = (x: number, y: number): google.maps.LatLng | null => {
      const rect = containerRect();
      const proj = projection();
      if (!proj) return null;
      const bounds = map.getBounds();
      if (!bounds) return null;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const lng = sw.lng() + (ne.lng() - sw.lng()) * ((x - rect.left) / rect.width);
      const lat = ne.lat() - (ne.lat() - sw.lat()) * ((y - rect.top) / rect.height);
      return new google.maps.LatLng(lat, lng);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      addPoint(pixelToLatLng(t.clientX, t.clientY));
    };
    const onTouchEnd = () => finishDrawing();

    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    cleanupRef.current = () => {
      google.maps.event.removeListener(mouseDownListener);
      google.maps.event.removeListener(mouseMoveListener);
      google.maps.event.removeListener(mouseUpListener);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [loaded, google]);

  const confirmArea = useCallback(() => {
    if (!polygonRef.current) return;
    const path = polygonRef.current.getPath();
    const coords: Coordinate[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const ll = path.getAt(i);
      coords.push({ latitude: ll.lat(), longitude: ll.lng() });
    }
    onDrawComplete(coords);
  }, [onDrawComplete]);

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-border bg-card">
      <div className="p-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Draw your search area</p>
        <div className="flex gap-2">
          {hasPolygon && (
            <Button size="sm" variant="ghost" onClick={clearDrawing} className="h-8 px-2">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          {!isDrawing && !hasPolygon && (
            <Button size="sm" variant="outline" onClick={startDrawing} className="h-8" disabled={!loaded}>
              <Pencil className="h-4 w-4 mr-1" />
              Draw
            </Button>
          )}
          {hasPolygon && (
            <Button size="sm" onClick={confirmArea} className="h-8">
              Search area
            </Button>
          )}
        </div>
      </div>

      <div className="relative" style={{ height: '280px' }}>
        <div ref={mapRef} className="absolute inset-0" />
        {!loaded && (
          <div className="absolute inset-0 bg-muted/60 flex items-center justify-center z-[400] pointer-events-none">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isDrawing && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border shadow-sm">
            Press and drag to draw
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawSearchArea;
