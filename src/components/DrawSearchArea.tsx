import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface DrawSearchAreaProps {
  onDrawComplete: (polygon: Coordinate[]) => void;
}

const DrawSearchArea = ({ onDrawComplete }: DrawSearchAreaProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawingPointsRef = useRef<L.LatLng[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [33.8938, 35.5018],
      zoom: 10,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    tileLayer.on('loading', () => setTilesLoading(true));
    tileLayer.on('load', () => setTilesLoading(false));

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  const startDrawing = useCallback(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Clear previous
    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    drawingPointsRef.current = [];
    setHasPolygon(false);
    setIsDrawing(true);
    isDrawingRef.current = true;
    map.dragging.disable();
    map.getContainer().style.cursor = 'crosshair';

    const addPoint = (latlng: L.LatLng) => {
      if (!isDrawingRef.current) return;
      drawingPointsRef.current.push(latlng);

      if (polylineRef.current) polylineRef.current.remove();
      polylineRef.current = L.polyline(drawingPointsRef.current, {
        color: 'hsl(262, 83%, 58%)',
        weight: 3,
        dashArray: '6, 8',
      }).addTo(map);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (isDrawingRef.current) addPoint(e.latlng);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const point = map.containerPointToLatLng(L.point(
        touch.clientX - map.getContainer().getBoundingClientRect().left,
        touch.clientY - map.getContainer().getBoundingClientRect().top
      ));
      addPoint(point);
    };

    const finishDrawing = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setIsDrawing(false);
      map.dragging.enable();
      map.getContainer().style.cursor = '';
      map.off('mousemove', onMouseMove);
      map.getContainer().removeEventListener('touchmove', onTouchMove);
      map.off('mouseup');
      map.getContainer().removeEventListener('touchend', finishDrawing);

      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      const points = drawingPointsRef.current;
      if (points.length < 3) return;

      // Simplify: take every Nth point to reduce noise
      const step = Math.max(1, Math.floor(points.length / 50));
      const simplified = points.filter((_, i) => i % step === 0);
      if (simplified.length < 3) return;

      polygonLayerRef.current = L.polygon(simplified, {
        color: 'hsl(262, 83%, 58%)',
        fillColor: 'hsl(262, 83%, 58%)',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      setHasPolygon(true);
    };

    map.on('mousedown', () => {
      map.on('mousemove', onMouseMove);
    });
    map.on('mouseup', finishDrawing);

    map.getContainer().addEventListener('touchstart', () => {
      map.getContainer().addEventListener('touchmove', onTouchMove, { passive: false });
    }, { once: false });
    map.getContainer().addEventListener('touchend', finishDrawing);
  }, []);

  const clearDrawing = useCallback(() => {
    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    drawingPointsRef.current = [];
    setHasPolygon(false);
    setIsDrawing(false);
    isDrawingRef.current = false;
    const map = leafletMapRef.current;
    if (map) {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    }
  }, []);

  const confirmArea = useCallback(() => {
    if (!polygonLayerRef.current) return;
    const latlngs = polygonLayerRef.current.getLatLngs()[0] as L.LatLng[];
    const coords: Coordinate[] = latlngs.map(ll => ({
      latitude: ll.lat,
      longitude: ll.lng,
    }));
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
            <Button size="sm" variant="outline" onClick={startDrawing} className="h-8">
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
        {tilesLoading && (
          <div className="absolute inset-0 bg-muted/60 flex items-center justify-center z-[400] pointer-events-none">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isDrawing && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border shadow-sm">
            Draw on the map with your finger
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawSearchArea;
