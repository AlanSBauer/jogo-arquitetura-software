import { AI_ACTION_TYPES } from "./MoveGenerator.js";

function getActivePlayer(state) {
  return state.players[state.activePlayerIndex];
}

function getPlayedCard(before, action) {
  if (action.type !== AI_ACTION_TYPES.PLAY_CARD) {
    return null;
  }

  return getActivePlayer(before).hand[action.handIndex] ?? null;
}

function getAttackingCard(before, action) {
  if (
    action.type !== AI_ACTION_TYPES.ATTACK_FACE &&
    action.type !== AI_ACTION_TYPES.ATTACK_CREATURE
  ) {
    return null;
  }

  return getActivePlayer(before).board[action.boardIndex] ?? null;
}

function getCreatureValue(card) {
  if (!card) {
    return 0;
  }

  const attack = Math.max(0, card.attack ?? 0);
  const health = Math.max(0, card.currentHealth ?? card.baseHealth ?? 0);
  const keywordValue =
    (card.taunt ? health * 0.75 + 5 : 0) +
    (card.fury ? attack * 1.25 + 3 : 0) +
    (card.onHeroAttackManaPenalty ? attack * 0.35 + 4 : 0);
  return (
    attack * 3.4 +
    health * 1.7 +
    Math.max(0, attack - health) * 0.45 +
    keywordValue
  );
}

export class MoveScorer {
  constructor(boardEvaluator) {
    this.boardEvaluator = boardEvaluator;
  }

  scoreSequence(
    initialState,
    sequence,
    finalState,
    playerIndex,
    context,
    steps = [],
  ) {
    const startScore = this.boardEvaluator.evaluate(
      initialState,
      playerIndex,
    ).score;
    const finalScore = this.boardEvaluator.evaluate(finalState, playerIndex).score;
    const actionScore = steps.reduce((total, step, index) => {
      const decay = 1 - index * 0.08;
      return (
        total +
        this.scoreAction(step.action, step.before, playerIndex, context) * decay
      );
    }, 0);

    const sequenceBonus = sequence.length > 1 ? Math.min(4, sequence.length) : 0;

    return finalScore - startScore + actionScore + sequenceBonus;
  }

  scoreAction(action, before, playerIndex, context) {
    const player = before.players[playerIndex];
    const opponent = before.players[playerIndex === 0 ? 1 : 0];

    switch (action.type) {
      case AI_ACTION_TYPES.PLAY_CARD:
        return this.scorePlayCard(before, action, player, context);
      case AI_ACTION_TYPES.ATTACK_FACE:
        return this.scoreAttack(before, action, opponent, context);
      case AI_ACTION_TYPES.ATTACK_CREATURE:
        return this.scoreCreatureAttack(before, action, opponent, context);
      case AI_ACTION_TYPES.END_TURN:
        return this.scoreEndTurn(before, player, context);
      default:
        return 0;
    }
  }

  scorePlayCard(before, action, player, context) {
    const card = getPlayedCard(before, action);

    if (!card) {
      return -30;
    }

    const opponent = before.players[player.id === "p1" ? 1 : 0];
    const damage = card.damage ?? card.onPlayDamage ?? 0;
    const boardDamage = Math.max(0, card.enemyBoardDamage ?? 0);
    const areaDamageValue = opponent.board.reduce(
      (total, target) =>
        total +
        Math.min(boardDamage, target.currentHealth) * 2.6 +
        (boardDamage >= target.currentHealth ? getCreatureValue(target) : 0),
      0,
    );
    const target = opponent.board[action.targetIndex];
    const targetDamage = Math.max(0, card.targetCreatureDamage ?? 0);
    const targetRemovalValue = target
      ? card.destroyTargetCreature || targetDamage >= target.currentHealth
        ? getCreatureValue(target) + 8
        : Math.min(targetDamage, target.currentHealth) * 2.8
      : 0;
    const healing = Math.max(0, card.onPlayHeal ?? 0);
    const missingHealth = Math.max(0, player.maxHealth - player.health);
    const usefulHealing = Math.min(
      healing,
      missingHealth,
    );
    const healthRatio = player.health / Math.max(1, player.maxHealth);
    const healingWeight = healthRatio <= 0.35 ? 4.4 : healthRatio <= 0.65 ? 2 : 0.5;
    const manaAfterCost = Math.max(0, player.mana - card.manaCost);
    const usefulMana = Math.min(
      card.onPlayMana ?? 0,
      Math.max(0, player.maxMana - manaAfterCost),
    );
    const drawValue = (card.onPlayDraw ?? 0) * 5;
    const discardPenalty = (card.onPlayDiscard ?? 0) * 4;
    const effectValue =
      damage * 5 +
      areaDamageValue +
      targetRemovalValue +
      usefulHealing * healingWeight +
      usefulMana * 2.2 +
      drawValue -
      discardPenalty;
    const wastedHealingPenalty =
      healing <= 0
        ? 0
        : usefulHealing === 0
          ? 18 + healing * 2.5
          : Math.max(0, healing - usefulHealing) * 1.8;
    const wastedManaPenalty =
      (card.onPlayMana ?? 0) > 0 && usefulMana === 0 ? 4 : 0;

    if (card.type === "spell") {
      const lethal = damage >= opponent.health;
      return lethal
        ? 500
        : effectValue -
            card.manaCost * 1.2 -
            wastedHealingPenalty -
            wastedManaPenalty;
    }

    const health = card.currentHealth ?? card.baseHealth ?? 0;
    const creatureValue =
      (card.attack ?? 0) * 3 +
      health * 2.1 +
      effectValue +
      (card.taunt ? health * 0.8 + 4 : 0) +
      (card.fury ? (card.attack ?? 0) * 1.5 + 3 : 0) +
      (card.onHeroAttackManaPenalty ? 5 : 0);
    const curveBonus = card.manaCost >= player.mana - 1 ? 3 : 0;
    const boardNeed = player.board.length === 0 ? 5 : 0;
    const overCommitPenalty =
      player.board.length >= before.config.maxBoardSize - 1 &&
      context.style === "aggressive"
        ? 2
        : 0;

    return (
      (creatureValue - card.manaCost * 1.7 + curveBonus + boardNeed) *
        context.boardWeight -
      overCommitPenalty -
      wastedHealingPenalty -
      wastedManaPenalty
    );
  }

