// Cache for city center lookups
const cityCache: Record<string, { lat: number; lng: number }> = {};

/**
 * Look up the center coordinates of a city using Nominatim.
 * Results are cached in-memory for the session.
 */
export const getCityCenter = async (city: string): Promise<{ lat: number; lng: number } | null> => {
  if (!city) return null;
  
  const key = city.trim().toLowerCase();
  if (cityCache[key]) return cityCache[key];

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(city + ', Lebanon')}&limit=1&featuretype=city`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cityCache[key] = result;
      return result;
    }
  } catch (error) {
    console.error('Error fetching city center:', error);
  }
  return null;
};
