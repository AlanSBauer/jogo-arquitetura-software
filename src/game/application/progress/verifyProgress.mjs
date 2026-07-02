import assert from "node:assert/strict";
import {
  calculateCurrentRank,
  calculateNextRank,
  calculatePointsToNextRank,
  createDefaultPlayerProgress,
  getMostUsedDeck,
  isDeckUnlocked,
  isDifficultyUnlocked,
  registerDefeat,
  registerVictory,
} from "./ProgressService.js";
import {
  loadProgress,
  saveProgress,
} from "../../infrastructure/storage/localStorageProgressRepository.js";
import { createPlayerIdentityService } from "../profile/PlayerIdentityService.js";
import {
  loadPlayerIdentity,
  savePlayerIdentity,
} from "../../infrastructure/storage/localStoragePlayerIdentityRepository.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

const storage = new MemoryStorage();
let progress = createDefaultPlayerProgress();

assert.equal(isDeckUnlocked(progress, "deck1"), true);
assert.equal(isDeckUnlocked(progress, "deck2"), false);
assert.equal(isDifficultyUnlocked(progress, "deck1", "easy"), true);
assert.equal(isDifficultyUnlocked(progress, "deck1", "medium"), false);

let outcome = registerVictory(progress, "deck1", "easy");
progress = outcome.progress;
assert.equal(outcome.result.pointsGained, 10);
assert.equal(progress.points, 10);
assert.equal(progress.campaign.deck1.easy, true);
assert.equal(isDifficultyUnlocked(progress, "deck1", "medium"), true);

outcome = registerVictory(progress, "deck1", "medium");
progress = outcome.progress;
assert.equal(progress.points, 35);
assert.equal(isDifficultyUnlocked(progress, "deck1", "hard"), true);

outcome = registerVictory(progress, "deck1", "hard");
progress = outcome.progress;
assert.equal(progress.points, 85);
assert.equal(isDeckUnlocked(progress, "deck2"), true);
assert.equal(isDifficultyUnlocked(progress, "deck2", "easy"), true);

outcome = registerVictory(progress, "deck2", "easy");
progress = outcome.progress;
assert.equal(progress.points, 95);
outcome = registerVictory(progress, "deck2", "easy");
progress = outcome.progress;
assert.equal(progress.points, 105);
assert.equal(outcome.result.rankUp, true);
assert.equal(outcome.result.currentRank, "Vampiro Iniciante");
assert.equal(getMostUsedDeck(progress), "deck1");

outcome = registerDefeat(progress, "deck2", "medium");
progress = outcome.progress;
assert.equal(progress.losses, 1);
assert.equal(progress.currentWinStreak, 0);
assert.equal(progress.points, 105);

assert.equal(calculateCurrentRank(500).name, "Lorde das Sombras");
assert.equal(calculateNextRank(500).name, "Rei dos Vampiros");
assert.equal(calculatePointsToNextRank(500), 500);
assert.equal(calculateNextRank(1000), null);
assert.equal(calculatePointsToNextRank(1000), 0);

saveProgress(progress, storage);
assert.deepEqual(loadProgress(storage), progress);

const identityRepository = {
  load: () => loadPlayerIdentity(storage),
  save: (identity) => savePlayerIdentity(identity, storage),
};
const identityService = createPlayerIdentityService(identityRepository);
assert.equal(identityService.hasIdentity(), false);
assert.deepEqual(identityService.saveName("  Alan   Bauer  "), {
  name: "Alan Bauer",
});
assert.equal(identityService.hasIdentity(), true);
assert.equal(identityService.load().name, "Alan Bauer");

console.log("Progress verification passed.");
