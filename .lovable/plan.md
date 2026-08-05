# Fix Google Maps loading

## What's wrong

The browser console shows:

```text
Google Maps JavaScript API error: BillingNotEnabledMapError
```

The map script is being loaded with the wrong key. `src/hooks/useGoogleMaps.ts` calls the `get-maps-config` edge function, which returns the `GOOGLE_MAPS_API_KEY` secret. That secret is the Lovable **connector gateway** key — meant for server-side gateway calls (that is how `get-commute-time` uses it), not for loading the Maps JavaScript API in the browser. Google rejects it, so every map renders blank or grey.

The correct browser key already exists in the project as `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, managed by the Google Maps connector and referrer-restricted to Lovable domains.

## The fix

1. `src/hooks/useGoogleMaps.ts`: load the Maps JS script with `import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` directly, dropping the `get-maps-config` round-trip. Keep the existing libraries (`places`, `drawing`, `geometry`), `loading=async`, the callback, and the language/region params. Show a clear error if the env var is missing.
2. Remove the now-unused `supabase/functions/get-maps-config` function and its `config.toml` entry so nothing else picks up the wrong key.
3. Leave `get-commute-time` untouched — it correctly uses the gateway key server-side.

## Note on domains

The managed browser key works on `*.lovable.app` and `*.lovableproject.com`, which covers both the preview and `rumiprop.lovable.app`. A future custom domain would need its own Google Cloud API key with that domain added to the key's HTTP-referrer allowlist.