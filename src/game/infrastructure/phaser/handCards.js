import Phaser from "phaser";
import { renderPlayerHand, renderNpcHand } from "./cardsRenderer";

const cardImageUrl = "/arts/cartas/1.png";
const npcCardBackImageUrl = "/arts/ui/card_back.png";
const GENERATED_CARD_TEXTURE_SOURCES = Object.fromEntries(
  Array.from({ length: 64 }, (_item, index) => {
    const cardNumber = index + 1;
    return [
      `carta${cardNumber}`,
      {
        base: `/arts/cartas/${cardNumber}.png`,
      },
    ];
  }),
);
const CARD_TEXTURE_SOURCES = {
  "card-hand": {
    base: cardImageUrl,
  },
  ...GENERATED_CARD_TEXTURE_SOURCES,
};

/**
 * Carrega as imagens usadas nas cartas da mao.
 * O cacheBust ajuda quando voce troca a imagem mantendo o mesmo nome.
 */
export function preloadHandCards(scene, cacheBust) {
  Object.keys(CARD_TEXTURE_SOURCES).forEach((baseTextureKey) => {
    if (scene.textures.exists(baseTextureKey)) {
      scene.textures.remove(baseTextureKey);
    }
  });

  if (scene.textures.exists("npc-card-back")) {
    scene.textures.remove("npc-card-back");
  }

  scene.load.image("card-hand", cardImageUrl + cacheBust);
  scene.load.image("npc-card-back", npcCardBackImageUrl + cacheBust);

  Object.entries(CARD_TEXTURE_SOURCES).forEach(([baseTextureKey, source]) => {
    if (baseTextureKey !== "card-hand") {
      scene.load.image(baseTextureKey, source.base + cacheBust);
    }
  });
}

export function setupCardFilters(scene) {
  Object.keys(CARD_TEXTURE_SOURCES).forEach((baseTextureKey) => {
    if (scene.textures.exists(baseTextureKey)) {
      scene.textures
        .get(baseTextureKey)
        .setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  });

  if (scene.textures.exists("npc-card-back")) {
    scene.textures
      .get("npc-card-back")
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/**
 * Renderiza as duas maos usando o estado real da partida.
 */
export function renderAllHands(
  scene,
  renderRoot,
  gameWidth,
  gameHeight,
  playerCards = [],
  npcCards = [],
  {
    selectedPlayerCardId = null,
    selectedNpcCardId = null,
    onPlayerCardClick,
    onPlayerCardPointerDown,
  } = {},
) {
  const playerTextureKey = "card-hand";
  const npcTextureKey = "npc-card-back";

  renderPlayerHand(
    scene,
    renderRoot,
    playerTextureKey,
    playerCards,
    gameWidth,
    gameHeight,
    {
      selectedInstanceId: selectedPlayerCardId,
      onCardClick: onPlayerCardClick,
      onCardPointerDown: onPlayerCardPointerDown,
    },
  );

  renderNpcHand(
    scene,
    renderRoot,
    npcTextureKey,
    npcCards,
    gameWidth,
    gameHeight,
    true,
    {
      selectedInstanceId: selectedNpcCardId,
    },
  );
}
