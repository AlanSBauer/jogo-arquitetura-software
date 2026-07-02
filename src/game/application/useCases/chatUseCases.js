import { GAME_EVENTS } from "../../domain/events/gameEvents.js";

export function sendChatMessage({ transport, eventBus, text }) {
  const normalizedText = String(text ?? "").trim().slice(0, 180);
  if (!normalizedText || !transport) return false;

  const sent = transport("game:chat", { text: normalizedText });
  if (sent) {
    eventBus?.emit(GAME_EVENTS.CHAT_MESSAGE_SENT, { text: normalizedText });
  }
  return sent;
}

export function receiveChatMessage({ eventBus, message }) {
  if (!message?.id) return null;
  eventBus?.emit(GAME_EVENTS.CHAT_MESSAGE_RECEIVED, { message });
  return message;
}

