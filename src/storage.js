const VERSION = 1;
let availableCache = null;

export function isAvailable() {
  if (availableCache !== null) return availableCache;
  try {
    const probe = '__loghl_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    availableCache = true;
  } catch (_) {
    availableCache = false;
  }
  return availableCache;
}

export function load(key) {
  if (!isAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return null;
    return parsed.data;
  } catch (err) {
    console.warn('[loghl:storage] load failed for', key, err);
    return null;
  }
}

export function save(key, value) {
  if (!isAvailable()) return false;
  try {
    const envelope = JSON.stringify({ version: VERSION, data: value });
    localStorage.setItem(key, envelope);
    return true;
  } catch (err) {
    console.warn('[loghl:storage] save failed for', key, err);
    return false;
  }
}

export function remove(key) {
  if (!isAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[loghl:storage] remove failed for', key, err);
  }
}
