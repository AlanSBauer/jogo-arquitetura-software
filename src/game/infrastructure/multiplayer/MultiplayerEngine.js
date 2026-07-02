import { EventBus } from "../../../shared/events/EventBus.js";
import { publishGameEvents } from "../../application/events/publishGameEvents.js";
import { createGameUseCases } from "../../application/useCases/gameUseCases.js";
import {
  receiveChatMessage,
  sendChatMessage,
} from "../../application/useCases/chatUseCases.js";

function revealCardBack(card) {
  if (!card?.hidden) return card;
  return { ...card, hidden: false, concealed: true };
}

function remapPlayer(player, id, isOpponent = false) {
  return {
    ...player,
    networkId: player.id,
    id,
    hand: isOpponent ? player.hand.map(revealCardBack) : player.hand,
    deck: isOpponent ? player.deck.map(revealCardBack) : player.deck,
  };
}

function transformState(payload, localSlot) {
  const source = payload.state;
  if (!source) return null;
  const players =
    localSlot === 0
      ? [
          remapPlayer(source.players[0], "p1"),
          remapPlayer(source.players[1], "p2", true),
        ]
      : [
          remapPlayer(source.players[1], "p1"),
          remapPlayer(source.players[0], "p2", true),
        ];
  const canonicalWinnerSlot = source.players.findIndex(
    (player) => player.id === source.winnerId,
  );
  const winnerId =
    canonicalWinnerSlot < 0
      ? source.winnerId
      : canonicalWinnerSlot === localSlot
        ? "p1"
        : "p2";

  return {
    ...source,
    players,
    activePlayerIndex:
      source.activePlayerIndex === localSlot ? 0 : 1,
    winnerId,
    network: {
      room: payload.room,
      localSlot,
      revision: payload.revision,
      serverNow: payload.serverNow,
      mulliganEndsAt: payload.mulliganEndsAt,
      turnEndsAt: payload.turnEndsAt,
      paused: payload.paused,
      pauseEndsAt: payload.pauseEndsAt,
      pauseUsed: payload.pauseUsed,
      rematchVotes: payload.rematchVotes,
      connectedPlayers: payload.connectedPlayers,
    },
  };
}

