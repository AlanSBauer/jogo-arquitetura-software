export * from "../../domain/services/progressRules.js";

import {
  registerDefeat,
  registerVictory,
} from "../../domain/services/progressRules.js";

export function createProgressService(repository) {
  return {
    load() {
      return repository.load();
    },

    save(progress) {
      return repository.save(progress);
    },

    registerVictory(deckId, difficulty) {
      const outcome = registerVictory(repository.load(), deckId, difficulty);
      return { ...outcome, progress: repository.save(outcome.progress) };
    },

    registerDefeat(deckId, difficulty) {
      const outcome = registerDefeat(repository.load(), deckId, difficulty);
      return { ...outcome, progress: repository.save(outcome.progress) };
    },
  };
}
