const DEFAULT_RECONNECT_DELAY_MS = 1200;
const SESSION_STORAGE_KEY = "blood-arena-multiplayer";

function writeStoredSession(session) {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // A conexao atual continua valida mesmo sem persistencia para reconexao.
  }
}

function removeStoredSession() {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nada a fazer quando o storage esta indisponivel.
  }
}

function readStoredSession() {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getDefaultWebSocketUrl() {
  if (import.meta.env.VITE_MULTIPLAYER_URL) {
    return import.meta.env.VITE_MULTIPLAYER_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:8080`;
}

export class MultiplayerClient {
  constructor(url = getDefaultWebSocketUrl()) {
    this.url = url;
    this.socket = null;
    this.listeners = new Map();
    this.connectPromise = null;
    this.shouldReconnect = true;
    this.reconnectTimer = null;
    this.session = this.readSession();
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.addEventListener("open", () => {
        this.connectPromise = null;
        if (this.session?.roomId && this.session?.token) {
          this.send("session:resume", this.session);
        }
        resolve();
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch {
          this.emit("error", { message: "Resposta multiplayer invalida." });
        }
      });
      socket.addEventListener("close", () => {
        this.socket = null;
        this.connectPromise = null;
        this.emit("connection:closed", {});
        if (this.shouldReconnect && this.session) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = window.setTimeout(
            () => this.connect().catch(() => {}),
            DEFAULT_RECONNECT_DELAY_MS,
          );
        }
      });
      socket.addEventListener("error", () => {
        if (this.connectPromise) {
          this.connectPromise = null;
          reject(new Error("Nao foi possivel conectar ao multiplayer."));
        }
      });
    });

    return this.connectPromise;
  }

  handleMessage(message) {
    const payload = message.payload ?? {};
    if (message.type === "room:joined") {
      this.session = {
        roomId: payload.room.id,
        token: payload.token,
        slot: payload.slot,
      };
      writeStoredSession(this.session);
    }
    if (message.type === "game:started" && this.session) {
      this.session.slot = payload.localSlot;
      writeStoredSession(this.session);
    }
    this.emit(message.type, payload);
  }

  on(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => listeners.delete(listener);
  }

  emit(type, payload) {
    this.listeners.get(type)?.forEach((listener) => listener(payload));
  }

  send(type, payload = {}) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.emit("error", { message: "Conexao multiplayer indisponivel." });
      return false;
    }
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  createRoom(payload) {
    return this.send("room:create", payload);
  }

  joinRoom(payload) {
    return this.send("room:join", payload);
  }

  listRooms() {
    return this.send("room:list");
  }

  leaveRoom() {
    this.send("room:leave");
    this.clearSession();
  }

  clearSession() {
    this.session = null;
    removeStoredSession();
  }

  readSession() {
    return readStoredSession();
  }

  disconnect({ reconnect = false } = {}) {
    this.shouldReconnect = reconnect;
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }
}
