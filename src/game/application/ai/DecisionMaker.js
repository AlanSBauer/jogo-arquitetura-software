import { AI_ACTION_TYPES } from "./MoveGenerator.js";

const MIN_BEST_SCORE_WINDOW = 4;
const CLOSE_SCORE_RATIO = 0.07;
const LETHAL_BEAM_WIDTH = 180;

function getDirectDamage(card) {
  return Math.max(0, card?.onPlayDamage ?? card?.damage ?? 0);
}

function isWinnerFor(state, playerIndex) {
  const player = state.players[playerIndex];
  return (
    state.winnerId === player.id ||
    (!state.winnerId && state.winner === player.name)
  );
}

export class DecisionMaker {
  constructor({ moveGenerator, moveSimulator, moveScorer, rng = Math.random }) {
    this.moveGenerator = moveGenerator;
    this.moveSimulator = moveSimulator;
    this.moveScorer = moveScorer;
    this.rng = rng;
  }

  chooseBestSequence(state, playerIndex, context, options = {}) {
    const {
      maxDepth = 4,
      beamWidth = 24,
      targetLimit = 5,
      randomness = context.randomness ?? 0,
      mistakeChance = 0,
      opponentLookaheadDepth = 0,
      opponentBeamWidth = 12,
      opponentCandidateLimit = 6,
      opponentResponseWeight = 0,
    } = options;
    const sequences = this.generateSequences(state, playerIndex, context, {
      maxDepth,
      beamWidth,
      targetLimit,
    });

    if (sequences.length === 0) {
      return {
        action: { type: AI_ACTION_TYPES.END_TURN, label: "Encerrar turno" },
        sequence: [],
        score: 0,
      };
    }

    let scoredSequences = sequences
      .map((candidate) => ({
        ...candidate,
        score:
          this.moveScorer.scoreSequence(
            state,
            candidate.sequence,
            candidate.finalState,
            playerIndex,
            context,
            candidate.steps,
          ) +
          this.rng() * randomness,
      }))
      .sort((a, b) => b.score - a.score);

    if (opponentLookaheadDepth > 0 && opponentResponseWeight > 0) {
      scoredSequences = this.applyOpponentLookahead(
        scoredSequences,
        playerIndex,
        targetLimit,
        {
          depth: opponentLookaheadDepth,
          beamWidth: opponentBeamWidth,
          candidateLimit: opponentCandidateLimit,
          responseWeight: opponentResponseWeight,
        },
      );
    }

    const bestScore = scoredSequences[0].score;
    const closeScoreWindow = Math.max(
      MIN_BEST_SCORE_WINDOW,
      Math.abs(bestScore) * CLOSE_SCORE_RATIO,
    );
    const closeChoices = scoredSequences.filter(
      (candidate) => bestScore - candidate.score <= closeScoreWindow,
    );
    const safeAlternatives = scoredSequences
      .filter(
        (candidate) =>
          bestScore - candidate.score <= Math.max(18, Math.abs(bestScore) * 0.2),
      )
      .slice(0, 4);
    const choicePool =
      context.difficulty === "hard"
        ? [scoredSequences[0]]
        : this.rng() < mistakeChance && safeAlternatives.length > 1
          ? safeAlternatives
          : closeChoices;
    const selected =
      choicePool[Math.floor(this.rng() * choicePool.length)] ??
      scoredSequences[0];

    return {
      action: selected.sequence[0] ?? {
        type: AI_ACTION_TYPES.END_TURN,
        label: "Encerrar turno",
      },
      sequence: selected.sequence,
      score: selected.score,
      opponentReplyScore: selected.opponentReplyScore ?? 0,
    };
  }

