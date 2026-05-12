const CACHE_PREFIX = 'swc_cache:';
const memoryCache = new Map();

function storageKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readSessionCache(key, { maxAge = Infinity } = {}) {
  const fullKey = storageKey(key);
  const memoryEntry = memoryCache.get(fullKey);

  if (memoryEntry) {
    if (Date.now() - memoryEntry.savedAt <= maxAge) {
      return memoryEntry;
    }
    memoryCache.delete(fullKey);
  }

  if (!canUseSessionStorage()) return null;

  try {
    const rawValue = window.sessionStorage.getItem(fullKey);
    if (!rawValue) return null;

    const entry = JSON.parse(rawValue);
    if (!entry?.savedAt || Date.now() - entry.savedAt > maxAge) {
      window.sessionStorage.removeItem(fullKey);
      return null;
    }

    memoryCache.set(fullKey, entry);
    return entry;
  } catch {
    window.sessionStorage.removeItem(fullKey);
    return null;
  }
}

export function writeSessionCache(key, data) {
  const fullKey = storageKey(key);
  const entry = { data, savedAt: Date.now() };
  memoryCache.set(fullKey, entry);

  if (!canUseSessionStorage()) return entry;

  try {
    window.sessionStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    memoryCache.delete(fullKey);
  }

  return entry;
}

export function removeSessionCache(key) {
  const fullKey = storageKey(key);
  memoryCache.delete(fullKey);

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(fullKey);
  }
}

export function clearSessionCache() {
  memoryCache.clear();

  if (!canUseSessionStorage()) return;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(CACHE_PREFIX)) {
      window.sessionStorage.removeItem(key);
    }
  }
}
