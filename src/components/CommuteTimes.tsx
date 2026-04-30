import { useEffect, useRef, useState } from "react";
import { Car, PersonStanding, Bike, Plus, X, Loader2, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface CommuteTimesProps {
  originLat: number;
  originLng: number;
  /** Optional bias for geocoder (e.g. property city) */
  city?: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface Destination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  driving?: number | null; // seconds
  walking?: number | null;
  cycling?: number | null;
  loading?: boolean;
  error?: string;
}

const STORAGE_KEY = "oracle:commute-destinations";

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} h` : `${hrs} h ${rem} min`;
};

const fetchRoute = async (
  profile: "driving" | "walking" | "cycling",
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<number | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) return null;
    return data.routes[0].duration as number;
  } catch {
    return null;
  }
};

export default function CommuteTimes({ originLat, originLng, city }: CommuteTimesProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Restore saved destinations for this property origin
  const storageKey = `${STORAGE_KEY}:${originLat.toFixed(4)}:${originLng.toFixed(4)}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: Destination[] = JSON.parse(raw);
        if (Array.isArray(saved)) {
          setDestinations(saved.map(d => ({ ...d, loading: false })));
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (dests: Destination[]) => {
    try {
      const slim = dests.map(({ id, name, lat, lng, driving, walking, cycling }) => ({
        id, name, lat, lng, driving, walking, cycling,
      }));
      localStorage.setItem(storageKey, JSON.stringify(slim));
    } catch {
      // ignore
    }
  };

  // Debounced geocoder using Nominatim (free, no key)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const q = city ? `${query}, ${city}` : query;
        // Restrict geocoding to Lebanon (not surfaced in UI).
        // Lebanon bounding box: west, north, east, south
        const viewbox = "35.10,34.70,36.65,33.05";
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&countrycodes=lb&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": navigator.language || "en" },
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data: Suggestion[] = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, city]);

  const computeForDestination = async (dest: Destination): Promise<Destination> => {
    const origin = { lat: originLat, lng: originLng };
    const target = { lat: dest.lat, lng: dest.lng };
    const [driving, walking, cycling] = await Promise.all([
      fetchRoute("driving", origin, target),
      fetchRoute("walking", origin, target),
      fetchRoute("cycling", origin, target),
    ]);
    return { ...dest, driving, walking, cycling, loading: false };
  };

  const addDestination = async (s: Suggestion) => {
    const newDest: Destination = {
      id: `${s.place_id}-${Date.now()}`,
      name: s.display_name.split(",").slice(0, 2).join(", "),
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lon),
      loading: true,
    };
    setDestinations(prev => {
      const next = [...prev, newDest];
      return next;
    });
    setQuery("");
    setSuggestions([]);
    setAdding(false);

    const computed = await computeForDestination(newDest);
    if (computed.driving == null && computed.walking == null && computed.cycling == null) {
      toast({
        title: "Couldn't calculate commute",
        description: "The routing service didn't return any times for this destination.",
        variant: "destructive",
      });
    }
    setDestinations(prev => {
      const next = prev.map(d => (d.id === newDest.id ? computed : d));
      persist(next);
      return next;
    });
  };

  const removeDestination = (id: string) => {
    setDestinations(prev => {
      const next = prev.filter(d => d.id !== id);
      persist(next);
      return next;
    });
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Commute times</h3>
          <p className="text-sm text-muted-foreground">
            Estimate travel time from this property to your favourite places.
          </p>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Add destination
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-4 relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                placeholder="Search a place, address or landmark…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setQuery("");
                setSuggestions([]);
              }}
            >
              Cancel
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 left-0 right-0 bg-background border border-border rounded-md shadow-lg max-h-72 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  onClick={() => addDestination(s)}
                  className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2 text-sm"
                >
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {destinations.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No destinations yet. Add a place to see driving, walking and cycling times.
        </p>
      )}

      {destinations.length > 0 && (
        <ul className="space-y-2">
          {destinations.map((d) => (
            <li
              key={d.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-background border border-border"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground line-clamp-2">{d.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {d.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <div className="flex items-center gap-1.5" title="Driving">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="tabular-nums">{formatDuration(d.driving)}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Walking">
                      <PersonStanding className="w-4 h-4 text-muted-foreground" />
                      <span className="tabular-nums">{formatDuration(d.walking)}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Cycling">
                      <Bike className="w-4 h-4 text-muted-foreground" />
                      <span className="tabular-nums">{formatDuration(d.cycling)}</span>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeDestination(d.id)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${d.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Estimates use OpenStreetMap routing from the property's neighbourhood. Times are indicative only.
      </p>
    </div>
  );
}