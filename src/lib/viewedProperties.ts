const MAX_VIEWED = 100;

function keyFor(userId?: string | null) {
  return `viewed_properties_${userId || 'guest'}`;
}

export function addViewedProperty(propertyId: string, userId?: string | null) {
  if (!propertyId) return;
  try {
    const key = keyFor(userId);
    const raw = localStorage.getItem(key);
    const list: { id: string; viewed_at: string }[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((v) => v.id !== propertyId);
    filtered.unshift({ id: propertyId, viewed_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, MAX_VIEWED)));
  } catch {}
}

export function getViewedProperties(userId?: string | null): { id: string; viewed_at: string }[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}