  applyOpponentLookahead(
    scoredSequences,
    playerIndex,
    targetLimit,
    { depth, beamWidth, candidateLimit, responseWeight },
  ) {
    const candidates = scoredSequences.slice(0, candidateLimit);

    return candidates
      .map((candidate) => {
        let responseState = candidate.finalState;
        if (
          !responseState.winner &&
          responseState.activePlayerIndex === playerIndex
        ) {
          responseState = this.moveSimulator.simulate(responseState, {
            type: AI_ACTION_TYPES.END_TURN,
          });
        }

        if (responseState.winner) return candidate;

        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponentEvaluation = this.moveScorer.boardEvaluator.evaluate(
          responseState,
          opponentIndex,
        );
        const opponentContext = {
          style: "balanced",
          objective: "Responder a jogada",
          evaluation: opponentEvaluation,
          difficulty: "hard",
          randomness: 0,
          attackWeight: 1.05,
          boardWeight: 1.08,
          resourcePatience: 0.55,
        };
        const replies = this.generateSequences(
          responseState,
          opponentIndex,
          opponentContext,
          {
            maxDepth: depth,
            beamWidth,
            targetLimit,
          },
        );
        const bestReplyScore = replies.reduce(
          (bestScore, reply) =>
            Math.max(
              bestScore,
              this.moveScorer.scoreSequence(
                responseState,
                reply.sequence,
                reply.finalState,
                opponentIndex,
                opponentContext,
                reply.steps,
              ),
            ),
          0,
        );

        return {
          ...candidate,
          score: candidate.score - bestReplyScore * responseWeight,
          opponentReplyScore: bestReplyScore,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  generateSequences(
    state,
    playerIndex,
    context,
    { maxDepth, beamWidth, targetLimit },
  ) {
    let frontier = [{ sequence: [], finalState: state, steps: [], score: 0 }];
    const completed = [];

    for (let depth = 0; depth < maxDepth; depth += 1) {
      const expanded = [];

      frontier.forEach((candidate) => {
        const actions = this.moveGenerator.generate(
          candidate.finalState,
          playerIndex,
          { targetLimit },
        );

        if (actions.length === 0) {
          completed.push(candidate);
          return;
        }

        actions.forEach((action) => {
          const nextState = this.moveSimulator.simulate(
            candidate.finalState,
            action,
          );
          const nextSequence = [...candidate.sequence, action];
          const nextSteps = [
            ...candidate.steps,
            {
              action,
              before: candidate.finalState,
              after: nextState,
            },
          ];
          const nextCandidate = {
            sequence: nextSequence,
            finalState: nextState,
            steps: nextSteps,
            score: this.moveScorer.scoreSequence(
              state,
              nextSequence,
              nextState,
              playerIndex,
              context,
              nextSteps,
            ),
          };

          if (
            action.type === AI_ACTION_TYPES.END_TURN ||
            nextState.winner ||
            nextState.activePlayerIndex !== playerIndex
          ) {
            completed.push(nextCandidate);
          } else {
            expanded.push(nextCandidate);
          }
        });
      });

      if (expanded.length === 0) {
        frontier = [];
        break;
      }

      frontier = expanded.sort((a, b) => b.score - a.score).slice(0, beamWidth);
    }

    return [...completed, ...frontier];
  }

  findLethal(state, playerIndex, { maxDepth = 8, targetLimit = 5 } = {}) {
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const startingHealth = state.players[opponentIndex].health;
    let frontier = [{ state, sequence: [] }];
    const visited = new Set();

    for (let depth = 0; depth < maxDepth; depth += 1) {
      const expanded = [];

      for (const candidate of frontier) {
        const actions = this.moveGenerator
          .generate(candidate.state, playerIndex, { targetLimit })
          .filter((action) => this.isLethalSearchAction(candidate.state, action));

        for (const action of actions) {
          const nextState = this.moveSimulator.simulate(candidate.state, action);
          const sequence = [...candidate.sequence, action];

          if (isWinnerFor(nextState, playerIndex)) {
            return { sequence, finalState: nextState };
          }

          const searchKey = this.getLethalSearchKey(nextState, playerIndex);
          if (visited.has(searchKey)) {
            continue;
          }
          visited.add(searchKey);
          expanded.push({ state: nextState, sequence });
        }
      }

      if (expanded.length === 0) {
        break;
      }

      frontier = expanded
        .sort((a, b) => {
          const aDamage = startingHealth - a.state.players[opponentIndex].health;
          const bDamage = startingHealth - b.state.players[opponentIndex].health;
          const aMana = a.state.players[playerIndex].mana;
          const bMana = b.state.players[playerIndex].mana;
          return bDamage + bMana * 0.08 - (aDamage + aMana * 0.08);
        })
        .slice(0, LETHAL_BEAM_WIDTH);
    }

    return null;
  }

  isLethalSearchAction(state, action) {
    if (action.type === AI_ACTION_TYPES.ATTACK_FACE) {
      return true;
    }

    if (action.type !== AI_ACTION_TYPES.PLAY_CARD) {
      return false;
    }

    const card = state.players[state.activePlayerIndex].hand[action.handIndex];
    return (
      getDirectDamage(card) > 0 ||
      (card?.onPlayMana ?? 0) > 0 ||
      (card?.enemyBoardDamage ?? 0) > 0 ||
      card?.targetType === "enemyCreature" ||
      card?.fury
    );
  }

  getLethalSearchKey(state, playerIndex) {
    const player = state.players[playerIndex];
    const opponent = state.players[playerIndex === 0 ? 1 : 0];
    const hand = player.hand.map((card) => card.instanceId).sort().join(",");
    const board = player.board
      .map(
        (card) =>
          `${card.instanceId}:${card.exhausted ? 1 : 0}:${card.summoningSick ? 1 : 0}`,
      )
      .join(",");
    const enemyBoard = opponent.board
      .map(
        (card) =>
          `${card.instanceId}:${card.currentHealth}:${card.taunt ? 1 : 0}`,
      )
      .join(",");

    return `${player.mana}|${opponent.health}|${hand}|${board}|${enemyBoard}`;
  }
}
