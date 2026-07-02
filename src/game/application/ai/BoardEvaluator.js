const WIN_SCORE = 100000;

function sumBoard(board, field) {
  return board.reduce((total, card) => total + (card[field] ?? 0), 0);
}

function countReadyAttack(board) {
  return board.reduce((total, card) => {
    if (card.summoningSick || card.exhausted) {
      return total;
    }

    return total + (card.attack ?? 0);
  }, 0);
}

function getMaximumHandDamage(hand, mana, hasBoardSlot) {
  const damageByMana = Array.from({ length: mana + 1 }, () => 0);

  hand.forEach((card) => {
    const cost = Math.max(0, card.manaCost ?? 0);
    const damage = Math.max(
      0,
      (card.onPlayDamage ?? card.damage ?? 0) +
        (card.fury && hasBoardSlot ? card.attack ?? 0 : 0),
    );

    if (
      damage <= 0 ||
      cost > mana ||
      (card.type === "creature" && !hasBoardSlot)
    ) {
      return;
    }

    for (let availableMana = mana; availableMana >= cost; availableMana -= 1) {
      damageByMana[availableMana] = Math.max(
        damageByMana[availableMana],
        damageByMana[availableMana - cost] + damage,
      );
    }
  });

  return Math.max(...damageByMana);
}

export class BoardEvaluator {
  evaluate(state, perspectiveIndex) {
    const me = state.players[perspectiveIndex];
    const opponent = state.players[perspectiveIndex === 0 ? 1 : 0];

    if (state.winnerId === me.id || (!state.winnerId && state.winner === me.name)) {
      return {
        score: WIN_SCORE,
        advantage: WIN_SCORE,
        lethalDamageAvailable: true,
        danger: 0,
      };
    }

    if (
      state.winnerId === opponent.id ||
      (!state.winnerId && state.winner === opponent.name)
    ) {
      return {
        score: -WIN_SCORE,
        advantage: -WIN_SCORE,
        lethalDamageAvailable: false,
        danger: WIN_SCORE,
      };
    }

    const myAttack = sumBoard(me.board, "attack");
    const enemyAttack = sumBoard(opponent.board, "attack");
    const myBoardHealth = sumBoard(me.board, "currentHealth");
    const enemyBoardHealth = sumBoard(opponent.board, "currentHealth");
    const readyAttack = countReadyAttack(me.board);
    const enemyReadyAttack = countReadyAttack(opponent.board);
    const handDamage = getMaximumHandDamage(
      me.hand,
      me.mana,
      me.board.length < state.config.maxBoardSize,
    );
    const lethalDamageAvailable = readyAttack + handDamage >= opponent.health;
    const danger = Math.max(0, enemyReadyAttack - me.health);
    const myFatigueRisk =
      me.deck.length === 0 ? (me.fatigueDamage ?? 0) + 1 : 0;
    const enemyFatigueRisk =
      opponent.deck.length === 0 ? (opponent.fatigueDamage ?? 0) + 1 : 0;
    const lowDeckRisk = Math.max(0, 3 - me.deck.length);
    const enemyLowDeckRisk = Math.max(0, 3 - opponent.deck.length);
    const myKeywordValue = me.board.reduce(
      (total, card) =>
        total +
        (card.taunt ? 5 : 0) +
        (card.fury ? 2 : 0) +
        (card.onHeroAttackManaPenalty ? 4 : 0),
      0,
    );
    const enemyKeywordValue = opponent.board.reduce(
      (total, card) =>
        total +
        (card.taunt ? 5 : 0) +
        (card.fury ? 2 : 0) +
        (card.onHeroAttackManaPenalty ? 4 : 0),
      0,
    );

    const score =
      (me.health - opponent.health) * 4 +
      (me.maxMana - opponent.maxMana) * 1.5 +
      (me.mana - opponent.mana) * 0.35 +
      (me.hand.length - opponent.hand.length) * 2 +
      (me.board.length - opponent.board.length) * 5 +
      (myAttack - enemyAttack) * 3 +
      (myBoardHealth - enemyBoardHealth) * 1.5 +
      (me.deck.length - opponent.deck.length) * 0.4 +
      (enemyFatigueRisk - myFatigueRisk) * 4 +
      (enemyLowDeckRisk - lowDeckRisk) * 1.5 +
      myKeywordValue -
      enemyKeywordValue +
      ((opponent.pendingManaPenalty ?? 0) - (me.pendingManaPenalty ?? 0)) * 4 +
      readyAttack * 1.3 -
      enemyReadyAttack * 1.1;

    return {
      score,
      advantage: score,
      lethalDamageAvailable,
      danger,
      readyAttack,
      handDamage,
      enemyReadyAttack,
      myAttack,
      enemyAttack,
      myBoardHealth,
      enemyBoardHealth,
      myFatigueRisk,
      enemyFatigueRisk,
    };
  }
}
