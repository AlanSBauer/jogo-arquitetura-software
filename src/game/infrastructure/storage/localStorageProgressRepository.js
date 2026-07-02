import {
  createDefaultPlayerProgress,
  normalizeProgress,
} from "../../domain/services/progressRules.js";

const STORAGE_KEY = "blood-arena:player-progress";

function getBrowserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadProgress(storage = getBrowserStorage()) {
  if (!storage) return createDefaultPlayerProgress();

  try {
    const stored = storage.getItem(STORAGE_KEY);
    return normalizeProgress(stored ? JSON.parse(stored) : null);
  } catch {
    return createDefaultPlayerProgress();
  }
}

export function saveProgress(progress, storage = getBrowserStorage()) {
  const normalized = normalizeProgress(progress);
  if (!storage) return normalized;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // O jogo continua funcional quando o navegador bloqueia a persistência.
  }
  return normalized;
}

export const localStorageProgressRepository = {
  load: loadProgress,
  save: saveProgress,
};
