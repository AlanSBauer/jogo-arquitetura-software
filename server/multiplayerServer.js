import { createHash, randomUUID } from "node:crypto";
import {
  cardRequiresCreatureTarget,
  isLegalCreatureSpellTarget,
} from "../src/game/domain/rules/gameRules.js";
import { gameUseCases } from "../src/game/application/useCases/gameUseCases.js";

const MULLIGAN_DURATION_MS = 30_000;
const TURN_DURATION_MS = 90_000;
const PAUSE_DURATION_MS = 30_000;
const RECONNECT_GRACE_MS = 30_000;

function hashPassword(password = "") {
  return createHash("sha256").update(password).digest("hex");
}

function safeText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export class MultiplayerRoomServer {
  constructor() {
    this.rooms = new Map();
    this.peers = new Set();
  }

  connect(peer) {
    const session = { peer, roomId: null, slot: null, token: null };
    this.peers.add(session);
    this.send(peer, "connection:ready", { rooms: this.getPublicRooms() });

    peer.on("message", (rawMessage) => {
      try {
        this.handleMessage(session, JSON.parse(rawMessage));
      } catch (error) {
        this.send(peer, "error", { message: error.message || "Mensagem invalida." });
        const room = this.rooms.get(session.roomId);
        if (room?.state && session.slot !== null) {
          this.send(peer, "game:state", {
            ...this.getStatePayload(room, session.slot),
            reason: "error:resync",
          });
        }
      }
    });
    peer.on("close", () => this.handleDisconnect(session));
    peer.on("error", (error) => console.error("[WS]", error.message));
  }

  handleMessage(session, message) {
    switch (message.type) {
      case "room:list":
        this.send(session.peer, "room:list", { rooms: this.getPublicRooms() });
        break;
      case "room:create":
        this.createRoom(session, message.payload);
        break;
      case "room:join":
        this.joinRoom(session, message.payload);
        break;
      case "session:resume":
        this.resumeSession(session, message.payload);
        break;
      case "room:leave":
        this.leaveRoom(session);
        break;
      case "game:action":
        this.applyGameAction(session, message.payload);
        break;
      case "game:reroll":
        this.applyMulliganReroll(session);
        break;
      case "game:confirmMulligan":
        this.confirmMulligan(session);
        break;
      case "game:pause":
        this.pauseGame(session);
        break;
      case "game:resume":
        this.resumeGame(session);
        break;
      case "game:concede":
        this.concedeGame(session);
        break;
      case "game:chat":
        this.sendChatMessage(session, message.payload);
        break;
      case "game:rematch":
      case "game:restart":
        this.requestRematch(session);
        break;
      case "ping":
        this.send(session.peer, "pong", { serverNow: Date.now() });
        break;
      default:
        throw new Error("Comando multiplayer desconhecido.");
    }
  }

  createRoom(session, payload = {}) {
    if (session.roomId) throw new Error("Voce ja esta em uma sala.");
    const name = safeText(payload.roomName, 24);
    const playerName = safeText(payload.playerName, 16);
    if (!name || !playerName) throw new Error("Informe sala e jogador.");
    const duplicate = [...this.rooms.values()].some(
      (room) => room.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) throw new Error("Ja existe uma sala com esse nome.");

    const room = {
      id: randomUUID(),
      name,
      passwordHash: hashPassword(payload.password),
      hasPassword: Boolean(payload.password),
      status: "waiting",
      players: [
        this.createRoomPlayer(session, 0, playerName, payload.avatarKey),
        null,
      ],
      state: null,
      revision: 0,
      mulliganTimer: null,
      mulliganEndsAt: null,
      turnTimer: null,
      turnEndsAt: null,
      paused: false,
      pauseEndsAt: null,
      pausedTurnRemainingMs: 0,
      pauseTimer: null,
      pauseUsed: [false, false],
      rematchVotes: new Set(),
      chatMessages: [],
    };
    this.rooms.set(room.id, room);
    this.attachSession(session, room, 0);
    this.sendRoomJoined(session, room);
    this.broadcastRoomList();
  }

  joinRoom(session, payload = {}) {
    if (session.roomId) throw new Error("Voce ja esta em uma sala.");
    const room = this.rooms.get(payload.roomId);
    if (!room || room.status !== "waiting" || room.players[1]) {
      throw new Error("Sala indisponivel.");
    }
    if (room.passwordHash !== hashPassword(payload.password)) {
      throw new Error("Senha incorreta.");
    }
    const playerName = safeText(payload.playerName, 16);
    if (!playerName) throw new Error("Informe o nome do jogador.");

    room.players[1] = this.createRoomPlayer(
      session,
      1,
      playerName,
      payload.avatarKey,
    );
    this.attachSession(session, room, 1);
    this.sendRoomJoined(session, room);
    this.startMatch(room);
    this.broadcastRoomList();
  }

  createRoomPlayer(session, slot, name, avatarKey) {
    return {
      slot,
      name,
      avatarKey: safeText(avatarKey, 20) || `avatar${slot + 1}`,
      token: randomUUID(),
      peer: session.peer,
      connected: true,
      disconnectTimer: null,
    };
  }

  attachSession(session, room, slot) {
    const player = room.players[slot];
    session.roomId = room.id;
    session.slot = slot;
    session.token = player.token;
    player.peer = session.peer;
    player.connected = true;
  }

  sendRoomJoined(session, room) {
    this.send(session.peer, "room:joined", {
      room: this.getPublicRoom(room),
      slot: session.slot,
      token: session.token,
    });
  }

  startMatch(room) {
    const [creator, opponent] = room.players;
    room.state = gameUseCases.startGame({
      playerName: creator.name,
      playerAvatarKey: creator.avatarKey,
      enemyName: opponent.name,
      enemyAvatarKey: opponent.avatarKey,
      gameMode: "multiplayer",
    });
    room.status = "mulligan";
    room.revision += 1;
    room.rematchVotes.clear();
    room.pauseUsed = [false, false];
    room.paused = false;
    room.mulliganEndsAt = Date.now() + MULLIGAN_DURATION_MS;
    clearTimeout(room.mulliganTimer);
    room.mulliganTimer = setTimeout(() => {
      room.state = gameUseCases.confirmMultiplayerMulligan(room.state, 0, {
        forceAll: true,
      });
      room.revision += 1;
      room.mulliganEndsAt = null;
      room.status = "playing";
      this.scheduleTurnTimer(room);
      this.broadcastState(room, "mulligan:timeout");
    }, MULLIGAN_DURATION_MS);
    this.broadcastStarted(room);
  }

  applyMulliganReroll(session) {
    const room = this.requireRoom(session);
    if (room.status !== "mulligan") throw new Error("Troca indisponivel.");
    const player = room.state.players[session.slot];
    if (player.mulliganConfirmed) throw new Error("Cartas ja confirmadas.");
    const nextState = gameUseCases.rerollMulligan(room.state, session.slot);
    if (nextState === room.state) throw new Error("Troca ja utilizada.");
    room.state = nextState;
    room.revision += 1;
    this.broadcastState(room, "mulligan:reroll");
  }

  confirmMulligan(session) {
    const room = this.requireRoom(session);
    const nextState = gameUseCases.confirmMultiplayerMulligan(
      room.state,
      session.slot,
    );
    if (nextState === room.state) return;
    room.state = nextState;
    room.revision += 1;
    if (nextState.phase === "playing") {
      clearTimeout(room.mulliganTimer);
      room.mulliganEndsAt = null;
      room.status = "playing";
      this.scheduleTurnTimer(room);
    }
    this.broadcastState(room, "mulligan:confirm");
  }

  applyGameAction(session, payload = {}) {
    const room = this.requireRoom(session);
    if (room.status !== "playing" || room.state.winner) {
      throw new Error("A partida nao aceita jogadas agora.");
    }

    const action = payload.action ?? {};
    const isConcede = action.type === "concede";
    if (!isConcede && room.paused) {
      throw new Error("A partida esta pausada.");
    }
    if (!isConcede && room.state.activePlayerIndex !== session.slot) {
      throw new Error("Nao e o seu turno.");
    }

    const before = room.state;
    const playedCard =
      action.type === "playCard"
        ? before.players[session.slot].hand[action.handIndex]
        : null;
    let nextState = before;
    switch (action.type) {
      case "playCard":
        if (!playedCard) throw new Error("Carta nao encontrada na mao.");
        if (playedCard.manaCost > before.players[session.slot].mana) {
          throw new Error("Mana insuficiente para jogar esta carta.");
        }
        if (
          playedCard.type === "creature" &&
          before.players[session.slot].board.length >= before.config.maxBoardSize
        ) {
          throw new Error("O campo esta cheio.");
        }
        if (
          cardRequiresCreatureTarget(playedCard) &&
          !before.players[session.slot === 0 ? 1 : 0].board[action.targetIndex]
        ) {
          throw new Error("Escolha uma criatura inimiga como alvo.");
        }
        if (
          cardRequiresCreatureTarget(playedCard) &&
          !isLegalCreatureSpellTarget(
            before.players[session.slot === 0 ? 1 : 0],
            action.targetIndex,
          )
        ) {
          throw new Error("Uma criatura com Provocar deve ser o alvo.");
        }
        nextState = gameUseCases.playCard(
          before,
          action.handIndex,
          action.targetIndex,
          session.slot,
        );
        break;
      case "attackFace":
        nextState = gameUseCases.attackFace(
          before,
          action.boardIndex,
          session.slot,
        );
        break;
      case "attackCreature":
        nextState = gameUseCases.attackCreature(
          before,
          action.boardIndex,
          action.targetIndex,
          session.slot,
        );
        break;
      case "drawCard":
        if (before.players[session.slot].hasDrawnThisTurn) {
          throw new Error("A compra deste turno ja foi realizada.");
        }
        nextState = gameUseCases.drawCard(before, session.slot);
        break;
      case "endTurn":
        nextState = gameUseCases.endTurn(before, session.slot);
        break;
      case "concede":
        nextState = this.concedeState(before, session.slot);
        break;
      default:
        throw new Error("Jogada desconhecida.");
    }
    if (nextState === before) throw new Error("Jogada invalida.");

    room.state = nextState;
    room.revision += 1;
    if (nextState.winner) {
      room.status = "finished";
      clearTimeout(room.pauseTimer);
      room.pauseTimer = null;
      room.paused = false;
      room.pauseEndsAt = null;
      this.clearTurnTimer(room);
    } else if (nextState.turn !== before.turn) {
      this.scheduleTurnTimer(room);
    }
    this.broadcastAction(
      room,
      session.slot,
      playedCard ? { ...action, card: playedCard } : action,
      payload.actionId,
    );
  }

  concedeState(state, loserSlot) {
    return gameUseCases.concede(state, loserSlot);
  }

  finishMatch(room, state) {
    room.state = state;
    room.status = "finished";
    room.revision += 1;
    clearTimeout(room.mulliganTimer);
    clearTimeout(room.pauseTimer);
    room.mulliganTimer = null;
    room.pauseTimer = null;
    room.mulliganEndsAt = null;
    room.paused = false;
    room.pauseEndsAt = null;
    room.pausedTurnRemainingMs = 0;
    this.clearTurnTimer(room);
  }

  concedeGame(session) {
    const room = this.requireRoom(session);
    if (!room.state) throw new Error("A partida ainda nao comecou.");

    if (!room.state.winner) {
      this.finishMatch(room, this.concedeState(room.state, session.slot));
    }

    this.broadcastState(room, "game:conceded");
  }

  scheduleTurnTimer(room, duration = TURN_DURATION_MS) {
    this.clearTurnTimer(room);
    room.turnEndsAt = Date.now() + duration;
    room.turnTimer = setTimeout(() => {
      if (room.paused || room.status !== "playing" || room.state.winner) return;
      const actorSlot = room.state.activePlayerIndex;
      room.state = gameUseCases.endTurn(room.state, actorSlot);
      room.revision += 1;
      this.scheduleTurnTimer(room);
      this.broadcastAction(room, actorSlot, { type: "endTurn" }, "server-timeout");
    }, duration);
  }

  clearTurnTimer(room) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
    room.turnEndsAt = null;
  }

  pauseGame(session) {
    const room = this.requireRoom(session);
    if (room.status !== "playing" || room.state.winner || room.paused) return;
    if (room.pauseUsed[session.slot]) {
      throw new Error("Sua pausa desta partida ja foi utilizada.");
    }
    room.pauseUsed[session.slot] = true;
    room.pausedTurnRemainingMs = Math.max(0, room.turnEndsAt - Date.now());
    room.paused = true;
    room.pauseEndsAt = Date.now() + PAUSE_DURATION_MS;
    room.revision += 1;
    this.clearTurnTimer(room);
    room.pauseTimer = setTimeout(() => this.resumeRoom(room), PAUSE_DURATION_MS);
    this.broadcastState(room, "game:paused");
  }

  resumeGame(session) {
    this.resumeRoom(this.requireRoom(session));
  }

  resumeRoom(room) {
    if (!room.paused) return;
    clearTimeout(room.pauseTimer);
    room.paused = false;
    room.pauseEndsAt = null;
    room.revision += 1;
    this.scheduleTurnTimer(
      room,
      Math.max(1000, room.pausedTurnRemainingMs || TURN_DURATION_MS),
    );
    room.pausedTurnRemainingMs = 0;
    this.broadcastState(room, "game:resumed");
  }

  requestRematch(session) {
    const room = this.requireRoom(session);
    if (room.status !== "finished" || !room.state?.winner) {
      throw new Error("A revanche so pode ser solicitada depois do fim da partida.");
    }
    if (!room.players.every((player) => player?.connected)) {
      throw new Error("O adversario nao esta disponivel para uma revanche.");
    }
    if (room.rematchVotes.has(session.slot)) {
      return;
    }

    room.rematchVotes.add(session.slot);
    room.revision += 1;
    this.broadcastState(room, "game:rematchVote");
    if (room.rematchVotes.size === 2) this.startMatch(room);
  }

  sendChatMessage(session, payload = {}) {
    const room = this.requireRoom(session);
    const player = room.players[session.slot];
    const text = safeText(payload.text, 180);

    if (!room.state || !player?.connected) {
      throw new Error("Chat indisponível fora da partida.");
    }
    if (!text) {
      throw new Error("Digite uma mensagem antes de enviar.");
    }

    const message = {
      id: randomUUID(),
      slot: session.slot,
      name: player.name,
      text,
      sentAt: Date.now(),
    };
    room.chatMessages.push(message);
    room.chatMessages = room.chatMessages.slice(-50);

    room.players.forEach((roomPlayer) => {
      if (roomPlayer?.peer && roomPlayer.connected) {
        this.send(roomPlayer.peer, "game:chat", { message });
      }
    });
  }

  resumeSession(session, payload = {}) {
    const room = this.rooms.get(payload.roomId);
    const slot = room?.players.findIndex((player) => player?.token === payload.token);
    if (!room || slot < 0) throw new Error("Sessao multiplayer expirada.");
    const player = room.players[slot];
    clearTimeout(player.disconnectTimer);
    this.attachSession(session, room, slot);
    this.sendRoomJoined(session, room);
    this.send(session.peer, "game:started", this.getStatePayload(room, slot));
    this.broadcastState(room, "player:reconnected");
  }

  handleDisconnect(session) {
    this.peers.delete(session);
    if (!session.roomId) return;
    const room = this.rooms.get(session.roomId);
    const player = room?.players[session.slot];
    if (!room || !player || player.peer !== session.peer) return;
    player.connected = false;
    player.peer = null;

    if (room.status === "waiting") {
      this.destroyRoom(room);
      return;
    }
    if (room.state?.winner) {
      room.rematchVotes.delete(session.slot);
      room.revision += 1;
      this.broadcastState(room, "rematch:declined");
      return;
    }
    player.disconnectTimer = setTimeout(() => {
      if (player.connected || room.state?.winner) return;
      room.state = this.concedeState(room.state, session.slot);
      room.status = "finished";
      room.revision += 1;
      this.clearTurnTimer(room);
      this.broadcastState(room, "player:timeout");
    }, RECONNECT_GRACE_MS);
    this.broadcastState(room, "player:disconnected");
  }

  leaveRoom(session) {
    const room = session.roomId ? this.rooms.get(session.roomId) : null;
    if (!room) return;
    const player = room.players[session.slot];
    if (player) {
      clearTimeout(player.disconnectTimer);
      player.peer = null;
      player.connected = false;
    }
    session.roomId = null;
    session.slot = null;
    session.token = null;
    if (room.status === "waiting" || room.players.every((item) => !item?.connected)) {
      this.destroyRoom(room);
    } else if (room.state.winner) {
      room.rematchVotes.delete(player.slot);
      room.revision += 1;
      this.broadcastState(room, "rematch:declined");
    } else if (!room.state.winner) {
      room.state = this.concedeState(room.state, player.slot);
      room.status = "finished";
      room.revision += 1;
      this.broadcastState(room, "player:left");
    }
    this.broadcastRoomList();
  }

  destroyRoom(room) {
    clearTimeout(room.mulliganTimer);
    clearTimeout(room.pauseTimer);
    this.clearTurnTimer(room);
    room.players.forEach((player) => clearTimeout(player?.disconnectTimer));
    this.rooms.delete(room.id);
    this.broadcastRoomList();
  }

  requireRoom(session) {
    const room = session.roomId ? this.rooms.get(session.roomId) : null;
    if (!room || session.slot === null) throw new Error("Sala nao encontrada.");
    return room;
  }

  getPublicRooms() {
    return [...this.rooms.values()]
      .filter((room) => room.status === "waiting")
      .map((room) => this.getPublicRoom(room));
  }

  getPublicRoom(room) {
    return {
      id: room.id,
      name: room.name,
      hasPassword: room.hasPassword,
      status: room.status,
      playerCount: room.players.filter(Boolean).length,
      creatorName: room.players[0]?.name ?? "",
    };
  }

  getStatePayload(room, localSlot) {
    return {
      room: this.getPublicRoom(room),
      localSlot,
      revision: room.revision,
      state: this.getStateForPlayer(room.state, localSlot),
      serverNow: Date.now(),
      mulliganEndsAt: room.mulliganEndsAt,
      turnEndsAt: room.turnEndsAt,
      paused: room.paused,
      pauseEndsAt: room.pauseEndsAt,
      pauseUsed: room.pauseUsed,
      rematchVotes: [...room.rematchVotes],
      connectedPlayers: room.players.map((player) => Boolean(player?.connected)),
      chatMessages: room.chatMessages ?? [],
    };
  }

  getStateForPlayer(state, localSlot) {
    if (!state?.players) return state;

    return {
      ...state,
      players: state.players.map((player, slot) => {
        if (slot === localSlot) return player;

        return {
          ...player,
          hand: player.hand.map((card) => ({
            instanceId: card.instanceId,
            concealed: true,
          })),
          deck: player.deck.map((card) => ({
            instanceId: card.instanceId,
            concealed: true,
          })),
        };
      }),
    };
  }

  broadcastStarted(room) {
    room.players.forEach((player, slot) => {
      if (player?.peer) {
        this.send(player.peer, "game:started", this.getStatePayload(room, slot));
      }
    });
  }

  broadcastState(room, reason) {
    room.players.forEach((player, slot) => {
      if (player?.peer) {
        this.send(player.peer, "game:state", {
          ...this.getStatePayload(room, slot),
          reason,
        });
      }
    });
  }

  broadcastAction(room, actorSlot, action, actionId) {
    room.players.forEach((player, slot) => {
      if (player?.peer) {
        this.send(player.peer, "game:action", {
          ...this.getStatePayload(room, slot),
          actorSlot,
          action,
          actionId,
        });
      }
    });
  }

  broadcastRoomList() {
    const payload = { rooms: this.getPublicRooms() };
    this.peers.forEach((session) => {
      if (!session.roomId) this.send(session.peer, "room:list", payload);
    });
  }

  send(peer, type, payload = {}) {
    peer.send(JSON.stringify({ type, payload }));
  }
}
