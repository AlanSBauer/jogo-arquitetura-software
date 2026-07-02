export const PLAYER_NAME_MAX_LENGTH = 16;

function normalizePlayerName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function createPlayerIdentity(value = {}) {
  const rawName = typeof value === "string" ? value : value?.name;
  return { name: normalizePlayerName(rawName) };
}

export function hasPlayerIdentity(identity) {
  return createPlayerIdentity(identity).name.length > 0;
}
