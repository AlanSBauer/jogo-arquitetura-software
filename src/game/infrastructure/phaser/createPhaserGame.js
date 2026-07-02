import Phaser from "phaser";
import { TcgScene } from "./TcgScene";
import {
  getRenderScale,
  LOGICAL_GAME_HEIGHT,
  LOGICAL_GAME_WIDTH,
} from "./gameDimensions";

export function createPhaserGame(parentElement, engine, sceneCallbacks = {}) {
  const renderScale = getRenderScale();

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentElement,
    width: LOGICAL_GAME_WIDTH * renderScale,
    height: LOGICAL_GAME_HEIGHT * renderScale,
    backgroundColor: "#0f172a",
    scene: [],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: false,
      antialias: true,
      // Para artes detalhadas, manter subpixel evita serrilhado/estouro em movimentacao.
      roundPixels: false,
    },
    callbacks: {
      postBoot: (game) => {
        game.scene.add("tcg-scene", TcgScene, true, {
          engine,
          logicalWidth: LOGICAL_GAME_WIDTH,
          logicalHeight: LOGICAL_GAME_HEIGHT,
          renderScale,
          ...sceneCallbacks,
        });
      },
    },
  });
}
