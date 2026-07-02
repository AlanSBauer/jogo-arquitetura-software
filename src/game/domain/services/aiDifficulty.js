export const AI_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export const AI_DIFFICULTY_PROFILES = {
  [AI_DIFFICULTY.EASY]: {
    id: AI_DIFFICULTY.EASY,
    searchDepth: 1,
    beamWidth: 6,
    targetLimit: 2,
    lethalSearchDepth: 2,
    lethalChance: 0.25,
    randomMoveChance: 0.45,
    randomness: 14,
    mistakeChance: 0.65,
    attackWeight: 0.68,
    boardWeight: 0.82,
    resourcePatience: 1.15,
    opponentLookaheadDepth: 0,
    opponentBeamWidth: 0,
    opponentCandidateLimit: 0,
    opponentResponseWeight: 0,
    thinkDelayMin: 550,
    thinkDelayMax: 1450,
  },
  [AI_DIFFICULTY.MEDIUM]: {
    id: AI_DIFFICULTY.MEDIUM,
    searchDepth: 4,
    beamWidth: 32,
    targetLimit: 5,
    lethalSearchDepth: 8,
    lethalChance: 1,
    randomMoveChance: 0,
    randomness: 2.5,
    mistakeChance: 0.03,
    attackWeight: 1,
    boardWeight: 1,
    resourcePatience: 1,
    opponentLookaheadDepth: 0,
    opponentBeamWidth: 0,
    opponentCandidateLimit: 0,
    opponentResponseWeight: 0,
    thinkDelayMin: 800,
    thinkDelayMax: 1900,
  },
  [AI_DIFFICULTY.HARD]: {
    id: AI_DIFFICULTY.HARD,
    searchDepth: 8,
    beamWidth: 96,
    targetLimit: 5,
    lethalSearchDepth: 14,
    lethalChance: 1,
    randomMoveChance: 0,
    randomness: 0,
    mistakeChance: 0,
    attackWeight: 1.05,
    boardWeight: 1.08,
    resourcePatience: 1,
    opponentLookaheadDepth: 3,
    opponentBeamWidth: 18,
    opponentCandidateLimit: 8,
    opponentResponseWeight: 0.7,
    thinkDelayMin: 1050,
    thinkDelayMax: 2450,
  },
};

export function normalizeAiDifficulty(difficulty) {
  return AI_DIFFICULTY_PROFILES[difficulty]
    ? difficulty
    : AI_DIFFICULTY.MEDIUM;
}

export function getAiDifficultyProfile(difficulty) {
  return AI_DIFFICULTY_PROFILES[normalizeAiDifficulty(difficulty)];
}
