import assert from "node:assert/strict";
import { CARD_LIBRARY, buildCardInstance } from "../entities/cards.js";
import { DECK_DEFINITIONS, DECK_SIZE } from "../entities/decks.js";
import {
  attackCreatureAction,
  attackFaceAction,
  drawCardAction,
  endTurnAction,
  playCardAction,
  rerollMulliganAction,
} from "./gameRules.js";

Object.values(DECK_DEFINITIONS).forEach((deck) => {
  assert.equal(deck.cardIds.length, DECK_SIZE, `${deck.name} deve ter 30 cartas`);
  assert.equal(
    new Set(deck.cardIds).size,
    DECK_SIZE,
    `${deck.name} não deve repetir cartas`,
  );
  const cards = deck.cardIds.map((cardId) => CARD_LIBRARY[cardId]);
  assert(cards.every(Boolean), `${deck.name} contém uma carta desconhecida`);
  const creatureCount = cards.filter((card) => card.type === "creature").length;
  const spellCount = cards.filter((card) => card.type === "spell").length;
  assert(
    creatureCount >= 18,
    `${deck.name} precisa ter criaturas suficientes para disputar o tabuleiro`,
  );
  assert(
    spellCount <= 12,
    `${deck.name} não pode depender demais de magias`,
  );
  assert(cards.some((card) => card.onPlayMana), `${deck.name} precisa recuperar mana`);
  assert(cards.some((card) => card.onPlayHeal), `${deck.name} precisa recuperar vida`);
  assert(
    cards.some((card) => card.damage || card.onPlayDamage),
    `${deck.name} precisa causar dano direto`,
  );
  assert.equal(cards.filter((card) => card.fury).length, 1);
  assert.equal(cards.filter((card) => card.taunt).length, 1);
  assert.equal(cards.filter((card) => card.enemyBoardDamage).length, 1);
  assert.equal(cards.filter((card) => card.targetType === "enemyCreature").length, 1);
});

const numberedCardIds = Array.from(
  { length: 64 },
  (_item, index) => `carta${index + 1}`,
);
const cardUsage = new Map(numberedCardIds.map((cardId) => [cardId, 0]));
Object.values(DECK_DEFINITIONS).forEach((deck) => {
  deck.cardIds.forEach((cardId) => {
    if (cardUsage.has(cardId)) {
      cardUsage.set(cardId, cardUsage.get(cardId) + 1);
    }
  });
});
assert.deepEqual(
  [...cardUsage.entries()]
    .filter(([, usage]) => usage === 0)
    .map(([cardId]) => cardId),
  [],
  "Todas as 64 cartas numeradas devem aparecer em ao menos um deck",
);
assert(
  [...cardUsage.values()].filter((usage) => usage === 4).length <= 5,
  "Poucas cartas devem ser comuns aos quatro decks",
);

function creature(instanceId, overrides = {}) {
  return {
    id: instanceId,
    instanceId,
    name: instanceId,
    type: "creature",
    manaCost: 1,
    attack: 2,
    baseHealth: 3,
    currentHealth: 3,
    summoningSick: false,
    exhausted: false,
    ...overrides,
  };
}

function player(id, overrides = {}) {
  return {
    id,
    name: id,
    health: 50,
    maxHealth: 50,
    mana: 10,
    maxMana: 10,
    pendingManaPenalty: 0,
    lastManaPenaltyApplied: 0,
    fatigueDamage: 0,
    deck: [],
    hand: [],
    board: [],
    graveyard: [],
    hasDrawnThisTurn: true,
    ...overrides,
  };
}

function state(first, second, activePlayerIndex = 0) {
  return {
    phase: "playing",
    turn: 3,
    activePlayerIndex,
    winner: null,
    winnerId: null,
    logs: [],
    config: {
      maxMana: 10,
      maxBoardSize: 5,
      maxHandSize: 6,
      aiDifficulty: "hard",
    },
    players: [first, second],
  };
}

