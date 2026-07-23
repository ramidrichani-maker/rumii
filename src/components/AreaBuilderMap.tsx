import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Pencil,
  Edit3,
  Save,
  Eye,
  X,
  Trash2,
  Bell,
  Loader2,
  Bed,
  Bath,
  Square,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react';
import { useGoogleMaps, MAP_STYLES_NO_POI } from '@/hooks/useGoogleMaps';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Coordinate { latitude: number; longitude: number; }
interface Property {
  id: string;
  address: string;
  city: string;
  price: number | null;
  rental_price: number | null;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: 'rent' | 'sale' | 'both';
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

interface AreaBuilderMapProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// Simplify a dense polyline down to N vertices roughly evenly spaced
function simplifyToVertices(points: google.maps.LatLngLiteral[], target: number): google.maps.LatLngLiteral[] {
  if (points.length <= target) return points;
  const step = points.length / target;
  const out: google.maps.LatLngLiteral[] = [];
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * step)]);
  return out;
}

function getTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 8;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return text.length * 8;
  context.font = font;
  return context.measureText(text).width;
}

const AreaBuilderMap = ({ open, onClose, onSaved }: AreaBuilderMapProps) => {
  const { google, loaded } = useGoogleMaps();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingPointsRef = useRef<google.maps.LatLngLiteral[]>([]);
  const isDrawingRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [hasPolygon, setHasPolygon] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingProperties, setViewingProperties] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProp, setSelectedProp] = useState<Property | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [savedAreaId, setSavedAreaId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaPage, setAreaPage] = useState<'purchase' | 'rent'>('purchase');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Init map when opened
  useEffect(() => {
    if (!open || !loaded || !google || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: 33.8938, lng: 35.5018 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false,
      styles: MAP_STYLES_NO_POI,
    });
    infoWindowRef.current = new google.maps.InfoWindow();

    // Close property popup when user clicks anywhere on the map
    mapInstance.current.addListener('click', () => {
      setSelectedProp(null);
    });
  }, [open, loaded, google]);


  // Reset when closed
  useEffect(() => {
    if (open) return;
    polygonRef.current?.setMap(null);
    polylineRef.current?.setMap(null);
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polygonRef.current = null;
    polylineRef.current = null;
    mapInstance.current = null;
    drawingPointsRef.current = [];
    isDrawingRef.current = false;
    setHasPolygon(false);
    setIsDrawing(false);
    setIsEditing(false);
    setViewingProperties(false);
    setProperties([]);
    setSelectedProp(null);
    setSavedAreaId(null);
    setAreaName('');
    setAreaPage('purchase');
    setAlertEnabled(true);
  }, [open]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    setSelectedProp(null);
  }, []);

  const getPolygonCoords = useCallback((): Coordinate[] => {
    if (!polygonRef.current) return [];
    const path = polygonRef.current.getPath();
    const out: Coordinate[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const ll = path.getAt(i);
      out.push({ latitude: ll.lat(), longitude: ll.lng() });
    }
    return out;
  }, []);

  const startDrawing = useCallback(() => {
    if (!loaded || !google || !mapInstance.current) return;
    const map = mapInstance.current;

    // Reset existing polygon / markers
    polygonRef.current?.setMap(null); polygonRef.current = null;
    polylineRef.current?.setMap(null); polylineRef.current = null;
    clearMarkers();
    setViewingProperties(false);
    setProperties([]);
    setIsEditing(false);
    setHasPolygon(false);
    drawingPointsRef.current = [];
    setIsDrawing(true);
    isDrawingRef.current = true;

    const container = map.getDiv();
    map.setOptions({ draggable: false, gestureHandling: 'none', disableDoubleClickZoom: true });
    container.style.cursor = 'crosshair';

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
      if (!latLng || !isDrawingRef.current) return;
      drawingPointsRef.current.push({ lat: latLng.lat(), lng: latLng.lng() });
      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          path: drawingPointsRef.current,
          strokeColor: 'hsl(262, 83%, 58%)',
          strokeWeight: 3,
          strokeOpacity: 1,
          map,
          clickable: false,
        });
      } else {
        polylineRef.current.setPath(drawingPointsRef.current);
      }
    };

    const finishDrawing = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setIsDrawing(false);
      map.setOptions({ draggable: true, gestureHandling: 'greedy' });
      container.style.cursor = '';
      polylineRef.current?.setMap(null);
      polylineRef.current = null;

      const pts = drawingPointsRef.current;
      if (pts.length < 3) {
        cleanupRef.current?.(); cleanupRef.current = null;
        return;
      }
      // Simplify to ~6 vertices as requested
      const simplified = simplifyToVertices(pts, 6);
      polygonRef.current = new google.maps.Polygon({
        paths: simplified,
        strokeColor: 'hsl(262, 83%, 58%)',
        strokeWeight: 2,
        fillColor: 'hsl(262, 83%, 58%)',
        fillOpacity: 0.15,
        editable: false,
        map,
      });
      setHasPolygon(true);
      cleanupRef.current?.(); cleanupRef.current = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault(); e.stopPropagation();
      try { container.setPointerCapture?.(e.pointerId); } catch {}
      addPoint(pixelToLatLng(e.clientX, e.clientY));
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (drawingPointsRef.current.length === 0) return;
      e.preventDefault();
      addPoint(pixelToLatLng(e.clientX, e.clientY));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      try { container.releasePointerCapture?.(e.pointerId); } catch {}
      finishDrawing();
    };

    container.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    cleanupRef.current = () => {
      container.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      container.style.cursor = '';
    };
  }, [loaded, google, clearMarkers]);

  const toggleEdit = useCallback(() => {
    if (!polygonRef.current) return;
    polygonRef.current.setEditable(true);
    polygonRef.current.setDraggable(false);
    setIsEditing(true);
  }, []);

  const loadProperties = useCallback(async () => {
    if (!polygonRef.current || !google) return;
    const coords = getPolygonCoords();
    // Fetch all approved with coords, filter client-side by polygon
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'approved')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    if (error) {
      toast({ title: 'Failed to load properties', description: error.message, variant: 'destructive' });
      return;
    }
    // Ray-casting filter
    const inside = (lat: number, lng: number) => {
      let ins = false;
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i].longitude, yi = coords[i].latitude;
        const xj = coords[j].longitude, yj = coords[j].latitude;
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) ins = !ins;
      }
      return ins;
    };
    const filtered = ((data as any[]) || []).filter(p => inside(p.latitude, p.longitude)) as Property[];
    setProperties(filtered);

    // Add markers
    clearMarkers();
    if (!mapInstance.current) return;
    filtered.forEach(p => {
      if (p.latitude == null || p.longitude == null) return;
      const priceValue = areaPage === 'rent'
        ? (p.rental_price ?? p.price)
        : (p.price ?? p.rental_price);
      const priceLabel = priceValue
        ? (areaPage === 'rent' || p.listing_type === 'rent'
            ? `$${Number(priceValue).toLocaleString()}/mo`
            : `$${Number(priceValue).toLocaleString()}`)
        : 'N/A';
      const tagWidth = Math.max(60, getTextWidth(priceLabel, '700 12px system-ui, sans-serif') + 16);
      const tagHeight = 34;
      const half = Math.round(tagWidth / 2);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tagWidth}" height="${tagHeight}" viewBox="0 0 ${tagWidth} ${tagHeight}" shape-rendering="crispEdges">
        <rect x="1" y="1" width="${tagWidth - 2}" height="${tagHeight - 7}" fill="white" stroke="hsl(262,83%,58%)" stroke-width="1.5" rx="0" ry="0"/>
        <polygon points="${half - 6},${tagHeight - 7} ${half + 6},${tagHeight - 7} ${half},${tagHeight - 1}" fill="white" stroke="hsl(262,83%,58%)" stroke-width="1.5" stroke-linejoin="miter"/>
        <polygon points="${half - 5},${tagHeight - 7} ${half + 5},${tagHeight - 7} ${half},${tagHeight - 2}" fill="white" stroke="none"/>
        <text x="${half}" y="18" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#1a1a1a">${priceLabel}</text>
      </svg>`;
      const marker = new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map: mapInstance.current!,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(tagWidth, tagHeight),
          anchor: new google.maps.Point(half, tagHeight - 1),
        },
      });
      marker.addListener('click', () => {
        setSelectedProp(p);
        setImageIdx(0);
      });
      markersRef.current.push(marker);
    });
    setViewingProperties(true);

    // Zoom/fit map to the drawn polygon so the search area is clearly visible
    const bounds = new google.maps.LatLngBounds();
    coords.forEach(c => bounds.extend({ lat: c.latitude, lng: c.longitude }));
    mapInstance.current.fitBounds(bounds, 40);
  }, [google, getPolygonCoords, toast, clearMarkers, areaPage]);

  const commitPolygonEdits = useCallback(() => {
    if (!polygonRef.current) return;
    polygonRef.current.setEditable(false);
    setIsEditing(false);
  }, []);

  const openSave = useCallback(() => {
    if (!polygonRef.current) return;
    if (isEditing) commitPolygonEdits();
    setSaveOpen(true);
  }, [isEditing, commitPolygonEdits]);

  const doSave = useCallback(async () => {
    if (!polygonRef.current || !user) return;
    if (!areaName.trim()) {
      toast({ title: 'Give the area a name', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const coords = getPolygonCoords();
    if (savedAreaId) {
      const { error } = await supabase
        .from('saved_search_areas' as any)
        .update({
          name: areaName.trim(),
          coordinates: coords as any,
          page: areaPage,
          alert_enabled: alertEnabled,
        })
        .eq('id', savedAreaId);
      setSaving(false);
      if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Area updated' });
    } else {
      const { data, error } = await supabase
        .from('saved_search_areas' as any)
        .insert({
          user_id: user.id,
          name: areaName.trim(),
          coordinates: coords as any,
          page: areaPage,
          alert_enabled: alertEnabled,
        })
        .select()
        .single();
      setSaving(false);
      if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
      setSavedAreaId((data as any)?.id ?? null);
      toast({ title: 'Area saved' });
    }
    setSaveOpen(false);
    onSaved?.();
  }, [user, areaName, areaPage, alertEnabled, getPolygonCoords, savedAreaId, toast, onSaved]);

  const clearArea = useCallback(() => {
    polygonRef.current?.setMap(null); polygonRef.current = null;
    clearMarkers();
    setHasPolygon(false);
    setViewingProperties(false);
    setIsEditing(false);
    setProperties([]);
  }, [clearMarkers]);

  const viewPropertiesPage = useCallback(() => {
    if (!polygonRef.current) return;
    if (isEditing) commitPolygonEdits();
    const coords = getPolygonCoords();
    if (coords.length < 3) return;
    const encoded = encodeURIComponent(JSON.stringify(coords));
    const path = areaPage === 'rent' ? '/rent' : '/purchase';
    onClose();
    navigate(`${path}?polygon=${encoded}`);
  }, [isEditing, commitPolygonEdits, getPolygonCoords, areaPage, navigate, onClose]);

  const createAlert = useCallback(async () => {
    if (!savedAreaId) {
      // Prompt user to save first
      setAlertOpen(true);
      return;
    }
    const { error } = await supabase
      .from('saved_search_areas' as any)
      .update({ alert_enabled: true })
      .eq('id', savedAreaId);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setAlertEnabled(true);
    toast({ title: 'Alert created', description: "We'll email you when new listings match this area." });
  }, [savedAreaId, toast]);

  const formatPrice = (p: Property) => {
    if (p.listing_type === 'rent' && p.rental_price) return `$${p.rental_price.toLocaleString()}/mo`;
    if (p.price) return `$${p.price.toLocaleString()}`;
    return 'Price on request';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background">
      <div ref={mapRef} className="absolute inset-0" style={{ touchAction: isDrawing ? 'none' : 'auto' }} />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Exit map */}
      <Button
        onClick={onClose}
        variant="secondary"
        className="absolute top-4 left-4 z-10 shadow-md"
      >
        <X className="h-4 w-4 mr-1" /> Exit map
      </Button>

      {viewingProperties && (
        <Button
          onClick={viewPropertiesPage}
          variant="secondary"
          className="absolute top-16 left-4 z-10 shadow-md"
        >
          <List className="h-4 w-4 mr-1" /> List view
        </Button>
      )}

      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm text-foreground text-sm font-medium px-4 py-2 rounded-full border border-border shadow-sm">
          Press and drag to draw
        </div>
      )}

      {/* Main action buttons */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-wrap justify-center gap-2 px-4">
        {isEditing ? (
          <Button onClick={commitPolygonEdits} variant="secondary" className="shadow-lg">
            <Save className="h-4 w-4 mr-1" /> Done editing
          </Button>
        ) : (
          <>
            <Button onClick={startDrawing} disabled={!loaded || isDrawing} className="shadow-lg">
              <Pencil className="h-4 w-4 mr-1" />
              {hasPolygon ? 'Draw again' : 'Draw area'}
            </Button>
            <Button onClick={toggleEdit} disabled={!hasPolygon} variant="secondary" className="shadow-lg">
              <Edit3 className="h-4 w-4 mr-1" /> Edit area
            </Button>
            <Button onClick={openSave} disabled={!hasPolygon} variant="secondary" className="shadow-lg">
              <Save className="h-4 w-4 mr-1" /> Save area
            </Button>
            <Button onClick={loadProperties} disabled={!hasPolygon} variant="secondary" className="shadow-lg">
              <Eye className="h-4 w-4 mr-1" /> View properties
            </Button>
          </>
        )}
        {viewingProperties && (
          <>
            <Button onClick={clearArea} variant="destructive" className="shadow-lg">
              <Trash2 className="h-4 w-4 mr-1" /> Clear area
            </Button>
            <Button onClick={createAlert} className="shadow-lg">
              <Bell className="h-4 w-4 mr-1" /> Create alert
            </Button>
          </>
        )}
      </div>

      {viewingProperties && (
        <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur px-3 py-1.5 rounded-full border border-border shadow-sm text-sm font-medium">
          {properties.length} propert{properties.length === 1 ? 'y' : 'ies'}
        </div>
      )}

      {/* Property popup card */}
      {selectedProp && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-[92vw] max-w-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="relative">
              <div
                className="cursor-pointer"
                onClick={() => { navigate(`/property/${selectedProp.id}`); onClose(); }}
              >
                <img
                  src={selectedProp.images?.[imageIdx] || '/placeholder.svg'}
                  alt={selectedProp.address}
                  className="w-full h-40 object-cover"
                />
              </div>
              {selectedProp.images && selectedProp.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageIdx(i => (i - 1 + selectedProp.images!.length) % selectedProp.images!.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageIdx(i => (i + 1) % selectedProp.images!.length); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedProp(null)}
                className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="p-3 cursor-pointer"
              onClick={() => { navigate(`/property/${selectedProp.id}`); onClose(); }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{selectedProp.city}</p>
                  <p className="font-semibold text-sm truncate">{selectedProp.address}</p>
                </div>
                <p className="font-bold text-sm text-primary shrink-0">{formatPrice(selectedProp)}</p>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{selectedProp.bedrooms}</span>
                <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{selectedProp.bathrooms}</span>
                <span className="flex items-center gap-1"><Square className="h-3 w-3" />{selectedProp.square_meters}m²</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this area</DialogTitle>
            <DialogDescription>Name your area and choose whether it's for buying or renting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="area-name">Area name</Label>
              <Input id="area-name" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="e.g. Central Beirut" />
            </div>
            <div>
              <Label>Search type</Label>
              <RadioGroup value={areaPage} onValueChange={(v) => setAreaPage(v as any)} className="mt-2">
                <div className="flex items-center gap-2"><RadioGroupItem value="purchase" id="ap" /><Label htmlFor="ap">For sale</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="rent" id="ar" /><Label htmlFor="ar">For rent</Label></div>
              </RadioGroup>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="alert-toggle">Email alerts</Label>
                <p className="text-xs text-muted-foreground">Notify me when new listings appear in this area.</p>
              </div>
              <Switch id="alert-toggle" checked={alertEnabled} onCheckedChange={setAlertEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={doSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert requires saving dialog */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save area to enable alerts</DialogTitle>
            <DialogDescription>
              Alerts only work on saved areas. Save this area first, then we'll notify you when new listings match.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAlertOpen(false); setAlertEnabled(true); setSaveOpen(true); }}>
              Save area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AreaBuilderMap;