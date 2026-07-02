const PERSONALITY_PROFILES = {
  aggressive: {
    attackWeight: 1.35,
    boardWeight: 0.85,
    resourcePatience: 0.35,
    randomness: 4.5,
  },
  defensive: {
    attackWeight: 0.75,
    boardWeight: 1.25,
    resourcePatience: 0.8,
    randomness: 3,
  },
  control: {
    attackWeight: 0.95,
    boardWeight: 1.35,
    resourcePatience: 0.7,
    randomness: 3.5,
  },
  balanced: {
    attackWeight: 1,
    boardWeight: 1,
    resourcePatience: 0.55,
    randomness: 4,
  },
};

export class Personality {
  constructor(rng = Math.random) {
    this.rng = rng;
  }

  resolve(state, playerIndex, evaluation) {
    const player = state.players[playerIndex];
    const opponent = state.players[playerIndex === 0 ? 1 : 0];

    if (evaluation.lethalDamageAvailable) {
      return this.buildContext("aggressive", "Finalizar o jogo", evaluation);
    }

    if (player.health <= player.maxHealth * 0.34 || evaluation.danger > 0) {
      return this.buildContext("defensive", "Sobreviver", evaluation);
    }

    if (opponent.board.length > player.board.length + 1) {
      return this.buildContext("control", "Controlar a mesa", evaluation);
    }

    if (evaluation.advantage > 18) {
      return this.buildContext("aggressive", "Pressionar vantagem", evaluation);
    }

    if (player.hand.length <= 2 && player.deck.length > 0) {
      return this.buildContext("control", "Preservar recursos", evaluation);
    }

    const styleRoll = this.rng();

    if (styleRoll < 0.18) {
      return this.buildContext("aggressive", "Criar pressao", evaluation);
    }

    if (styleRoll < 0.36) {
      return this.buildContext("control", "Preparar proximos turnos", evaluation);
    }

    return this.buildContext("balanced", "Melhorar a posicao", evaluation);
  }

  buildContext(style, objective, evaluation) {
    return {
      style,
      objective,
      evaluation,
      ...PERSONALITY_PROFILES[style],
    };
  }
}
