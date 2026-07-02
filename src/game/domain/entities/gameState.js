import {
  createStarterDeck,
  getDeckIdForAvatar,
} from "./decks.js";
import { normalizeAiDifficulty } from "../services/aiDifficulty.js";

const STARTING_HEALTH = 50;
const STARTING_HAND_SIZE = 4;
const MAX_MANA = 10;
const MAX_BOARD_SIZE = 5;
const MAX_HAND_SIZE = 6;

/**
 * Cria a estrutura basica de um jogador antes da compra inicial.
 */
function createPlayer(id, name, avatarKey, requestedDeckId = null) {
  const deckId = requestedDeckId ?? getDeckIdForAvatar(avatarKey);

  return {
    id,
    name,
    avatarKey,
    deckId,
    health: STARTING_HEALTH,
    maxHealth: STARTING_HEALTH,
    mana: 1,
    maxMana: 1,
    fatigueDamage: 0,
    pendingManaPenalty: 0,
    lastManaPenaltyApplied: 0,
    hasDrawnThisTurn: false,
    mulliganUsed: false,
    mulliganConfirmed: false,
    deck: createStarterDeck(id, deckId),
    hand: [],
    board: [],
    graveyard: [],
  };
}

/**
 * Compra uma carta do topo do baralho.
 */
function drawOneCard(player) {
  if (player.deck.length === 0) {
    return null;
  }

  const [drawnCard, ...remainingDeck] = player.deck;
  player.deck = remainingDeck;
  player.hand.push(drawnCard);
  return drawnCard;
}

/**
 * A mao inicial define quantas cartas aparecem logo no comeco da partida.
 */
function drawStartingHand(player) {
  for (let index = 0; index < STARTING_HAND_SIZE; index += 1) {
    drawOneCard(player);
  }
}

/**
 * Monta o estado inicial consumido pelo motor e pela cena Phaser.
 */
export function createInitialGameState({
  playerName = "Jogador",
  playerAvatarKey = "avatar1",
  playerDeckId = null,
  enemyName = "Inimigo",
  enemyAvatarKey = "avatar2",
  enemyDeckId = null,
  enemyDifficulty = "medium",
  gameMode = "singleplayer",
  startingPlayerIndex = null,
} = {}) {
  const playerOne = createPlayer(
    "p1",
    playerName,
    playerAvatarKey,
    playerDeckId,
  );
  const playerTwo = createPlayer(
    "p2",
    enemyName,
    enemyAvatarKey,
    enemyDeckId,
  );

  drawStartingHand(playerOne);
  drawStartingHand(playerTwo);
  const activePlayerIndex =
    startingPlayerIndex === 0 || startingPlayerIndex === 1
      ? startingPlayerIndex
      : Math.random() < 0.5
        ? 0
        : 1;
  const startingPlayer = activePlayerIndex === 0 ? playerOne : playerTwo;

  return {
    phase: "mulligan",
    turn: 1,
    activePlayerIndex,
    winner: null,
    winnerId: null,
    logs: [
      `${startingPlayer.name} foi sorteado para começar.`,
      "Escolha as cartas iniciais que deseja trocar.",
    ],
    config: {
      maxMana: MAX_MANA,
      maxBoardSize: MAX_BOARD_SIZE,
      maxHandSize: MAX_HAND_SIZE,
      aiDifficulty: normalizeAiDifficulty(enemyDifficulty),
      gameMode,
      playerDeckId: playerOne.deckId,
      enemyDeckId: playerTwo.deckId,
    },
    players: [playerOne, playerTwo],
  };
}