export class MultiplayerEngine {
  constructor(client, startPayload, { eventBus = new EventBus() } = {}) {
    this.client = client;
    this.events = eventBus;
    this.useCases = createGameUseCases({ eventBus: this.events });
    this.localSlot = startPayload.localSlot;
    this.state = transformState(startPayload, this.localSlot);
    this.revision = startPayload.revision ?? 0;
    this.listeners = new Set();
    this.remoteActionListeners = new Set();
    this.chatListeners = new Set();
    this.chatMessages = startPayload.chatMessages ?? [];
    this.pendingActionIds = new Set();
    this.actionSequence = 0;
    this.isMultiplayer = true;
    this.unsubscribers = [
      client.on("game:started", (payload) => this.handleServerStart(payload)),
      client.on("game:action", (payload) => this.handleServerAction(payload)),
      client.on("game:state", (payload) => this.handleServerState(payload)),
      client.on("game:chat", (payload) => this.handleServerChat(payload)),
    ];
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  subscribeRemoteActions(listener) {
    this.remoteActionListeners.add(listener);
    return () => this.remoteActionListeners.delete(listener);
  }

  subscribeChat(listener) {
    this.chatListeners.add(listener);
    listener(this.chatMessages);
    return () => this.chatListeners.delete(listener);
  }

  notifyChatListeners() {
    this.chatListeners.forEach((listener) => listener(this.chatMessages));
  }

  syncChatHistory(payload) {
    if (!Array.isArray(payload?.chatMessages)) return;
    const messagesById = new Map(
      [...this.chatMessages, ...payload.chatMessages].map((message) => [
        message.id,
        message,
      ]),
    );
    const previousIds = new Set(this.chatMessages.map((message) => message.id));
    this.chatMessages = [...messagesById.values()]
      .sort((first, second) => first.sentAt - second.sentAt)
      .slice(-50);
    this.chatMessages
      .filter((message) => !previousIds.has(message.id))
      .forEach((message) =>
        receiveChatMessage({ eventBus: this.events, message }),
      );
    this.notifyChatListeners();
  }

  handleServerChat(payload) {
    const message = payload?.message;
    if (!message?.id || this.chatMessages.some((item) => item.id === message.id)) {
      return;
    }
    this.chatMessages = [...this.chatMessages, message].slice(-50);
    receiveChatMessage({ eventBus: this.events, message });
    this.notifyChatListeners();
  }

  setState(nextState, { publishEvents = true, action = null } = {}) {
    const previousState = this.state;
    const nextRevision = nextState?.network?.revision;
    if (Number.isFinite(nextRevision)) {
      this.revision = Math.max(this.revision, nextRevision);
    }
    this.state = nextState;
    if (publishEvents) {
      publishGameEvents(
        this.events,
        previousState,
        nextState,
        action ?? { type: "networkSync" },
      );
    }
    this.listeners.forEach((listener) => listener(nextState));
  }

  handleServerStart(payload) {
    if ((payload.revision ?? 0) < this.revision) return;
    this.localSlot = payload.localSlot;
    this.pendingActionIds.clear();
    this.syncChatHistory(payload);
    const nextState = transformState(payload, this.localSlot);
    if (nextState) this.setState(nextState, { action: { type: "startGame" } });
  }

  handleServerState(payload) {
    if ((payload.revision ?? 0) < this.revision) return;
    this.syncChatHistory(payload);
    const nextState = transformState(payload, this.localSlot);
    if (nextState) this.setState(nextState);
  }

  handleServerAction(payload) {
    const incomingRevision = payload.revision ?? 0;
    if (incomingRevision < this.revision) return;
    const nextState = transformState(payload, this.localSlot);
    if (!nextState) return;
    this.syncChatHistory(payload);

    if (payload.actionId && this.pendingActionIds.has(payload.actionId)) {
      this.pendingActionIds.delete(payload.actionId);
      this.setState(nextState, { action: payload.action });
      return;
    }

    const actorIsLocal = payload.actorSlot === this.localSlot;
    if (actorIsLocal) {
      this.setState(nextState, { action: payload.action });
      return;
    }

    let applied = false;
    const apply = () => {
      if (applied) return;
      applied = true;
      if (incomingRevision < this.revision) {
        this.listeners.forEach((listener) => listener(this.state));
        return;
      }
      this.setState(nextState, {
        action: {
          ...payload.action,
          playerIndex: payload.actorSlot === this.localSlot ? 0 : 1,
        },
      });
    };
    if (this.remoteActionListeners.size === 0) {
      apply();
      return;
    }
    this.remoteActionListeners.forEach((listener) =>
      listener({ action: payload.action, nextState, apply }),
    );
  }

  dispatchAction(action, reducer) {
    const actionId = `${this.localSlot}-${Date.now()}-${this.actionSequence++}`;
    const nextState = reducer(this.state);
    if (nextState === this.state) return false;
    this.pendingActionIds.add(actionId);
    this.setState(nextState, { publishEvents: false });
    this.client.send("game:action", { action, actionId });
    return true;
  }

  playCard(handIndex, targetIndex = null) {
    return this.dispatchAction(
      { type: "playCard", handIndex, targetIndex },
      (state) => this.useCases.playCard(state, handIndex, targetIndex, 0),
    );
  }

  attackFace(boardIndex) {
    return this.dispatchAction(
      { type: "attackFace", boardIndex },
      (state) => this.useCases.attackFace(state, boardIndex, 0),
    );
  }

  attackCreature(boardIndex, targetIndex) {
    return this.dispatchAction(
      { type: "attackCreature", boardIndex, targetIndex },
      (state) =>
        this.useCases.attackCreature(state, boardIndex, targetIndex, 0),
    );
  }

  drawCard() {
    return this.dispatchAction(
      { type: "drawCard" },
      (state) => this.useCases.drawCard(state, 0),
    );
  }

  endTurn() {
    return this.dispatchAction(
      { type: "endTurn" },
      (state) => this.useCases.endTurn(state, 0),
    );
  }

  rerollMulligan() {
    const nextState = this.useCases.rerollMulligan(this.state, 0);
    if (nextState === this.state) return false;
    this.setState(nextState, { publishEvents: false });
    this.client.send("game:reroll");
    return true;
  }

  confirmMulligan() {
    const nextState = this.useCases.confirmMultiplayerMulligan(this.state, 0);
    if (nextState !== this.state) {
      this.setState(nextState, { publishEvents: false });
    }
    this.client.send("game:confirmMulligan");
  }

  concede() {
    return this.client.send("game:concede");
  }

  pause() {
    this.client.send("game:pause");
  }

  resume() {
    this.client.send("game:resume");
  }

  reset() {
    this.client.send("game:restart");
  }

  requestRematch() {
    this.client.send("game:rematch");
  }

  sendChat(text) {
    return sendChatMessage({
      transport: (type, payload) => this.client.send(type, payload),
      eventBus: this.events,
      text,
    });
  }

  leaveRoom() {
    this.client.leaveRoom();
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
    this.remoteActionListeners.clear();
    this.chatListeners.clear();
    this.events.clear();
  }
}
