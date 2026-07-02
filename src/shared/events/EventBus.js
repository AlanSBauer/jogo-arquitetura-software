export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventType, listener) {
    const eventListeners = this.listeners.get(eventType) ?? new Set();
    eventListeners.add(listener);
    this.listeners.set(eventType, eventListeners);
    return () => this.off(eventType, listener);
  }

  once(eventType, listener) {
    const unsubscribe = this.on(eventType, (event) => {
      unsubscribe();
      listener(event);
    });
    return unsubscribe;
  }

  off(eventType, listener) {
    const eventListeners = this.listeners.get(eventType);
    eventListeners?.delete(listener);
    if (eventListeners?.size === 0) this.listeners.delete(eventType);
  }

  emit(eventType, payload = {}) {
    const event = {
      type: eventType,
      payload,
      occurredAt: Date.now(),
    };
    this.listeners.get(eventType)?.forEach((listener) => listener(event));
    this.listeners.get("*")?.forEach((listener) => listener(event));
    return event;
  }

  clear() {
    this.listeners.clear();
  }
}