numberedCardIds.forEach((cardId, cardIndex) => {
  const card = buildCardInstance(cardId, `audit-${cardId}`);
  const directDamage = Math.max(0, card.onPlayDamage ?? card.damage ?? 0);
  const areaDamage = Math.max(0, card.enemyBoardDamage ?? 0);
  const targetDamage = Math.max(0, card.targetCreatureDamage ?? 0);
  const text = card.text ?? "";

  if (/dano ao (heroi inimigo|seu oponente)/i.test(text)) {
    assert(directDamage > 0, `${card.name} descreve dano direto sem efeito`);
  }
  if (/todas as criaturas inimigas/i.test(text)) {
    assert(areaDamage > 0, `${card.name} descreve dano em area sem efeito`);
  }
  if (/uma criatura inimiga/i.test(text)) {
    assert.equal(card.targetType, "enemyCreature", `${card.name} precisa de alvo`);
    assert(
      targetDamage > 0 || card.destroyTargetCreature,
      `${card.name} descreve remocao sem efeito`,
    );
  }
  if (/(cura|recupere).*Vida/i.test(text)) {
    assert((card.onPlayHeal ?? 0) > 0, `${card.name} descreve cura sem efeito`);
  }
  if (/restaura.*Mana/i.test(text)) {
    assert((card.onPlayMana ?? 0) > 0, `${card.name} descreve mana sem efeito`);
  }
  if (/compre 1 carta/i.test(text)) {
    assert.equal(card.onPlayDraw, 1, `${card.name} descreve compra sem efeito`);
  }
  if (/descarta 1 carta/i.test(text)) {
    assert.equal(card.onPlayDiscard, 1, `${card.name} descreve descarte sem efeito`);
  }
  if (/Furia/i.test(text)) assert.equal(card.fury, true, `${card.name} sem Furia`);
  if (/Provocar/i.test(text)) assert.equal(card.taunt, true, `${card.name} sem Provocar`);
  if (/perde 1 de Mana/i.test(text)) {
    assert.equal(
      card.onHeroAttackManaPenalty,
      1,
      `${card.name} descreve penalidade sem efeito`,
    );
  }

  const drawFodder = buildCardInstance(
    "carta37",
    `audit-draw-${cardIndex}`,
  );
  const discardFodder = buildCardInstance(
    "carta38",
    `audit-discard-${cardIndex}`,
  );
  const target = creature(`audit-target-${cardIndex}`, {
    currentHealth: 20,
    baseHealth: 20,
  });
  const secondTarget = creature(`audit-second-${cardIndex}`, {
    currentHealth: 20,
    baseHealth: 20,
  });
  const before = state(
    player("p1", {
      health: 20,
      mana: card.manaCost,
      maxMana: 10,
      hand: [card, discardFodder],
      deck: [drawFodder],
    }),
    player("p2", { board: [target, secondTarget] }),
  );
  const after = playCardAction(
    before,
    0,
    card.targetType === "enemyCreature" ? 0 : null,
  );

  assert.equal(
    after.players[1].health,
    50 - directDamage,
    `${card.name} aplicou dano direto incorreto`,
  );
  assert.equal(
    after.players[0].health,
    Math.min(50, 20 + (card.onPlayHeal ?? 0)),
    `${card.name} aplicou cura incorreta`,
  );
  assert.equal(
    after.players[0].mana,
    Math.min(10, card.onPlayMana ?? 0),
    `${card.name} restaurou Mana incorretamente`,
  );
  assert.equal(
    after.players[0].deck.length,
    1 - (card.onPlayDraw ?? 0),
    `${card.name} comprou uma quantidade incorreta`,
  );

  if (areaDamage > 0) {
    assert.deepEqual(
      after.players[1].board.map((boardCard) => boardCard.currentHealth),
      [20 - areaDamage, 20 - areaDamage],
      `${card.name} aplicou dano em area incorreto`,
    );
  } else if (card.targetType === "enemyCreature") {
    if (card.destroyTargetCreature) {
      assert.equal(after.players[1].board.length, 1, `${card.name} nao destruiu o alvo`);
      assert.equal(
        after.players[1].board[0].instanceId,
        secondTarget.instanceId,
        `${card.name} destruiu a criatura errada`,
      );
    } else {
      assert.equal(
        after.players[1].board[0].currentHealth,
        20 - targetDamage,
        `${card.name} aplicou dano incorreto ao alvo`,
      );
    }
  }

  if (card.type === "creature") {
    assert(
      after.players[0].board.some((boardCard) => boardCard.instanceId === card.instanceId),
      `${card.name} nao entrou no tabuleiro`,
    );
  } else {
    assert(
      after.players[0].graveyard.some(
        (graveyardCard) => graveyardCard.instanceId === card.instanceId,
      ),
      `${card.name} nao foi para o descarte`,
    );
  }
});

const attacker = creature("attacker", { attack: 4, currentHealth: 5 });
const taunt = creature("taunt", { taunt: true, currentHealth: 6 });
const otherTarget = creature("other", { currentHealth: 6 });
const guardedState = state(
  player("p1", { board: [attacker] }),
  player("p2", { board: [otherTarget, taunt] }),
);

