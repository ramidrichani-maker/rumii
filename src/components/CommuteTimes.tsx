import { useEffect, useState } from "react";
import { Car, Plus, X, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CommuteTimesProps {
  originLat: number;
  originLng: number;
  city?: string;
}

type DestType = "mall" | "neighborhood";

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Destination extends Place {
  type: DestType;
  driving?: number | null;
  loading?: boolean;
}

const STORAGE_KEY = "oracle:commute-destinations";

const TYPE_LABELS: Record<DestType, string> = {
  mall: "Mall",
  neighborhood: "Neighborhood",
};

// Curated Lebanese places by category.
const PLACES: Record<DestType, Place[]> = {
  mall: [
    { id: "abc-achrafieh", name: "ABC Achrafieh", lat: 33.8869, lng: 35.5197 },
    { id: "abc-verdun", name: "ABC Verdun", lat: 33.8780, lng: 35.4830 },
    { id: "abc-dbayeh", name: "ABC Dbayeh", lat: 33.9430, lng: 35.5910 },
    { id: "city-centre-beirut", name: "Beirut City Centre (Hazmieh)", lat: 33.8470, lng: 35.5430 },
    { id: "le-mall-dbayeh", name: "Le Mall Dbayeh", lat: 33.9395, lng: 35.5870 },
    { id: "le-mall-sin-el-fil", name: "Le Mall Sin El Fil", lat: 33.8746, lng: 35.5530 },
    { id: "city-mall-dora", name: "City Mall Dora", lat: 33.8981, lng: 35.5687 },
    { id: "spinneys-dbayeh", name: "Spinneys Dbayeh", lat: 33.9420, lng: 35.5880 },
  ],
  neighborhood: [
    { id: "achrafieh", name: "Achrafieh", lat: 33.8869, lng: 35.5197 },
    { id: "verdun", name: "Verdun", lat: 33.8780, lng: 35.4830 },
    { id: "hamra", name: "Hamra", lat: 33.8970, lng: 35.4810 },
    { id: "downtown-beirut", name: "Downtown Beirut", lat: 33.8959, lng: 35.5089 },
    { id: "gemmayzeh", name: "Gemmayzeh", lat: 33.8959, lng: 35.5170 },
    { id: "mar-mikhael", name: "Mar Mikhael", lat: 33.8970, lng: 35.5240 },
    { id: "badaro", name: "Badaro", lat: 33.8746, lng: 35.5180 },
    { id: "ras-beirut", name: "Ras Beirut", lat: 33.9000, lng: 35.4750 },
    { id: "manara", name: "Manara", lat: 33.9000, lng: 35.4720 },
    { id: "raouche", name: "Raouche", lat: 33.8900, lng: 35.4750 },
    { id: "jnah", name: "Jnah", lat: 33.8650, lng: 35.4900 },
    { id: "ouzai", name: "Ouzai", lat: 33.8500, lng: 35.4900 },
    { id: "bourj-hammoud", name: "Bourj Hammoud", lat: 33.8930, lng: 35.5430 },
    { id: "sin-el-fil", name: "Sin El Fil", lat: 33.8746, lng: 35.5530 },
    { id: "dbayeh", name: "Dbayeh", lat: 33.9430, lng: 35.5910 },
    { id: "antelias", name: "Antelias", lat: 33.9140, lng: 35.5870 },
    { id: "jal-el-dib", name: "Jal el Dib", lat: 33.9100, lng: 35.5860 },
    { id: "zalka", name: "Zalka", lat: 33.9020, lng: 35.5790 },
    { id: "hazmieh", name: "Hazmieh", lat: 33.8470, lng: 35.5430 },
    { id: "baabda", name: "Baabda", lat: 33.8333, lng: 35.5444 },
    { id: "furn-el-chebbak", name: "Furn el Chebbak", lat: 33.8650, lng: 35.5350 },
    { id: "ain-el-mreisseh", name: "Ain el Mreisseh", lat: 33.9020, lng: 35.4870 },
  ],
};

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
    const { data, error } = await supabase.functions.invoke('get-commute-time', {
      body: { origin, destination: dest },
    });
    if (error) return null;
    return typeof data?.driving === 'number' ? data.driving : null;
  } catch {
    return null;
  }
};

export default function CommuteTimes({ originLat, originLng }: CommuteTimesProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<DestType>("mall");
  const [placeId, setPlaceId] = useState<string>("");

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
      const slim = dests.map(({ id, name, lat, lng, type, driving }) => ({
        id, name, lat, lng, type, driving,
      }));
      localStorage.setItem(storageKey, JSON.stringify(slim));
    } catch {
      // ignore
    }
  };

  const computeForDestination = async (dest: Destination): Promise<Destination> => {
    const origin = { lat: originLat, lng: originLng };
    const target = { lat: dest.lat, lng: dest.lng };
    const driving = await fetchRoute("driving", origin, target);
    return { ...dest, driving, loading: false };
  };

  const addSelected = async () => {
    const place = PLACES[type].find(p => p.id === placeId);
    if (!place) return;
    const uniqueId = `${type}-${place.id}-${Date.now()}`;
    const newDest: Destination = {
      id: uniqueId,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      type,
      loading: true,
    };
    setDestinations(prev => [...prev, newDest]);
    setPlaceId("");
    setAdding(false);

    const computed = await computeForDestination(newDest);
    if (computed.driving == null) {
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

  const alreadyAdded = new Set(destinations.map(d => `${d.type}:${d.name}`));
  const availablePlaces = PLACES[type].filter(p => !alreadyAdded.has(`${type}:${p.name}`));

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Commute times</h3>
          <p className="text-sm text-muted-foreground">
            Estimate driving time from this property to your favourite places.
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
        <div className="mb-4 space-y-3">
          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as DestType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setPlaceId("");
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  type === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select value={placeId} onValueChange={setPlaceId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={`Pick a ${TYPE_LABELS[type].toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent className="z-[9999] max-h-72">
                  {availablePlaces.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      All places already added.
                    </div>
                  ) : (
                    availablePlaces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={addSelected} disabled={!placeId}>
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setPlaceId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {destinations.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No destinations yet. Add a place to see.
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
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground line-clamp-2">{d.name}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[d.type]}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {d.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex items-center gap-1.5" title="Driving">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span className="tabular-nums">{formatDuration(d.driving)}</span>
                  </div>
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
        Estimates use Google Maps driving times.
      </p>
    </div>
  );
}