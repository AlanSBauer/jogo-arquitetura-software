export const AI_ACTION_TYPES = {
  PLAY_CARD: "playCard",
  ATTACK_FACE: "attackFace",
  ATTACK_CREATURE: "attackCreature",
  END_TURN: "endTurn",
};

export class MoveGenerator {
  getPlayableCards(state, playerIndex) {
    const player = state.players[playerIndex];
    const opponent = state.players[playerIndex === 0 ? 1 : 0];

    if (!player) {
      return [];
    }

    return player.hand
      .map((card, handIndex) => ({ card, handIndex }))
      .filter(({ card }) => {
        const canPay = card.manaCost <= player.mana;
        const hasBoardSlot =
          card.type !== "creature" ||
          player.board.length < state.config.maxBoardSize;
        const hasRequiredTarget =
          card.targetType !== "enemyCreature" || opponent.board.length > 0;

        return canPay && hasBoardSlot && hasRequiredTarget;
      });
  }

  generate(state, playerIndex, { targetLimit = Infinity } = {}) {
    if (
      state.winner ||
      state.phase !== "playing" ||
      state.activePlayerIndex !== playerIndex
    ) {
      return [];
    }

    const player = state.players[playerIndex];
    const opponent = state.players[playerIndex === 0 ? 1 : 0];
    const actions = [];

    this.getPlayableCards(state, playerIndex).forEach(({ card, handIndex }) => {
      const baseAction = {
        type: AI_ACTION_TYPES.PLAY_CARD,
        handIndex,
        cardInstanceId: card.instanceId,
        cardId: card.id,
        cardName: card.name,
      };

      if (card.targetType === "enemyCreature") {
        const tauntTargets = opponent.board.filter((target) => target.taunt);
        const legalTargetCards = tauntTargets.length > 0
          ? opponent.board
              .map((target, targetIndex) => ({ target, targetIndex }))
              .filter(({ target }) => target.taunt)
          : opponent.board.map((target, targetIndex) => ({
              target,
              targetIndex,
            }));

        legalTargetCards
          .map(({ target, targetIndex }) => ({
            target,
            targetIndex,
            value:
              (card.destroyTargetCreature ? 100 : 0) +
              ((card.targetCreatureDamage ?? 0) >= target.currentHealth
                ? 30
                : 0) +
              (target.attack ?? 0) * 3 +
              (target.currentHealth ?? 0),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, targetLimit)
          .forEach(({ target, targetIndex }) => {
            actions.push({
              ...baseAction,
              targetIndex,
              targetInstanceId: target.instanceId,
              targetName: target.name,
              label: `Usar ${card.name} em ${target.name}`,
            });
          });
        return;
      }

      actions.push({ ...baseAction, label: `Jogar ${card.name}` });
    });

    const tauntTargets = opponent.board
      .map((target, targetIndex) => ({ target, targetIndex }))
      .filter(({ target }) => target.taunt);
    const legalTargets = tauntTargets.length > 0
      ? tauntTargets
      : opponent.board.map((target, targetIndex) => ({ target, targetIndex }));

    player.board.forEach((card, boardIndex) => {
      if (card.summoningSick || card.exhausted) {
        return;
      }

      if (tauntTargets.length === 0) {
        actions.push({
          type: AI_ACTION_TYPES.ATTACK_FACE,
          boardIndex,
          cardInstanceId: card.instanceId,
          cardName: card.name,
          label: `Atacar com ${card.name}`,
        });
      }

      const targetCandidates = legalTargets
        .map(({ target, targetIndex }) => ({
          target,
          targetIndex,
          value:
            (card.attack >= target.currentHealth ? 12 : 0) +
            (target.attack ?? 0) * 2 +
            (target.currentHealth ?? 0) -
            (target.attack >= card.currentHealth ? 6 : 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, targetLimit);

      targetCandidates.forEach(({ target, targetIndex }) => {
        actions.push({
          type: AI_ACTION_TYPES.ATTACK_CREATURE,
          boardIndex,
          targetIndex,
          cardInstanceId: card.instanceId,
          targetInstanceId: target.instanceId,
          cardName: card.name,
          targetName: target.name,
          label: `Atacar ${target.name} com ${card.name}`,
        });
      });
    });

    actions.push({
      type: AI_ACTION_TYPES.END_TURN,
      label: "Encerrar turno",
    });

    return actions;
  }
}
