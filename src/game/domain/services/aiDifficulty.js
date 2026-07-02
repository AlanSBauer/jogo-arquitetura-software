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
    searchDepth: 3,
    beamWidth: 18,
    targetLimit: 4,
    lethalSearchDepth: 5,
    lethalChance: 0.7,
    randomMoveChance: 0.08,
    randomness: 6,
    mistakeChance: 0.18,
    attackWeight: 0.9,
    boardWeight: 0.94,
    resourcePatience: 1.06,
    opponentLookaheadDepth: 0,
    opponentBeamWidth: 0,
    opponentCandidateLimit: 0,
    opponentResponseWeight: 0,
    thinkDelayMin: 800,
    thinkDelayMax: 1900,
  },
  [AI_DIFFICULTY.HARD]: {
    id: AI_DIFFICULTY.HARD,
    searchDepth: 6,
    beamWidth: 52,
    targetLimit: 5,
    lethalSearchDepth: 10,
    lethalChance: 1,
    randomMoveChance: 0,
    randomness: 0.75,
    mistakeChance: 0.06,
    attackWeight: 1.02,
    boardWeight: 1.04,
    resourcePatience: 1.02,
    opponentLookaheadDepth: 1,
    opponentBeamWidth: 10,
    opponentCandidateLimit: 5,
    opponentResponseWeight: 0.35,
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