const blockedFaceAttack = attackFaceAction(guardedState, 0);
assert.equal(blockedFaceAttack.players[1].health, 50);
assert.match(blockedFaceAttack.logs[0], /Provocar/i);
const blockedCreatureAttack = attackCreatureAction(guardedState, 0, 0);
assert.equal(
  blockedCreatureAttack.players[1].board[0].currentHealth,
  6,
);
assert.match(blockedCreatureAttack.logs[0], /Provocar/i);
assert.equal(
  attackCreatureAction(guardedState, 0, 1).players[1].board[1].currentHealth,
  2,
);

const furyCard = buildCardInstance("carta45", "fury-instance");
const furyState = playCardAction(
  state(player("p1", { hand: [furyCard] }), player("p2")),
  0,
);
assert.equal(furyState.players[0].board[0].summoningSick, false);
assert.equal(furyState.players[0].board[0].exhausted, false);

const warlock = creature("warlock", { onHeroAttackManaPenalty: 1 });
const manaPressureState = attackFaceAction(
  state(
    player("p1", { board: [warlock], maxMana: 4, mana: 4 }),
    player("p2", { maxMana: 4, mana: 4, deck: [furyCard] }),
  ),
  0,
);
assert.equal(manaPressureState.players[1].pendingManaPenalty, 1);
const penalizedTurn = endTurnAction(manaPressureState);
assert.equal(penalizedTurn.players[1].maxMana, 5);
assert.equal(penalizedTurn.players[1].mana, 4);
assert.equal(penalizedTurn.players[1].lastManaPenaltyApplied, 1);

const areaSpell = buildCardInstance("carta57", "area-instance");
const areaState = playCardAction(
  state(
    player("p1", { hand: [areaSpell], mana: 3 }),
    player("p2", {
      board: [
        creature("area-a", { currentHealth: 1 }),
        creature("area-b", { currentHealth: 4 }),
      ],
    }),
  ),
  0,
);
assert.equal(areaState.players[1].board.length, 1);
assert.equal(areaState.players[1].board[0].currentHealth, 3);
assert.equal(areaState.players[1].graveyard[0].instanceId, "area-a");

const targetedSpell = buildCardInstance("carta62", "target-instance");
const missingTargetState = playCardAction(
  state(
    player("p1", { hand: [targetedSpell], mana: 2 }),
    player("p2", { board: [creature("target-a"), creature("target-b")] }),
  ),
  0,
);
assert.equal(missingTargetState.players[0].hand.length, 1);
assert.equal(missingTargetState.players[0].mana, 2);
const targetedState = playCardAction(missingTargetState, 0, 1);
assert.equal(targetedState.players[1].board.length, 1);
assert.equal(targetedState.players[1].board[0].instanceId, "target-a");

const protectedTargetSpell = buildCardInstance("carta62", "protected-target");
const protectedTargetState = state(
  player("p1", { hand: [protectedTargetSpell], mana: 2 }),
  player("p2", {
    board: [
      creature("protected-creature"),
      creature("spell-taunt", { taunt: true }),
    ],
  }),
);
const rejectedProtectedTarget = playCardAction(protectedTargetState, 0, 0);
assert.equal(rejectedProtectedTarget.players[0].hand.length, 1);
assert.equal(rejectedProtectedTarget.players[0].mana, 2);
const acceptedTauntTarget = playCardAction(protectedTargetState, 0, 1);
assert.equal(acceptedTauntTarget.players[0].hand.length, 0);
assert.equal(acceptedTauntTarget.players[1].board.length, 1);
assert.equal(
  acceptedTauntTarget.players[1].graveyard[0].instanceId,
  "spell-taunt",
);

const firstFatigue = drawCardAction(
  state(
    player("p1", {
      health: 3,
      fatigueDamage: 0,
      hasDrawnThisTurn: false,
    }),
    player("p2"),
  ),
);
assert.equal(firstFatigue.players[0].fatigueDamage, 1);
assert.equal(firstFatigue.players[0].health, 2);
assert.match(firstFatigue.logs[0], /1 de dano por fadiga/i);

const secondFatigue = drawCardAction({
  ...firstFatigue,
  players: firstFatigue.players.map((currentPlayer, playerIndex) => ({
    ...currentPlayer,
    hasDrawnThisTurn: playerIndex === 0 ? false : currentPlayer.hasDrawnThisTurn,
  })),
});
assert.equal(secondFatigue.players[0].fatigueDamage, 2);
assert.equal(secondFatigue.players[0].health, 0);
assert.equal(secondFatigue.winnerId, "p2");

assert.equal(CARD_LIBRARY.carta64.targetCreatureDamage, 4);
const mulliganState = { ...guardedState, phase: "mulligan" };
assert.equal(rerollMulliganAction(mulliganState, 99), mulliganState);
console.log("Card rules verification passed");
