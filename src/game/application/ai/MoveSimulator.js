import { gameUseCases } from "../useCases/gameUseCases.js";
import { AI_ACTION_TYPES } from "./MoveGenerator.js";

export class MoveSimulator {
  simulate(state, action) {
    switch (action.type) {
      case AI_ACTION_TYPES.PLAY_CARD:
        return gameUseCases.playCard(state, action.handIndex, action.targetIndex);
      case AI_ACTION_TYPES.ATTACK_FACE:
        return gameUseCases.attackFace(state, action.boardIndex);
      case AI_ACTION_TYPES.ATTACK_CREATURE:
        return gameUseCases.attackCreature(
          state,
          action.boardIndex,
          action.targetIndex,
        );
      case AI_ACTION_TYPES.END_TURN:
        return gameUseCases.endTurn(state);
      default:
        return state;
    }
  }
}
