const STORAGE_KEY = "blood-arena-audio";

export const SOUND_KEYS = {
  actionBarClose: "actionBarClose",
  actionBarOpen: "actionBarOpen",
  cardSlide: "cardSlide",
  colorlessBig: "colorlessBig",
  colorlessMedium: "colorlessMedium",
  colorlessSmall: "colorlessSmall",
  fightMedium: "fightMedium",
  fightSmall: "fightSmall",
  finalAttack: "finalAttack",
  fireBig: "fireBig",
  fireMedium: "fireMedium",
  fireSmall: "fireSmall",
  gameLose: "gameLose",
  gameWin: "gameWin",
  genericDamage: "genericDamage",
  manaRestore: "manaRestore",
  turnBegin: "turnBegin",
  turnEnd: "turnEnd",
  uiButton: "uiButton",
  waterBig: "waterBig",
  waterMedium: "waterMedium",
  waterSmall: "waterSmall",
};

const SOUND_URLS = {
  [SOUND_KEYS.actionBarClose]: "/sounds/ActionBarClose.wav",
  [SOUND_KEYS.actionBarOpen]: "/sounds/ActionBarOpen.wav",
  [SOUND_KEYS.cardSlide]: "/sounds/cardSlide_002.wav",
  [SOUND_KEYS.colorlessBig]: "/sounds/colorlessAttackBig.wav",
  [SOUND_KEYS.colorlessMedium]: "/sounds/colorlessAttackMedium.wav",
  [SOUND_KEYS.colorlessSmall]: "/sounds/colorlessAttackSmall.wav",
  [SOUND_KEYS.fightMedium]: "/sounds/fightingAttackMedium.wav",
  [SOUND_KEYS.fightSmall]: "/sounds/fightingAttackSmall.wav",
  [SOUND_KEYS.finalAttack]: "/sounds/finalAttack.wav",
  [SOUND_KEYS.fireBig]: "/sounds/fireAttackBig.wav",
  [SOUND_KEYS.fireMedium]: "/sounds/fireAttackMedium.wav",
  [SOUND_KEYS.fireSmall]: "/sounds/fireAttackSmall.wav",
  [SOUND_KEYS.gameLose]: "/sounds/gameLose.wav",
  [SOUND_KEYS.gameWin]: "/sounds/gameWin.wav",
  [SOUND_KEYS.genericDamage]: "/sounds/genericDamage.wav",
  [SOUND_KEYS.manaRestore]: "/sounds/manaRestore.wav",
  [SOUND_KEYS.turnBegin]: "/sounds/PlayerTurnBegin.wav",
  [SOUND_KEYS.turnEnd]: "/sounds/PlayerTurnEnd.wav",
  [SOUND_KEYS.uiButton]: "/sounds/ui_button_1.wav",
  [SOUND_KEYS.waterBig]: "/sounds/waterAttackBig.wav",
  [SOUND_KEYS.waterMedium]: "/sounds/waterAttackMedium.wav",
  [SOUND_KEYS.waterSmall]: "/sounds/waterAttackSmall.wav",
};

function clampVolume(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function readStoredSettings() {
  if (typeof window === "undefined") {
    return { volume: 0.7, muted: false };
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return {
      volume: clampVolume(stored?.volume ?? 0.7),
      muted: Boolean(stored?.muted),
    };
  } catch {
    return { volume: 0.7, muted: false };
  }
}

class GameAudio {
  constructor() {
    const settings = readStoredSettings();
    this.volume = settings.volume;
    this.muted = settings.muted;
    this.templates = new Map();
    this.listeners = new Set();
  }

  getSettings() {
    return { volume: this.volume, muted: this.muted };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  preload() {
    if (typeof Audio === "undefined") return;

    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      if (this.templates.has(key)) return;
      const audio = new Audio(url);
      audio.preload = "auto";
      this.templates.set(key, audio);
    });
  }

  play(key, { gain = 1, playbackRate = 1 } = {}) {
    if (typeof Audio === "undefined" || this.muted || this.volume <= 0) return;

    this.preload();
    const template = this.templates.get(key);
    if (!template) return;

    const audio = template.cloneNode();
    audio.volume = clampVolume(this.volume * gain);
    audio.playbackRate = playbackRate;
    audio.play().catch(() => {});
  }

  setVolume(value) {
    this.volume = clampVolume(value);
    this.persistAndNotify();
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.persistAndNotify();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  persistAndNotify() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(this.getSettings()),
        );
      } catch {
        // O audio continua funcional quando o navegador bloqueia persistencia.
      }
    }
    this.listeners.forEach((listener) => listener(this.getSettings()));
  }
}

export const gameAudio = new GameAudio();
