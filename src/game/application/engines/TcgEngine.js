import { getDeckIdForAvatar } from "../../domain/entities/decks";
import { createGameUseCases } from "../useCases/gameUseCases";
import { EventBus } from "../../../shared/events/EventBus";

const AI_AVATAR_KEYS = ["avatar1", "avatar2", "avatar3", "avatar4"];

function chooseEnemyAvatar(playerAvatarKey, previousAvatarKey = null) {
  const candidates = AI_AVATAR_KEYS.filter(
    (avatarKey) =>
      avatarKey !== playerAvatarKey && avatarKey !== previousAvatarKey,
  );
  const available =
    candidates.length > 0
      ? candidates
      : AI_AVATAR_KEYS.filter((avatarKey) => avatarKey !== playerAvatarKey);

  return available[Math.floor(Math.random() * available.length)] ?? "avatar2";
}

export class TcgEngine {
  constructor(
    {
      playerName = "Jogador",
      playerAvatarKey = "avatar1",
      playerDeckId = null,
      enemyAvatarKey = "avatar2",
      enemyDeckId = null,
      enemyDifficulty = "medium",
    } = {},
    { eventBus = new EventBus() } = {},
  ) {
    this.initialConfig = {
      playerName,
      playerAvatarKey,
      playerDeckId,
      enemyAvatarKey,
      enemyDeckId,
      enemyDifficulty,
    };
    this.events = eventBus;
    this.useCases = createGameUseCases({ eventBus: this.events });
    this.state = this.useCases.startGame(this.initialConfig);
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setState(nextState) {
    this.state = nextState;
    this.listeners.forEach((listener) => listener(this.state));
  }

  playCard(handIndex, targetIndex = null) {
    this.setState(this.useCases.playCard(this.state, handIndex, targetIndex, 0));
  }

  attackFace(boardIndex) {
    this.setState(this.useCases.attackFace(this.state, boardIndex, 0));
  }

  attackCreature(boardIndex, targetIndex) {
    this.setState(
      this.useCases.attackCreature(this.state, boardIndex, targetIndex, 0),
    );
  }

  drawCard() {
    this.setState(this.useCases.drawCard(this.state, 0));
  }

  endTurn() {
    this.setState(this.useCases.endTurn(this.state, 0));
  }

  rerollMulligan(playerIndex = 0) {
    this.setState(this.useCases.rerollMulligan(this.state, playerIndex));
  }

  confirmMulligan() {
    this.setState(this.useCases.confirmMulligan(this.state));
  }

  concede(playerIndex = 0) {
    this.setState(this.useCases.concede(this.state, playerIndex));
  }

  reset() {
    const enemyAvatarKey = chooseEnemyAvatar(
      this.initialConfig.playerAvatarKey,
      this.initialConfig.enemyAvatarKey,
    );
    this.initialConfig.enemyAvatarKey = enemyAvatarKey;
    this.initialConfig.enemyDeckId = getDeckIdForAvatar(enemyAvatarKey);
    this.setState(this.useCases.startGame(this.initialConfig));
  }

  destroy() {
    this.listeners.clear();
    this.events.clear();
  }
}
