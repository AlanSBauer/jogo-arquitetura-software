const STORAGE_KEY = "blood-arena:player-identity";

function getBrowserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadPlayerIdentity(storage = getBrowserStorage()) {
  if (!storage) return null;

  try {
    const stored = storage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function savePlayerIdentity(identity, storage = getBrowserStorage()) {
  if (!storage) return identity;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // A identidade continua valida na sessao quando o storage e bloqueado.
  }
  return identity;
}

export const localStoragePlayerIdentityRepository = {
  load: loadPlayerIdentity,
  save: savePlayerIdentity,
};
