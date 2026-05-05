import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Loads the Google Maps JavaScript API (with Places, Drawing, Geometry libraries)
 * forcing English labels worldwide. The API key is fetched once from the
 * `get-maps-config` edge function and cached for the session.
 */

type GoogleMapsState = {
  google: typeof google | null;
  loaded: boolean;
  error: string | null;
};

let cachedKey: string | null = null;
let loaderPromise: Promise<typeof google> | null = null;

const LIBRARIES = ['places', 'drawing', 'geometry'] as const;

/**
 * Map style hiding all points of interest (restaurants, cafes, shops, etc.)
 * and transit labels. Use via `styles: MAP_STYLES_NO_POI` on every Map.
 */
export const MAP_STYLES_NO_POI: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const fetchKey = async (): Promise<string> => {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.functions.invoke('get-maps-config');
  if (error) throw new Error(error.message);
  if (!data?.apiKey) throw new Error('Google Maps API key not configured');
  cachedKey = data.apiKey as string;
  return cachedKey;
};

const loadGoogleMaps = async (): Promise<typeof google> => {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return (window as any).google;
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    const apiKey = await fetchKey();
    return new Promise<typeof google>((resolve, reject) => {
      const callbackName = `__googleMapsCallback_${Date.now()}`;
      (window as any)[callbackName] = () => {
        delete (window as any)[callbackName];
        resolve((window as any).google);
      };
      const script = document.createElement('script');
      const libs = LIBRARIES.join(',');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=${libs}&language=en&region=LB&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete (window as any)[callbackName];
        loaderPromise = null;
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
  })();

  return loaderPromise;
};

export const useGoogleMaps = (): GoogleMapsState => {
  const [state, setState] = useState<GoogleMapsState>(() => ({
    google:
      typeof window !== 'undefined' && (window as any).google?.maps
        ? (window as any).google
        : null,
    loaded:
      typeof window !== 'undefined' && !!(window as any).google?.maps,
    error: null,
  }));

  useEffect(() => {
    if (state.loaded) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (!cancelled) setState({ google: g, loaded: true, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled)
          setState({ google: null, loaded: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [state.loaded]);

  return state;
};