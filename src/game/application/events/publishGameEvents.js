import { GAME_EVENTS } from "../../domain/events/gameEvents.js";

function publish(eventBus, type, payload) {
  eventBus?.emit(type, payload);
}

function getPlayedCard(beforeState, action) {
  if (action.type !== "playCard") return null;
  const actorIndex = action.playerIndex ?? beforeState.activePlayerIndex;
  return beforeState.players[actorIndex]?.hand[action.handIndex] ?? null;
}

function publishPlayerChanges(eventBus, beforeState, nextState, action) {
  nextState.players.forEach((player, playerIndex) => {
    const previousPlayer = beforeState.players[playerIndex];
    if (!previousPlayer) return;

    if (player.health < previousPlayer.health) {
      publish(eventBus, GAME_EVENTS.PLAYER_DAMAGED, {
        playerIndex,
        playerId: player.id,
        amount: previousPlayer.health - player.health,
        health: player.health,
        source: action.type,
        fatigueDamage: player.fatigueDamage ?? 0,
      });
    } else if (player.health > previousPlayer.health) {
      publish(eventBus, GAME_EVENTS.PLAYER_HEALED, {
        playerIndex,
        playerId: player.id,
        amount: player.health - previousPlayer.health,
        health: player.health,
        source: action.type,
      });
    }

    if (player.mana !== previousPlayer.mana) {
      publish(eventBus, GAME_EVENTS.MANA_CHANGED, {
        playerIndex,
        playerId: player.id,
        previousMana: previousPlayer.mana,
        mana: player.mana,
        maxMana: player.maxMana,
        source: action.type,
      });
    }

    const cardsDrawn = Math.max(0, previousPlayer.deck.length - player.deck.length);
    for (let index = 0; index < cardsDrawn; index += 1) {
      const card = previousPlayer.deck[index];
      publish(eventBus, GAME_EVENTS.CARD_DRAWN, {
        playerIndex,
        playerId: player.id,
        cardId: card?.id ?? null,
        instanceId: card?.instanceId ?? null,
        destination: player.hand.some(
          (handCard) => handCard.instanceId === card?.instanceId,
        )
          ? "hand"
          : "graveyard",
        source: action.type,
      });
    }
  });
}

export function publishGameEvents(
  eventBus,
  beforeState,
  nextState,
  action = { type: "unknown" },
) {
  if (!eventBus || !nextState) return;

  if (!beforeState) {
    publish(eventBus, GAME_EVENTS.GAME_STARTED, {
      state: nextState,
      activePlayerIndex: nextState.activePlayerIndex,
    });
    publish(eventBus, GAME_EVENTS.HUD_UPDATED, { state: nextState });
    return;
  }

  if (action.type === "startGame" || (beforeState.winner && !nextState.winner)) {
    publish(eventBus, GAME_EVENTS.GAME_STARTED, {
      state: nextState,
      activePlayerIndex: nextState.activePlayerIndex,
    });
  }

  if (nextState === beforeState) return;

  const playedCard = getPlayedCard(beforeState, action);
  if (
    playedCard &&
    !nextState.players[action.playerIndex ?? beforeState.activePlayerIndex]?.hand.some(
      (card) => card.instanceId === playedCard.instanceId,
    )
  ) {
    publish(eventBus, GAME_EVENTS.CARD_PLAYED, {
      playerIndex: action.playerIndex ?? beforeState.activePlayerIndex,
      card: playedCard,
      handIndex: action.handIndex,
      targetIndex: action.targetIndex ?? null,
    });
  }

  if (action.type === "attackFace" || action.type === "attackCreature") {
    publish(eventBus, GAME_EVENTS.CREATURE_ATTACKED, {
      playerIndex: action.playerIndex ?? beforeState.activePlayerIndex,
      boardIndex: action.boardIndex,
      targetIndex: action.targetIndex ?? null,
      targetType: action.type === "attackFace" ? "hero" : "creature",
    });
  }

  if (action.type === "endTurn") {
    publish(eventBus, GAME_EVENTS.TURN_ENDED, {
      previousPlayerIndex: beforeState.activePlayerIndex,
      activePlayerIndex: nextState.activePlayerIndex,
      turn: nextState.turn,
    });
  }

  publishPlayerChanges(eventBus, beforeState, nextState, action);

  if (!beforeState.winner && nextState.winner) {
    publish(eventBus, GAME_EVENTS.GAME_OVER, {
      winner: nextState.winner,
      winnerId: nextState.winnerId,
      state: nextState,
    });
  }

  publish(eventBus, GAME_EVENTS.HUD_UPDATED, {
    state: nextState,
    action: action.type,
  });
}
