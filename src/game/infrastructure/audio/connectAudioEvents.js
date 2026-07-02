import { GAME_EVENTS } from "../../domain/events/gameEvents.js";
import { gameAudio, SOUND_KEYS } from "./gameAudio.js";

export function connectAudioEvents(eventBus, audio = gameAudio) {
  if (!eventBus?.on) return () => {};
  const unsubscribers = [
    eventBus.on(GAME_EVENTS.SOUND_REQUESTED, ({ payload }) => {
      audio.play(payload.key, payload.options);
    }),
    eventBus.on(GAME_EVENTS.CHAT_MESSAGE_SENT, () => {
      audio.play(SOUND_KEYS.uiButton, { gain: 0.55 });
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function requestSound(eventBus, key, options = {}) {
  if (eventBus?.emit) {
    eventBus.emit(GAME_EVENTS.SOUND_REQUESTED, { key, options });
    return;
  }
  gameAudio.play(key, options);
}
