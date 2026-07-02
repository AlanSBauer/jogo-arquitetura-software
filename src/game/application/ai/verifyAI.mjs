import assert from "node:assert/strict";
import { AIController, AI_ACTION_TYPES } from "./AIController.js";
import { AI_DIFFICULTY_PROFILES } from "../../domain/services/aiDifficulty.js";
import { buildCardInstance } from "../../domain/entities/cards.js";

  const creature = (id, attack, health, extra = {}) => ({
    id,
    instanceId: id,
    name: id,
    type: "creature",
    manaCost: 1,
    attack,
    baseHealth: health,
    currentHealth: health,
    summoningSick: false,
    exhausted: false,
    ...extra,
  });
  const spell = (id, manaCost, damage = 0, extra = {}) => ({
    id,
    instanceId: id,
    name: id,
    type: "spell",
    manaCost,
    damage,
    ...extra,
  });
  const player = (id, overrides = {}) => ({
    id,
    name: id,
    health: 50,
    maxHealth: 50,
    mana: 3,
    maxMana: 3,
    fatigueDamage: 0,
    hasDrawnThisTurn: true,
    deck: [],
    hand: [],
    board: [],
    graveyard: [],
    ...overrides,
  });
  const state = (playerOne, playerTwo) => ({
    phase: "playing",
    turn: 4,
    activePlayerIndex: 1,
    winner: null,
    winnerId: null,
    logs: [],
    config: { maxMana: 10, maxBoardSize: 5, maxHandSize: 6 },
    players: [playerOne, playerTwo],
  });

  const hardAI = new AIController({ difficulty: "hard", rng: () => 0 });
  const lethalState = state(
    player("p1", { health: 8 }),
    player("p2", {
      mana: 3,
      hand: [spell("finisher", 3, 5)],
      board: [creature("attacker", 3, 4)],
    }),
  );
  const lethal = hardAI.findLethal(lethalState, 1);
  assert.ok(lethal, "Hard AI should find combined lethal damage");
  assert.equal(lethal.sequence.length, 2);
  let resolvedLethal = lethalState;
  lethal.sequence.forEach((action) => {
    resolvedLethal = hardAI.moveSimulator.simulate(resolvedLethal, action);
  });
  assert.equal(resolvedLethal.winnerId, "p2");

  const fullBoard = Array.from({ length: 5 }, (_item, index) =>
    creature(`ally-${index}`, 1, 1),
  );
  const playableState = state(
    player("p1"),
    player("p2", {
      hand: [
        creature("blocked-creature", 2, 2, { manaCost: 2 }),
        spell("playable-spell", 3, 2),
        spell("expensive-spell", 5, 6),
      ],
      board: fullBoard,
    }),
  );
  assert.deepEqual(
    hardAI.getPlayableCards(playableState, 1).map(({ card }) => card.id),
    ["playable-spell"],
  );

  const goodTradeState = state(
    player("p1", { board: [creature("danger", 6, 4)] }),
    player("p2", { board: [creature("trader", 4, 7)] }),
  );
  const mediumAI = new AIController({ difficulty: "medium", rng: () => 0.5 });
  const tradeDecision = mediumAI.getBestMove(goodTradeState, 1);
  assert.equal(tradeDecision.action.type, AI_ACTION_TYPES.ATTACK_CREATURE);

  const badTrade = hardAI.simulateTrade(
    creature("small", 2, 2),
    creature("large", 8, 8),
  );
  assert.equal(badTrade.attackerDies, true);
  assert.equal(badTrade.targetDies, false);
  assert.ok(badTrade.value < 0);

  const fullHealthChoice = hardAI.getBestMove(
    state(
      player("p1"),
      player("p2", {
        mana: 3,
        hand: [
          spell("heal-at-full", 2, 0, { onPlayHeal: 6 }),
          spell("useful-damage", 2, 4),
        ],
      }),
    ),
    1,
  );
  assert.equal(fullHealthChoice.action.cardId, "useful-damage");

  const lowHealthChoice = hardAI.getBestMove(
    state(
      player("p1", { health: 40 }),
      player("p2", {
        health: 9,
        mana: 3,
        hand: [
          spell("needed-heal", 2, 0, { onPlayHeal: 8 }),
          spell("minor-damage", 2, 2),
        ],
      }),
    ),
    1,
  );
  assert.equal(lowHealthChoice.action.cardId, "needed-heal");

  assert.ok(
    AI_DIFFICULTY_PROFILES.easy.searchDepth <
      AI_DIFFICULTY_PROFILES.medium.searchDepth,
  );
  assert.ok(
    AI_DIFFICULTY_PROFILES.medium.searchDepth <
      AI_DIFFICULTY_PROFILES.hard.searchDepth,
  );
  assert.equal(AI_DIFFICULTY_PROFILES.easy.opponentLookaheadDepth, 0);
  assert.equal(AI_DIFFICULTY_PROFILES.medium.opponentLookaheadDepth, 0);
  assert.ok(AI_DIFFICULTY_PROFILES.hard.opponentLookaheadDepth > 0);
  assert.ok(AI_DIFFICULTY_PROFILES.easy.randomMoveChance > 0);
  assert.ok(AI_DIFFICULTY_PROFILES.medium.randomMoveChance > 0);
  assert.ok(
    AI_DIFFICULTY_PROFILES.medium.randomMoveChance <
      AI_DIFFICULTY_PROFILES.easy.randomMoveChance,
  );
  assert.equal(AI_DIFFICULTY_PROFILES.hard.randomMoveChance, 0);
  assert.ok(
    AI_DIFFICULTY_PROFILES.easy.mistakeChance >
      AI_DIFFICULTY_PROFILES.medium.mistakeChance,
  );
  assert.ok(
    AI_DIFFICULTY_PROFILES.medium.mistakeChance >
      AI_DIFFICULTY_PROFILES.hard.mistakeChance,
  );
  assert.ok(AI_DIFFICULTY_PROFILES.hard.mistakeChance > 0);
  assert.ok(
    AI_DIFFICULTY_PROFILES.easy.attackWeight <
      AI_DIFFICULTY_PROFILES.medium.attackWeight,
  );

  for (const difficulty of ["easy", "medium", "hard"]) {
    const ai = new AIController({ difficulty, rng: () => 0.1 });
    const tauntState = state(
      player("p1", {
        board: [
          creature("player-normal", 2, 8),
          creature("player-taunt", 2, 8, { taunt: true }),
        ],
      }),
      player("p2", {
        mana: 2,
        hand: [buildCardInstance("carta62", `ai-target-${difficulty}`)],
        board: [creature("ai-attacker", 2, 3)],
      }),
    );
    const generated = ai.moveGenerator.generate(tauntState, 1);
    assert.equal(
      generated.some((action) => action.type === AI_ACTION_TYPES.ATTACK_FACE),
      false,
    );
    assert.equal(
      generated
        .filter((action) => action.type === AI_ACTION_TYPES.ATTACK_CREATURE)
        .every((action) => action.targetIndex === 1),
      true,
    );
    const targetedActions = generated.filter(
      (action) =>
        action.type === AI_ACTION_TYPES.PLAY_CARD && action.cardId === "carta62",
    );
    assert.equal(targetedActions.length, 1);
    assert.equal(targetedActions[0].targetIndex, 1);
  }

  const furyLethal = hardAI.findLethal(
    state(
      player("p1", { health: 3 }),
      player("p2", {
        mana: 2,
        hand: [buildCardInstance("carta45", "fury-lethal")],
      }),
    ),
    1,
  );
  assert.equal(furyLethal.sequence[0].type, AI_ACTION_TYPES.PLAY_CARD);
  assert.equal(furyLethal.sequence[1].type, AI_ACTION_TYPES.ATTACK_FACE);

  const crowdedState = state(
    player("p1", {
      board: Array.from({ length: 5 }, (_item, index) =>
        creature(`enemy-${index}`, 4 + index, 4 + index),
      ),
    }),
    player("p2", {
      health: 42,
      mana: 10,
      maxMana: 10,
      hand: Array.from({ length: 6 }, (_item, index) =>
        spell(`spell-${index}`, 1 + (index % 2), 2 + (index % 3)),
      ),
      board: Array.from({ length: 5 }, (_item, index) =>
        creature(`ready-${index}`, 3 + index, 5 + index),
      ),
    }),
  );
  const searchStartedAt = Date.now();
  const crowdedDecision = hardAI.getBestMove(crowdedState, 1);
  const searchDuration = Date.now() - searchStartedAt;
  assert.ok(crowdedDecision.action, "Hard AI should return an action");
  assert.ok(crowdedDecision.opponentReplyScore >= 0);
  assert.ok(
    searchDuration < 2000,
    `Hard AI search took too long: ${searchDuration}ms`,
  );

  console.log(`AI verification passed (${searchDuration}ms crowded search)`);
