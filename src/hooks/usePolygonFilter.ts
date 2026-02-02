import { useState, useCallback } from 'react';

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

export function usePolygonFilter() {
  const [drawnPolygon, setDrawnPolygon] = useState<Coordinate[] | null>(null);

  const filterPropertiesByPolygon = useCallback(<T extends { latitude: number | null; longitude: number | null }>(
    properties: T[]
  ): T[] => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      return properties;
    }

    return properties.filter(property => {
      if (property.latitude === null || property.longitude === null) {
        return false;
      }
      return isPointInPolygon(
        { latitude: property.latitude, longitude: property.longitude },
        drawnPolygon
      );
    });
  }, [drawnPolygon]);

  const clearPolygon = useCallback(() => {
    setDrawnPolygon(null);
  }, []);

  return {
    drawnPolygon,
    setDrawnPolygon,
    filterPropertiesByPolygon,
    clearPolygon,
    hasDrawnArea: drawnPolygon !== null && drawnPolygon.length >= 3
  };
}
