export const CAMPAIGN_DECK_IDS = ["deck1", "deck2", "deck3", "deck4"];
export const CAMPAIGN_DIFFICULTIES = ["easy", "medium", "hard"];

export const DIFFICULTY_POINTS = {
  easy: 10,
  medium: 25,
  hard: 50,
};

export const RANKS = [
  { minPoints: 0, name: "Recém Transformado" },
  { minPoints: 100, name: "Vampiro Iniciante" },
  { minPoints: 250, name: "Caçador Noturno" },
  { minPoints: 500, name: "Lorde das Sombras" },
  { minPoints: 1000, name: "Rei dos Vampiros" },
];

function createCampaignDeck(unlocked = false) {
  return {
    unlocked,
    easy: false,
    medium: false,
    hard: false,
  };
}

export function createDefaultPlayerProgress() {
  return {
    wins: 0,
    losses: 0,
    points: 0,
    currentRank: RANKS[0].name,
    currentWinStreak: 0,
    bestWinStreak: 0,
    deckUsage: {
      deck1: 0,
      deck2: 0,
      deck3: 0,
      deck4: 0,
    },
    campaign: {
      deck1: createCampaignDeck(true),
      deck2: createCampaignDeck(),
      deck3: createCampaignDeck(),
      deck4: createCampaignDeck(),
    },
  };
}

function safeCount(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function normalizeProgress(value) {
  const defaults = createDefaultPlayerProgress();
  const source = value && typeof value === "object" ? value : {};
  const points = safeCount(source.points);
  const progress = {
    ...defaults,
    wins: safeCount(source.wins),
    losses: safeCount(source.losses),
    points,
    currentWinStreak: safeCount(source.currentWinStreak),
    bestWinStreak: safeCount(source.bestWinStreak),
    deckUsage: { ...defaults.deckUsage },
    campaign: {},
  };

  CAMPAIGN_DECK_IDS.forEach((deckId, index) => {
    progress.deckUsage[deckId] = safeCount(source.deckUsage?.[deckId]);
    const campaignDeck = source.campaign?.[deckId] ?? {};
    progress.campaign[deckId] = {
      unlocked: index === 0 || Boolean(campaignDeck.unlocked),
      easy: Boolean(campaignDeck.easy),
      medium: Boolean(campaignDeck.medium),
      hard: Boolean(campaignDeck.hard),
    };
  });

  progress.currentRank = calculateCurrentRank(points).name;
  progress.bestWinStreak = Math.max(
    progress.bestWinStreak,
    progress.currentWinStreak,
  );
  return progress;
}

export function calculateCurrentRank(points = 0) {
  const safePoints = safeCount(points);
  return [...RANKS]
    .reverse()
    .find((rank) => safePoints >= rank.minPoints) ?? RANKS[0];
}

export function calculateNextRank(points = 0) {
  const safePoints = safeCount(points);
  return RANKS.find((rank) => rank.minPoints > safePoints) ?? null;
}

export function calculatePointsToNextRank(points = 0) {
  const nextRank = calculateNextRank(points);
  return nextRank ? nextRank.minPoints - safeCount(points) : 0;
}

export function isDeckUnlocked(progress, deckId) {
  return Boolean(progress?.campaign?.[deckId]?.unlocked);
}

export function isDifficultyUnlocked(progress, deckId, difficulty) {
  const deck = progress?.campaign?.[deckId];
  if (!deck?.unlocked) return false;
  if (difficulty === "easy") return true;
  if (difficulty === "medium") return Boolean(deck.easy);
  if (difficulty === "hard") return Boolean(deck.medium);
  return false;
}

export function unlockNextDifficulty(progress, deckId, difficulty) {
  const next = normalizeProgress(progress);
  if (!CAMPAIGN_DIFFICULTIES.includes(difficulty) || !next.campaign[deckId]) {
    return next;
  }

  next.campaign[deckId][difficulty] = true;
  return next;
}

export function unlockNextDeck(progress, completedDeckId) {
  const next = normalizeProgress(progress);
  const completedIndex = CAMPAIGN_DECK_IDS.indexOf(completedDeckId);
  const nextDeckId = CAMPAIGN_DECK_IDS[completedIndex + 1];

  if (
    completedIndex >= 0 &&
    next.campaign[completedDeckId]?.hard &&
    nextDeckId
  ) {
    next.campaign[nextDeckId].unlocked = true;
  }

  return next;
}

export function getMostUsedDeck(progress) {
  const usage = progress?.deckUsage ?? {};
  const highest = Math.max(
    0,
    ...CAMPAIGN_DECK_IDS.map((deckId) => safeCount(usage[deckId])),
  );
  if (highest === 0) return null;
  return CAMPAIGN_DECK_IDS.find(
    (deckId) => safeCount(usage[deckId]) === highest,
  );
}

function createMatchResult(previous, current, details) {
  const previousRank = calculateCurrentRank(previous.points);
  const currentRank = calculateCurrentRank(current.points);
  const nextRank = calculateNextRank(current.points);

  return {
    ...details,
    previousPoints: previous.points,
    currentPoints: current.points,
    previousRank: previousRank.name,
    currentRank: currentRank.name,
    rankUp: currentRank.minPoints > previousRank.minPoints,
    nextRank: nextRank?.name ?? null,
    pointsToNextRank: calculatePointsToNextRank(current.points),
  };
}

export function registerVictory(progress, deckId, difficulty) {
  const previous = normalizeProgress(progress);
  let next = normalizeProgress(previous);
  const pointsGained = DIFFICULTY_POINTS[difficulty] ?? 0;

  next.wins += 1;
  next.points += pointsGained;
  next.currentWinStreak += 1;
  next.bestWinStreak = Math.max(next.bestWinStreak, next.currentWinStreak);
  if (next.deckUsage[deckId] !== undefined) next.deckUsage[deckId] += 1;
  next = unlockNextDifficulty(next, deckId, difficulty);
  if (difficulty === "hard") next = unlockNextDeck(next, deckId);
  next.currentRank = calculateCurrentRank(next.points).name;

  return {
    progress: next,
    result: createMatchResult(previous, next, {
      won: true,
      deckId,
      difficulty,
      pointsGained,
    }),
  };
}

export function registerDefeat(progress, deckId, difficulty) {
  const previous = normalizeProgress(progress);
  const next = normalizeProgress(previous);

  next.losses += 1;
  next.currentWinStreak = 0;
  if (next.deckUsage[deckId] !== undefined) next.deckUsage[deckId] += 1;

  return {
    progress: next,
    result: createMatchResult(previous, next, {
      won: false,
      deckId,
      difficulty,
      pointsGained: 0,
    }),
  };
}
