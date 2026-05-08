const PREFIX = "filters:";

export function loadFilters<T extends Record<string, any>>(key: string): Partial<T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveFilters(key: string, value: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredFilters(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}