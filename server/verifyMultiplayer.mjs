import assert from "node:assert/strict";
import { createServer } from "node:http";
import { attachWebSocketServer } from "./nativeWebSocket.js";
import { MultiplayerRoomServer } from "./multiplayerServer.js";

class TestClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.messages = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
      this.socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        const waiterIndex = this.waiters.findIndex(
          (waiter) =>
            waiter.type === message.type && waiter.predicate(message.payload),
        );
        if (waiterIndex >= 0) {
          const [waiter] = this.waiters.splice(waiterIndex, 1);
          clearTimeout(waiter.timer);
          waiter.resolve(message.payload);
        } else {
          this.messages.push(message);
        }
      });
    });
  }

  send(type, payload = {}) {
    this.socket.send(JSON.stringify({ type, payload }));
  }

  waitFor(type, predicate = () => true, timeoutMs = 2500) {
    const messageIndex = this.messages.findIndex(
      (message) => message.type === type && predicate(message.payload),
    );
    if (messageIndex >= 0) {
      const [message] = this.messages.splice(messageIndex, 1);
      return Promise.resolve(message.payload);
    }

    return new Promise((resolve, reject) => {
      const waiter = { type, predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters = this.waiters.filter((item) => item !== waiter);
        reject(new Error(`Timeout esperando ${type}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() {
    this.socket?.close();
  }
}

function assertPrivateCards(payload) {
  const { localSlot, state } = payload;
  const opponentSlot = localSlot === 0 ? 1 : 0;
  assert.equal(typeof state.players[localSlot].hand[0]?.manaCost, "number");
  assert.equal(state.players[opponentSlot].hand[0]?.concealed, true);
  assert.equal(state.players[opponentSlot].hand[0]?.manaCost, undefined);
  assert.equal(state.players[opponentSlot].deck[0]?.concealed, true);
}

const roomServer = new MultiplayerRoomServer();
const httpServer = createServer();
attachWebSocketServer(httpServer, (peer) => roomServer.connect(peer));
await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
const { port } = httpServer.address();
const first = new TestClient(`ws://127.0.0.1:${port}`);
const second = new TestClient(`ws://127.0.0.1:${port}`);

try {
  await Promise.all([first.connect(), second.connect()]);
  await Promise.all([
    first.waitFor("connection:ready"),
    second.waitFor("connection:ready"),
  ]);

  first.send("room:create", {
    roomName: "Sala de teste",
    password: "sangue",
    playerName: "Alice",
    avatarKey: "avatar1",
  });
  const created = await first.waitFor("room:joined");
  second.send("room:join", {
    roomId: created.room.id,
    password: "sangue",
    playerName: "Bruno",
    avatarKey: "avatar2",
  });

  await second.waitFor("room:joined");
  const [startFirst, startSecond] = await Promise.all([
    first.waitFor("game:started"),
    second.waitFor("game:started"),
  ]);
  assert.equal(startFirst.state.phase, "mulligan");
  assert.equal(startSecond.state.phase, "mulligan");
  assertPrivateCards(startFirst);
  assertPrivateCards(startSecond);

  first.send("game:chat", { text: "Boa partida!" });
  const chatMessages = await Promise.all([
    first.waitFor("game:chat"),
    second.waitFor("game:chat"),
  ]);
  assert(chatMessages.every(({ message }) => message.text === "Boa partida!"));
  assert(chatMessages.every(({ message }) => message.name === "Alice"));

  first.send("game:reroll");
  await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "mulligan:reroll"),
    second.waitFor("game:state", (payload) => payload.reason === "mulligan:reroll"),
  ]);
  first.send("game:confirmMulligan");
  await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "mulligan:confirm"),
    second.waitFor("game:state", (payload) => payload.reason === "mulligan:confirm"),
  ]);
  second.send("game:confirmMulligan");
  const [playingFirst, playingSecond] = await Promise.all([
    first.waitFor("game:state", (payload) => payload.state.phase === "playing"),
    second.waitFor("game:state", (payload) => payload.state.phase === "playing"),
  ]);
  assertPrivateCards(playingFirst);
  assertPrivateCards(playingSecond);

  first.send("game:rematch");
  const prematureRematch = await first.waitFor("error");
  assert.match(prematureRematch.message, /fim da partida/i);
  await first.waitFor(
    "game:state",
    (payload) => payload.reason === "error:resync",
  );

  const activeSlot = playingFirst.state.activePlayerIndex;
  const activeClient = activeSlot === 0 ? first : second;
  activeClient.send("game:pause");
  const pausedStates = await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "game:paused"),
    second.waitFor("game:state", (payload) => payload.reason === "game:paused"),
  ]);
  assert(pausedStates.every((payload) => payload.paused));
  activeClient.send("game:resume");
  await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "game:resumed"),
    second.waitFor("game:state", (payload) => payload.reason === "game:resumed"),
  ]);

  activeClient.send("game:action", {
    action: { type: "endTurn" },
    actionId: "integration-end-turn",
  });
  const turnActions = await Promise.all([
    first.waitFor("game:action", (payload) => payload.actionId === "integration-end-turn"),
    second.waitFor("game:action", (payload) => payload.actionId === "integration-end-turn"),
  ]);
  assert(turnActions.every((payload) => payload.state.activePlayerIndex !== activeSlot));

  activeClient.send("game:action", {
    action: { type: "endTurn" },
    actionId: "invalid-out-of-turn",
  });
  const invalid = await activeClient.waitFor("error");
  assert.match(invalid.message, /turno/i);
  await activeClient.waitFor(
    "game:state",
    (payload) => payload.reason === "error:resync",
  );

  activeClient.send("game:concede");
  const concedeStates = await Promise.all([
    first.waitFor(
      "game:state",
      (payload) => payload.reason === "game:conceded",
    ),
    second.waitFor(
      "game:state",
      (payload) => payload.reason === "game:conceded",
    ),
  ]);
  assert(concedeStates.every((payload) => Boolean(payload.state.winner)));

  first.send("game:restart");
  await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "game:rematchVote"),
    second.waitFor("game:state", (payload) => payload.reason === "game:rematchVote"),
  ]);
  second.send("game:restart");
  const rematches = await Promise.all([
    first.waitFor("game:started"),
    second.waitFor("game:started"),
  ]);
  assert(rematches.every((payload) => payload.state.phase === "mulligan"));

  first.send("game:concede");
  await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "game:conceded"),
    second.waitFor("game:state", (payload) => payload.reason === "game:conceded"),
  ]);
  second.send("game:rematch");
  await Promise.all([
    first.waitFor("game:state", (payload) => payload.reason === "game:rematchVote"),
    second.waitFor("game:state", (payload) => payload.reason === "game:rematchVote"),
  ]);
  first.send("room:leave");
  const declinedRematch = await second.waitFor(
    "game:state",
    (payload) => payload.reason === "rematch:declined",
  );
  assert.equal(declinedRematch.connectedPlayers[0], false);
  assert(declinedRematch.rematchVotes.includes(1));
  second.send("room:leave");
  console.log("Multiplayer verification passed");
} finally {
  first.close();
  second.close();
  await new Promise((resolve) => httpServer.close(resolve));
  roomServer.rooms.forEach((room) => roomServer.destroyRoom(room));
}
