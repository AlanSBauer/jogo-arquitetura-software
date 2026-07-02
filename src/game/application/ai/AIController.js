import { BoardEvaluator } from "./BoardEvaluator.js";
import { DecisionMaker } from "./DecisionMaker.js";
import {
  AI_DIFFICULTY,
  getAiDifficultyProfile,
  normalizeAiDifficulty,
} from "../../domain/services/aiDifficulty.js";
import { MoveGenerator, AI_ACTION_TYPES } from "./MoveGenerator.js";
import { MoveScorer } from "./MoveScorer.js";
import { MoveSimulator } from "./MoveSimulator.js";
import { Personality } from "./Personality.js";

const SAFE_TURN_END_MS = 84000;

export class AIController {
  constructor({ rng = Math.random, difficulty = AI_DIFFICULTY.MEDIUM } = {}) {
    this.rng = rng;
    this.difficulty = normalizeAiDifficulty(difficulty);
    this.boardEvaluator = new BoardEvaluator();
    this.moveGenerator = new MoveGenerator();
    this.moveSimulator = new MoveSimulator();
    this.moveScorer = new MoveScorer(this.boardEvaluator);
    this.personality = new Personality(rng);
    this.decisionMaker = new DecisionMaker({
      moveGenerator: this.moveGenerator,
      moveSimulator: this.moveSimulator,
      moveScorer: this.moveScorer,
      rng,
    });
  }

  setDifficulty(difficulty) {
    this.difficulty = normalizeAiDifficulty(difficulty);
  }

  getBestMove(state, playerIndex, options = {}) {
    return this.chooseNextAction(state, playerIndex, options);
  }

  chooseNextAction(state, playerIndex, { elapsedMs = 0 } = {}) {
    const profile = getAiDifficultyProfile(this.difficulty);

    if (elapsedMs >= SAFE_TURN_END_MS) {
      return this.buildEndTurnDecision("Tempo quase esgotado", profile);
    }

    if (this.rng() < (profile.randomMoveChance ?? 0)) {
      const actions = this.moveGenerator.generate(state, playerIndex, {
        targetLimit: profile.targetLimit,
      });
      const action = actions[Math.floor(this.rng() * actions.length)];

      if (action) {
        return {
          action,
          sequence: action.type === AI_ACTION_TYPES.END_TURN ? [] : [action],
          score: 0,
          objective: "Fazer uma jogada simples",
          personality: "casual",
          difficulty: profile.id,
          thinkDelayMs: this.getThinkDelay(1, profile),
        };
      }
    }

    const lethal = this.findLethal(state, playerIndex, profile);
    if (lethal && this.rng() <= profile.lethalChance) {
      return {
        action: lethal.sequence[0],
        sequence: lethal.sequence,
        score: 100000,
        objective: "Finalizar o jogo",
        personality: "aggressive",
        difficulty: profile.id,
        thinkDelayMs: this.getThinkDelay(lethal.sequence.length, profile),
      };
    }

    const evaluation = this.boardEvaluator.evaluate(state, playerIndex);
    const personalityContext = this.personality.resolve(
      state,
      playerIndex,
      evaluation,
    );
    const context = {
      ...personalityContext,
      difficulty: profile.id,
      randomness: profile.randomness,
      attackWeight:
        personalityContext.attackWeight * profile.attackWeight,
      boardWeight: personalityContext.boardWeight * profile.boardWeight,
      resourcePatience:
        personalityContext.resourcePatience * profile.resourcePatience,
    };
    const decision = this.decisionMaker.chooseBestSequence(
      state,
      playerIndex,
      context,
      {
        maxDepth: profile.searchDepth,
        beamWidth: profile.beamWidth,
        targetLimit: profile.targetLimit,
        randomness: profile.randomness,
        mistakeChance: profile.mistakeChance,
        opponentLookaheadDepth: profile.opponentLookaheadDepth,
        opponentBeamWidth: profile.opponentBeamWidth,
        opponentCandidateLimit: profile.opponentCandidateLimit,
        opponentResponseWeight: profile.opponentResponseWeight,
      },
    );

    return {
      ...decision,
      objective: context.objective,
      personality: context.style,
      difficulty: profile.id,
      thinkDelayMs: this.getThinkDelay(decision.sequence.length, profile),
    };
  }

  findLethal(state, playerIndex, profile = getAiDifficultyProfile(this.difficulty)) {
    return this.decisionMaker.findLethal(state, playerIndex, {
      maxDepth: profile.lethalSearchDepth,
      targetLimit: profile.targetLimit,
    });
  }

  getPlayableCards(state, playerIndex) {
    return this.moveGenerator.getPlayableCards(state, playerIndex);
  }

  simulateTrade(attacker, target) {
    return this.moveScorer.simulateTrade(attacker, target);
  }

  evaluateAttack(state, action, playerIndex) {
    const evaluation = this.boardEvaluator.evaluate(state, playerIndex);
    const context = this.personality.resolve(state, playerIndex, evaluation);
    return this.moveScorer.evaluateAttack(
      state,
      action,
      playerIndex,
      context,
    );
  }

  evaluateCardPlay(state, action, playerIndex) {
    const evaluation = this.boardEvaluator.evaluate(state, playerIndex);
    const context = this.personality.resolve(state, playerIndex, evaluation);
    return this.moveScorer.evaluateCardPlay(
      state,
      action,
      playerIndex,
      context,
    );
  }

  executeTurn(state, playerIndex) {
    return this.getBestMove(state, playerIndex).sequence;
  }

  buildEndTurnDecision(reason, profile = getAiDifficultyProfile(this.difficulty)) {
    return {
      action: { type: AI_ACTION_TYPES.END_TURN, label: reason },
      sequence: [],
      score: 0,
      objective: reason,
      personality: "balanced",
      difficulty: profile.id,
      thinkDelayMs: this.getEndTurnDelay(profile),
    };
  }

  getThinkDelay(sequenceLength, profile = getAiDifficultyProfile(this.difficulty)) {
    const baseDelay =
      profile.thinkDelayMin +
      this.rng() * (profile.thinkDelayMax - profile.thinkDelayMin);
    const complexityDelay = Math.min(1050, sequenceLength * 140);

    return Math.round(baseDelay + complexityDelay);
  }

  getEndTurnDelay(profile = getAiDifficultyProfile(this.difficulty)) {
    return Math.round(
      profile.thinkDelayMin * 0.7 +
        this.rng() * (profile.thinkDelayMax - profile.thinkDelayMin) * 0.55,
    );
  }
}

export { AI_ACTION_TYPES, AI_DIFFICULTY };
