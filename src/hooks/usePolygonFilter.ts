import { useState, useCallback, useEffect } from 'react';
import { getCityCenter } from '@/utils/cityCenter';

interface Coordinate {
  latitude: number;
  longitude: number;
}

// Ray casting algorithm to check if point is inside polygon
function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Haversine distance in km between two coordinates
function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Minimum distance (km) from a point to any edge segment of the polygon,
// using perpendicular distance to each segment (not just vertices). This
// yields a true uniform buffer around the polygon when a search radius is
// applied, so listings just outside a long edge are still matched.
function pointToSegmentDistance(p: Coordinate, a: Coordinate, b: Coordinate): number {
  // Project onto a local equirectangular plane around point `a` so we can
  // use planar geometry, then convert the resulting fractional projection
  // back into a haversine distance for accuracy.
  const toRad = (d: number) => (d * Math.PI) / 180;
  const latRef = toRad(a.latitude);
  const x = (c: Coordinate) => toRad(c.longitude - a.longitude) * Math.cos(latRef);
  const y = (c: Coordinate) => toRad(c.latitude - a.latitude);

  const ax = 0, ay = 0;
  const bx = x(b), by = y(b);
  const px = x(p), py = y(p);

  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closest: Coordinate = {
    latitude: a.latitude + t * (b.latitude - a.latitude),
    longitude: a.longitude + t * (b.longitude - a.longitude),
  };
  return haversineDistance(p, closest);
}

function minDistanceToPolygon(point: Coordinate, polygon: Coordinate[]): number {
  let minDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const dist = pointToSegmentDistance(point, polygon[j], polygon[i]);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

export function usePolygonFilter() {
  const [drawnPolygon, setDrawnPolygon] = useState<Coordinate[] | null>(null);
  const [cityCenters, setCityCenters] = useState<Record<string, { lat: number; lng: number }>>({});

  // Resolve city centers for a list of cities
  const resolveCityCenters = useCallback(async (cities: string[]) => {
    const unique = Array.from(new Set(cities.filter(Boolean)));
    const missing = unique.filter(c => !cityCenters[c.trim().toLowerCase()]);
    if (missing.length === 0) return;

    const results: Record<string, { lat: number; lng: number }> = { ...cityCenters };
    await Promise.all(missing.map(async (city) => {
      const center = await getCityCenter(city);
      if (center) results[city.trim().toLowerCase()] = center;
    }));
    setCityCenters(results);
  }, [cityCenters]);

  const filterPropertiesByPolygon = useCallback(<T extends { latitude: number | null; longitude: number | null; city?: string }>(
    properties: T[],
    radiusKm: number = 0
  ): T[] => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      return properties;
    }

    return properties.filter(property => {
      let lat = property.latitude;
      let lng = property.longitude;

      // Fallback to city center if no exact coords
      if (lat === null || lng === null) {
        const city = property.city;
        if (city) {
          const center = cityCenters[city.trim().toLowerCase()];
          if (center) {
            lat = center.lat;
            lng = center.lng;
          }
        }
      }

      if (lat === null || lng === null) return false;

      const point = { latitude: lat, longitude: lng };
      
      if (isPointInPolygon(point, drawnPolygon)) {
        return true;
      }
      
      if (radiusKm > 0) {
        return minDistanceToPolygon(point, drawnPolygon) <= radiusKm;
      }
      
      return false;
    });
  }, [drawnPolygon, cityCenters]);

  const clearPolygon = useCallback(() => {
    setDrawnPolygon(null);
  }, []);

  return {
    drawnPolygon,
    setDrawnPolygon,
    filterPropertiesByPolygon,
    clearPolygon,
    hasDrawnArea: drawnPolygon !== null && drawnPolygon.length >= 3,
    resolveCityCenters
  };
}