  scoreAttack(before, action, opponent, context) {
    const attacker = getAttackingCard(before, action);

    if (!attacker) {
      return -30;
    }

    const damage = attacker.attack ?? 0;
    const lethal = damage >= opponent.health;
    const manaPressure = (attacker.onHeroAttackManaPenalty ?? 0) * 6;

    if (lethal) {
      return 800;
    }

    return (
      (damage * 4 +
        manaPressure +
        (opponent.health <= opponent.maxHealth * 0.4 ? 5 : 0)) *
      context.attackWeight
    );
  }

  scoreCreatureAttack(before, action, opponent, context) {
    const attacker = getAttackingCard(before, action);
    const target = opponent.board[action.targetIndex];

    if (!attacker || !target) {
      return -30;
    }

    const trade = this.simulateTrade(attacker, target);
    const threatBonus = trade.targetDies ? (target.attack ?? 0) * 2.4 : 0;
    const survivalBonus = trade.targetDies && !trade.attackerDies ? 10 : 0;
    const cleanUpBonus =
      trade.targetDies && target.currentHealth <= attacker.attack ? 4 : 0;
    const badSacrificePenalty =
      trade.attackerDies && !trade.targetDies ? trade.attackerValue * 0.8 + 8 : 0;
    const mutualTradeAdjustment =
      trade.attackerDies && trade.targetDies
        ? trade.targetValue - trade.attackerValue
        : 0;

    return (
      (trade.value +
        threatBonus +
        survivalBonus +
        cleanUpBonus +
        mutualTradeAdjustment -
        badSacrificePenalty) * context.boardWeight
    );
  }

  scoreEndTurn(before, player, context) {
    const opponent = before.players[player.id === "p1" ? 1 : 0];
    const hasPlayableCard = player.hand.some((card) => {
      const hasSlot =
        card.type !== "creature" ||
        player.board.length < before.config.maxBoardSize;
      const hasTarget =
        card.targetType !== "enemyCreature" || opponent.board.length > 0;
      return card.manaCost <= player.mana && hasSlot && hasTarget;
    });
    const hasReadyAttacker = player.board.some(
      (card) => !card.summoningSick && !card.exhausted,
    );
    const wastedActionPenalty =
      (hasPlayableCard ? 8 + player.mana * 1.5 : 0) +
      (hasReadyAttacker ? 16 : 0);
    const manaPatience = player.mana * context.resourcePatience * 0.4;
    const noCards = player.hand.length === 0 ? 2 : 0;

    return manaPatience + noCards - 4 - wastedActionPenalty;
  }

  simulateTrade(attacker, target) {
    const attackerAttack = Math.max(0, attacker?.attack ?? 0);
    const attackerHealth = Math.max(0, attacker?.currentHealth ?? 0);
    const targetAttack = Math.max(0, target?.attack ?? 0);
    const targetHealth = Math.max(0, target?.currentHealth ?? 0);
    const attackerDies = targetAttack >= attackerHealth;
    const targetDies = attackerAttack >= targetHealth;
    const attackerValue = getCreatureValue(attacker);
    const targetValue = getCreatureValue(target);
    const damageValue = Math.min(attackerAttack, targetHealth) * 1.6;
    const counterDamageCost = Math.min(targetAttack, attackerHealth) * 1.15;

    return {
      attackerDies,
      targetDies,
      attackerRemainingHealth: Math.max(0, attackerHealth - targetAttack),
      targetRemainingHealth: Math.max(0, targetHealth - attackerAttack),
      attackerValue,
      targetValue,
      value:
        damageValue +
        (targetDies ? targetValue : 0) -
        counterDamageCost -
        (attackerDies ? attackerValue : 0),
    };
  }

  evaluateAttack(state, action, playerIndex, context) {
    const opponent = state.players[playerIndex === 0 ? 1 : 0];

    return action.type === AI_ACTION_TYPES.ATTACK_CREATURE
      ? this.scoreCreatureAttack(state, action, opponent, context)
      : this.scoreAttack(state, action, opponent, context);
  }

  evaluateCardPlay(state, action, playerIndex, context) {
    return this.scorePlayCard(
      state,
      action,
      state.players[playerIndex],
      context,
    );
  }
}
