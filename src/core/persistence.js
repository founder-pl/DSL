// Core: Simple client-side persistence utilities (localStorage-based)

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch (_) {}
  return null;
}

export function hasStorage() {
  return !!getStorage();
}

export function saveState(key, state) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch (_) {
    return false;
  }
}

export function loadState(key) {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function saveYAML(key, yamlText) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, yamlText);
    return true;
  } catch (_) {
    return false;
  }
}

export function loadYAML(key) {
  const storage = getStorage();
  if (!storage) return '';
  try {
    return storage.getItem(key) || '';
  } catch (_) {
    return '';
  }
}

export default { hasStorage, saveState, loadState, saveYAML, loadYAML };
