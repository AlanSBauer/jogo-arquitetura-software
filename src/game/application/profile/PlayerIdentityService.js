import {
  createPlayerIdentity,
  hasPlayerIdentity,
} from "../../domain/entities/playerIdentity.js";

export function createPlayerIdentityService(repository) {
  return {
    load() {
      return createPlayerIdentity(repository.load());
    },

    saveName(name) {
      return repository.save(createPlayerIdentity(name));
    },

    hasIdentity() {
      return hasPlayerIdentity(repository.load());
    },
  };
}
