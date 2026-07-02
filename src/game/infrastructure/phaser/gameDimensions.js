export const LOGICAL_GAME_WIDTH = 960;
export const LOGICAL_GAME_HEIGHT = 540;

const MIN_RENDER_SCALE = 2;
const MAX_RENDER_SCALE = 3;

export function getRenderScale() {
  if (typeof window === "undefined") {
    return MIN_RENDER_SCALE;
  }

  const viewportScale = Math.min(
    window.innerWidth / LOGICAL_GAME_WIDTH,
    window.innerHeight / LOGICAL_GAME_HEIGHT,
  );
  const deviceScale = viewportScale * (window.devicePixelRatio || 1);
  const clampedScale = Math.min(
    MAX_RENDER_SCALE,
    Math.max(MIN_RENDER_SCALE, deviceScale),
  );

  // Quarter steps preserve the 16:9 buffer while avoiding tiny resize changes.
  return Math.ceil(clampedScale * 4) / 4;
}
