import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_EVENTS } from "../domain/events/gameEvents.js";
import { EventBus } from "../../shared/events/EventBus.js";
import { createGameUseCases } from "./useCases/gameUseCases.js";
import {
  receiveChatMessage,
  sendChatMessage,
} from "./useCases/chatUseCases.js";

const SRC_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listJavaScriptFiles(path) : [path];
    }),
  );
  return nestedFiles
    .flat()
    .filter((path) => [".js", ".jsx"].includes(extname(path)));
}

async function assertLayerBoundaries() {
  const boundaries = [
    {
      root: join(SRC_ROOT, "game", "domain"),
      forbidden: ["/application/", "/infrastructure/", "/presentation/", "/app/"],
    },
    {
      root: join(SRC_ROOT, "game", "application"),
      forbidden: ["/infrastructure/", "/presentation/", "/app/"],
    },
    {
      root: join(SRC_ROOT, "presentation"),
      forbidden: ["/infrastructure/"],
    },
  ];

  for (const boundary of boundaries) {
    const files = await listJavaScriptFiles(boundary.root);
    for (const file of files) {
      const source = (await readFile(file, "utf8")).replaceAll("\\", "/");
      boundary.forbidden.forEach((segment) => {
        assert.equal(
          source.includes(segment),
          false,
          `${relative(SRC_ROOT, file)} viola a camada ao importar ${segment}`,
        );
      });
    }
  }
}

function assertGameEvents() {
  const eventBus = new EventBus();
  const receivedEvents = [];
  eventBus.on("*", (event) => receivedEvents.push(event));
  const useCases = createGameUseCases({ eventBus });

  const state = useCases.startGame({ startingPlayerIndex: 0 });
  const finishedState = useCases.concede(state, 0);

  assert.equal(finishedState.winnerId, state.players[1].id);
  assert.ok(
    receivedEvents.some((event) => event.type === GAME_EVENTS.GAME_STARTED),
  );
  assert.ok(
    receivedEvents.some((event) => event.type === GAME_EVENTS.GAME_OVER),
  );
  assert.ok(
    receivedEvents.some((event) => event.type === GAME_EVENTS.HUD_UPDATED),
  );
}

function assertChatEvents() {
  const eventBus = new EventBus();
  const receivedEvents = [];
  eventBus.on("*", (event) => receivedEvents.push(event));

  const sent = sendChatMessage({
    eventBus,
    text: "  Ola, arena!  ",
    transport: (type, payload) =>
      type === "game:chat" && payload.text === "Ola, arena!",
  });
  receiveChatMessage({
    eventBus,
    message: { id: "message-1", text: "Resposta" },
  });

  assert.equal(sent, true);
  assert.ok(
    receivedEvents.some(
      (event) => event.type === GAME_EVENTS.CHAT_MESSAGE_SENT,
    ),
  );
  assert.ok(
    receivedEvents.some(
      (event) => event.type === GAME_EVENTS.CHAT_MESSAGE_RECEIVED,
    ),
  );
}

await assertLayerBoundaries();
assertGameEvents();
assertChatEvents();

console.log("Arquitetura, EventBus e casos de uso verificados com sucesso.");
