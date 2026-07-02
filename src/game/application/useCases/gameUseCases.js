import { createInitialGameState } from "../../domain/entities/gameState.js";
import {
  attackCreatureAction,
  attackFaceAction,
  confirmMulliganAction,
  confirmMultiplayerMulliganAction,
  drawCardAction,
  endTurnAction,
  playCardAction,
  rerollMulliganAction,
} from "../../domain/rules/gameRules.js";
import { publishGameEvents } from "../events/publishGameEvents.js";

function execute(eventBus, state, action, reducer) {
  const nextState = reducer(state);
  publishGameEvents(eventBus, state, nextState, action);
  return nextState;
}

export function createGameUseCases({ eventBus = null } = {}) {
  return {
    startGame(config = {}) {
      const nextState = createInitialGameState(config);
      publishGameEvents(eventBus, null, nextState, { type: "startGame" });
      return nextState;
    },

    playCard(state, handIndex, targetIndex = null, playerIndex = null) {
      return execute(
        eventBus,
        state,
        { type: "playCard", handIndex, targetIndex, playerIndex },
        (currentState) => playCardAction(currentState, handIndex, targetIndex),
      );
    },

    attackFace(state, boardIndex, playerIndex = null) {
      return execute(
        eventBus,
        state,
        { type: "attackFace", boardIndex, playerIndex },
        (currentState) => attackFaceAction(currentState, boardIndex),
      );
    },

    attackCreature(state, boardIndex, targetIndex, playerIndex = null) {
      return execute(
        eventBus,
        state,
        { type: "attackCreature", boardIndex, targetIndex, playerIndex },
        (currentState) =>
          attackCreatureAction(currentState, boardIndex, targetIndex),
      );
    },

    drawCard(state, playerIndex = null) {
      return execute(
        eventBus,
        state,
        { type: "drawCard", playerIndex },
        drawCardAction,
      );
    },

    endTurn(state, playerIndex = null) {
      return execute(
        eventBus,
        state,
        { type: "endTurn", playerIndex },
        endTurnAction,
      );
    },

    rerollMulligan(state, playerIndex = 0) {
      return execute(
        eventBus,
        state,
        { type: "rerollMulligan", playerIndex },
        (currentState) => rerollMulliganAction(currentState, playerIndex),
      );
    },

    confirmMulligan(state) {
      return execute(
        eventBus,
        state,
        { type: "confirmMulligan" },
        confirmMulliganAction,
      );
    },

    confirmMultiplayerMulligan(state, playerIndex, options = {}) {
      return execute(
        eventBus,
        state,
        { type: "confirmMulligan", playerIndex },
        (currentState) =>
          confirmMultiplayerMulliganAction(
            currentState,
            playerIndex,
            options,
          ),
      );
    },

    concede(state, playerIndex = 0) {
      return execute(
        eventBus,
        state,
        { type: "concede", playerIndex },
        (currentState) => {
          const loser = currentState.players[playerIndex];
          const winner = currentState.players[playerIndex === 0 ? 1 : 0];
          if (!loser || !winner || currentState.winner) return currentState;
          return {
            ...currentState,
            winner: winner.name,
            winnerId: winner.id,
            logs: [
              `${loser.name} desistiu. ${winner.name} venceu a partida.`,
              ...currentState.logs,
            ].slice(0, 12),
          };
        },
      );
    },
  };
}

export const gameUseCases = createGameUseCases();
