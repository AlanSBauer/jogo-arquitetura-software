import Phaser from "phaser";

export const HAND_CARD_WIDTH = 150;
export const HAND_CARD_HEIGHT = 205;
const HAND_CENTER_OFFSET_X = 30;

// Espaco horizontal entre as cartas da sua mao. Maior = cartas mais afastadas.
const PLAYER_CARD_SPACING = 80;
// Tamanho normal das cartas da sua mao.
export const PLAYER_CARD_SCALE = 0.65;
// Tamanho da sua carta quando passa o mouse por cima.
const PLAYER_CARD_HOVER_SCALE = 0.78;
// Tamanho da sua carta quando ela esta selecionada.
export const PLAYER_CARD_SELECTED_SCALE = 1.2;
// Quanto a sua carta sobe quando passa o mouse por cima.
const PLAYER_CARD_HOVER_RAISE = 20;
// Quanto a sua carta sobe quando ela esta selecionada para jogar.
const PLAYER_CARD_SELECTED_RAISE = 150;

// Espaco horizontal entre as cartas da mao do inimigo.
const NPC_CARD_SPACING = 40;
// Tamanho das cartas da mao do inimigo.
export const NPC_CARD_SCALE = 0.45;
// Quanto a carta do inimigo sobe quando o NPC esta escolhendo ela.
const NPC_CARD_SELECTED_RAISE = 7.8;
const CARD_FACE_FRAME_PREFIX = "__card-face-aspect-crop";
const CARD_FRAME_ASPECT = HAND_CARD_WIDTH / HAND_CARD_HEIGHT;

function getAspectCropFrame(scene, textureKey, targetAspect) {
  const texture = scene.textures.get(textureKey);
  const sourceFrame = texture?.get();

  if (!sourceFrame) {
    return undefined;
  }

  const sourceWidth = sourceFrame.cutWidth ?? sourceFrame.width;
  const sourceHeight = sourceFrame.cutHeight ?? sourceFrame.height;

  if (!sourceWidth || !sourceHeight) {
    return undefined;
  }

  const sourceAspect = sourceWidth / sourceHeight;

  // Se o aspecto ja for muito proximo, nao precisa recortar.
  if (Math.abs(sourceAspect - targetAspect) <= 0.005) {
    return undefined;
  }

  const cropWidth =
    sourceAspect > targetAspect
      ? Math.round(sourceHeight * targetAspect)
      : sourceWidth;
  const cropHeight =
    sourceAspect > targetAspect
      ? sourceHeight
      : Math.round(sourceWidth / targetAspect);
  const cropX = Math.round((sourceWidth - cropWidth) / 2);
  const cropY = Math.round((sourceHeight - cropHeight) / 2);
  const frameKey = `${CARD_FACE_FRAME_PREFIX}-${textureKey}-${cropX}-${cropY}-${cropWidth}-${cropHeight}`;

  if (!texture.has(frameKey)) {
    texture.add(frameKey, 0, cropX, cropY, cropWidth, cropHeight);
  }

  return frameKey;
}

function normalizeCards(cardsOrCount) {
  if (Array.isArray(cardsOrCount)) {
    return cardsOrCount;
  }

  return Array.from({ length: cardsOrCount }, () => null);
}

function getHandStartX(centerX, cardCount, spacing) {
  // Calcula o X da primeira carta para a mao inteira ficar centralizada.
  const totalWidth = spacing * (cardCount - 1);
  return centerX - totalWidth / 2;
}

export function getPlayerHandCenterY(gameHeight) {
  // Posicao vertical da sua mao. Aumentar aproxima do fundo da tela.
  return Math.max(gameHeight - 64, gameHeight * 0.88);
}

export function getPlayerHandCardCenter(
  gameWidth,
  gameHeight,
  handIndex,
  handCount,
  isSelected = false,
) {
  // Centro horizontal da sua mao.
  const centerX = gameWidth / 2 + HAND_CENTER_OFFSET_X;
  // Centro vertical da sua mao.
  const centerY = getPlayerHandCenterY(gameHeight);
  // X da primeira carta, ja considerando a quantidade de cartas na mao.
  const startX = getHandStartX(centerX, handCount, PLAYER_CARD_SPACING);

  return {
    // Posicao horizontal da carta na mao.
    x: Math.round(startX + handIndex * PLAYER_CARD_SPACING),
    // Posicao vertical da carta. Se estiver selecionada, sobe na tela.
    y: Math.round(centerY - (isSelected ? PLAYER_CARD_SELECTED_RAISE : 0)),
  };
}

export function getNpcHandCenterY() {
  // Posicao vertical da mao do inimigo no topo. Maior = mais para baixo.
  return 8 + (HAND_CARD_HEIGHT * NPC_CARD_SCALE) / 2;
}

export function getNpcHandCardCenter(
  gameWidth,
  gameHeight,
  handIndex,
  handCount,
  isSelected = false,
) {
  // Centro horizontal da mao do inimigo.
  const centerX = gameWidth / 2 + HAND_CENTER_OFFSET_X;
  // Centro vertical da mao do inimigo.
  const centerY = getNpcHandCenterY(gameHeight);
  // X da primeira carta do inimigo, considerando a quantidade de cartas.
  const startX = getHandStartX(centerX, handCount, NPC_CARD_SPACING);

  return {
    // Posicao horizontal da carta na mao do inimigo.
    x: Math.round(startX + handIndex * NPC_CARD_SPACING),
    // Carta selecionada do inimigo sobe um pouco para mostrar a escolha.
    y: Math.round(centerY - (isSelected ? NPC_CARD_SELECTED_RAISE : 0)),
  };
}

function getScaledCardSize(scale) {
  return {
    width: Math.round(HAND_CARD_WIDTH * scale),
    height: Math.round(HAND_CARD_HEIGHT * scale),
  };
}

function getTextureNativeSize(scene, textureKey, frameKey) {
  const frame = scene.textures.getFrame(textureKey, frameKey);

  if (!frame) {
    return null;
  }

  return {
    width: frame.cutWidth ?? frame.width,
    height: frame.cutHeight ?? frame.height,
  };
}

function snapToNativeSize(scene, textureKey, frameKey, preferredSize) {
  const nativeSize = getTextureNativeSize(scene, textureKey, frameKey);

  if (
    nativeSize &&
    Math.abs(nativeSize.width - preferredSize.width) <= 2 &&
    Math.abs(nativeSize.height - preferredSize.height) <= 2
  ) {
    return nativeSize;
  }

  return preferredSize;
}

function getHandCardDisplaySize(faceDown, isSelected, isHovering = false) {
  if (faceDown) {
    return getScaledCardSize(NPC_CARD_SCALE);
  }

  if (isSelected) {
    return getScaledCardSize(PLAYER_CARD_SELECTED_SCALE);
  }

  if (isHovering) {
    return getScaledCardSize(PLAYER_CARD_HOVER_SCALE);
  }

  return getScaledCardSize(PLAYER_CARD_SCALE);
}

function drawSelectionFrame(frame, isSelected, width, height) {
  frame.clear();
  frame.lineStyle(isSelected ? 4 : 2, isSelected ? 0xfacc15 : 0x93c5fd, 1);
  frame.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  frame.setAlpha(isSelected ? 1 : 0);
}

function renderSelectionFrame(scene, container, isSelected, width, height) {
  const frame = scene.add.graphics();
  drawSelectionFrame(frame, isSelected, width, height);
  container.add(frame);
  return frame;
}

function bringHandCardToTop(renderRoot, container) {
  if (typeof renderRoot.bringToTop === "function") {
    renderRoot.bringToTop(container);
  }
}

function restoreHandCardOrder(renderRoot) {
  if (typeof renderRoot.sort === "function") {
    renderRoot.sort("depth");
  }
}

function renderCardTypeBadge(scene, container, cardData, displayHeight) {
  const isSpell = cardData?.type === "spell";
  const label = isSpell ? "MAGIA" : "CRIATURA";
  const palette = isSpell
    ? { fill: 0x111c3d, stroke: 0x60a5fa, text: "#dbeafe" }
    : { fill: 0x3b1d12, stroke: 0xf59e0b, text: "#fef3c7" };
  const badge = scene.add.container(0, displayHeight / 2 + 15);
  const background = scene.add.graphics();
  background.fillStyle(palette.fill, 0.96);
  background.fillRoundedRect(-49, -11, 98, 22, 8);
  background.lineStyle(1.5, palette.stroke, 0.95);
  background.strokeRoundedRect(-49, -11, 98, 22, 8);
  const marker = scene.add.circle(-34, 0, 3.5, palette.stroke, 1);
  marker.setStrokeStyle(1, 0xffffff, 0.72);
  const text = scene.add
    .text(5, 0, label, {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: palette.text,
      stroke: "#020617",
      strokeThickness: 2,
    })
    .setOrigin(0.5);

  badge.add([background, marker, text]);
  container.add(badge);
  return badge;
}

function setHandCardPose(
  scene,
  container,
  card,
  selectionFrame,
  textureKey,
  frameKey,
  baseY,
  isSelected,
  isHovering,
) {
  const targetY =
    baseY -
    (isSelected
      ? PLAYER_CARD_SELECTED_RAISE
      : isHovering
        ? PLAYER_CARD_HOVER_RAISE
        : 0);
  const preferredTargetSize = getHandCardDisplaySize(
    false,
    isSelected,
    isHovering,
  );
  const targetSize =
    !isSelected && !isHovering
      ? snapToNativeSize(scene, textureKey, frameKey, preferredTargetSize)
      : preferredTargetSize;

  card.setDisplaySize(targetSize.width, targetSize.height);
  drawSelectionFrame(
    selectionFrame,
    isSelected || isHovering,
    targetSize.width,
    targetSize.height,
  );

  scene.tweens.add({
    targets: container,
    y: targetY,
    duration: 120,
    ease: "Quad.easeOut",
  });
}

export function getCardTextureFrame(scene, textureKey, faceDown) {
  if (faceDown) {
    return getAspectCropFrame(scene, textureKey, CARD_FRAME_ASPECT);
  }

  return getAspectCropFrame(scene, textureKey, CARD_FRAME_ASPECT);
}

export function getCardTextureKey(
  scene,
  cardData,
  fallbackTextureKey,
  variant = "hand",
) {
  const baseTextureKey =
    cardData?.artKey && scene.textures.exists(cardData.artKey)
      ? cardData.artKey
      : fallbackTextureKey;
  const variantTextureKey = `${baseTextureKey}--${variant}`;

  if (scene.textures.exists(variantTextureKey)) {
    return variantTextureKey;
  }

  if (scene.textures.exists(baseTextureKey)) {
    return baseTextureKey;
  }

  return fallbackTextureKey;
}

/**
 * Renderiza uma mao inteira.
 *
 * O hitbox e menor do que a imagem porque as cartas ficam em leque. Assim
 * cada carta tem uma faixa clicavel propria e nao rouba clique da vizinha.
 */
function renderCardHand(
  scene,
  renderRoot,
  textureKey,
  cardsOrCount = 4,
  {
    centerX = 480,
    centerY = 420,
    faceDown = false,
    selectedInstanceId = null,
    textureVariant = "hand",
    onCardClick,
    onCardPointerDown,
  } = {},
) {
  if (!scene.textures.exists(textureKey)) {
    console.warn(`[Phaser] Textura '${textureKey}' nao carregada`);
    return;
  }

  const cards = normalizeCards(cardsOrCount);
  const cardCount = cards.length;

  if (cardCount === 0) {
    return;
  }

  // Escolhe o espacamento certo: inimigo usa NPC_CARD_SPACING, jogador usa PLAYER_CARD_SPACING.
  const spacing = faceDown ? NPC_CARD_SPACING : PLAYER_CARD_SPACING;
  // X inicial para distribuir as cartas a partir do centro da mao.
  const startX = getHandStartX(centerX, cardCount, spacing);

  let selectedContainer = null;

  for (let index = 0; index < cardCount; index += 1) {
    const cardData = cards[index];
    const isSelected = cardData?.instanceId === selectedInstanceId;
    // Posicao horizontal desta carta dentro da mao.
    const baseX = startX + index * spacing;
    // Posicao vertical base da mao.
    const baseY = centerY;

    if (cardData?.hidden) {
      continue;
    }

    const selectedOffsetY = faceDown
      ? -NPC_CARD_SELECTED_RAISE
      : -PLAYER_CARD_SELECTED_RAISE;

    const container = scene.add.container(
      Math.round(baseX),
      Math.round(baseY + (isSelected ? selectedOffsetY : 0)),
    );
    const cardTextureKey = faceDown
      ? textureKey
      : getCardTextureKey(scene, cardData, textureKey, textureVariant);
    const cardFrame = getCardTextureFrame(scene, cardTextureKey, faceDown);
    const preferredDisplaySize = getHandCardDisplaySize(faceDown, isSelected);
    const displaySize =
      !faceDown && !isSelected
        ? snapToNativeSize(
            scene,
            cardTextureKey,
            cardFrame,
            preferredDisplaySize,
          )
        : preferredDisplaySize;
    const selectionFrame = renderSelectionFrame(
      scene,
      container,
      isSelected,
      displaySize.width,
      displaySize.height,
    );
    const card = scene.add.image(0, 0, cardTextureKey, cardFrame);

    card.setDisplaySize(displaySize.width, displaySize.height);
    card.setOrigin(0.5, 0.5);
    card.setAlpha(1);
    card.setTint(0xffffff);
    card.setBlendMode(Phaser.BlendModes.NORMAL);

    container.add(card);
    const typeBadge = !faceDown
      ? renderCardTypeBadge(scene, container, cardData, displaySize.height)
      : null;
    typeBadge?.setVisible(isSelected);

    if (!faceDown) {
      const zone = scene.add
        .zone(0, 0, displaySize.width, displaySize.height)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const resetHover = () => {
        if (container.getData("isHandDragging")) {
          return;
        }

        setHandCardPose(
          scene,
          container,
          card,
          selectionFrame,
          cardTextureKey,
          cardFrame,
          baseY,
          isSelected,
          false,
        );
        restoreHandCardOrder(renderRoot);
        if (scene.activeHandCardHoverReset === resetHover) {
          scene.activeHandCardHoverReset = null;
        }
      };

      zone.on("pointerover", () => {
        if (container.getData("isHandDragging")) {
          return;
        }

        if (
          scene.activeHandCardHoverReset &&
          scene.activeHandCardHoverReset !== resetHover
        ) {
          scene.activeHandCardHoverReset();
        }
        scene.activeHandCardHoverReset = resetHover;
        bringHandCardToTop(renderRoot, container);
        setHandCardPose(
          scene,
          container,
          card,
          selectionFrame,
          cardTextureKey,
          cardFrame,
          baseY,
          isSelected,
          true,
        );
      });
      zone.on("pointerout", resetHover);
      zone.on("pointerdown", (pointer) => {
        if (pointer.button !== 0) {
          return;
        }

        if (onCardPointerDown) {
          onCardPointerDown(index, cardData, pointer, {
            container,
            cardImage: card,
            selectionFrame,
            textureKey: cardTextureKey,
            textureFrame: cardFrame,
            homeX: container.x,
            homeY: container.y,
            typeBadge,
          });
        } else if (onCardClick) {
          onCardClick(index, cardData);
        }
      });

      container.add(zone);
    }

    container.setDepth(
      faceDown ? cardCount - index : isSelected ? 1000 : index + 100,
    );
    renderRoot.add(container);

    if (isSelected) {
      selectedContainer = container;
    }
  }

  if (selectedContainer) {
    bringHandCardToTop(renderRoot, selectedContainer);
  }
}

export function renderPlayerHand(
  scene,
  renderRoot,
  textureKey,
  cards = [],
  gameWidth = 960,
  gameHeight = 540,
  {
    selectedInstanceId = null,
    onCardClick,
    onCardPointerDown,
  } = {},
) {
  renderCardHand(scene, renderRoot, textureKey, cards, {
    // Mao do jogador fica centralizada horizontalmente.
    centerX: gameWidth / 2 + HAND_CENTER_OFFSET_X,
    // Mao do jogador fica perto da parte de baixo da tela.
    centerY: getPlayerHandCenterY(gameHeight),
    faceDown: false,
    textureVariant: "hand",
    selectedInstanceId,
    onCardClick,
    onCardPointerDown,
  });
}

export function renderNpcHand(
  scene,
  renderRoot,
  textureKey,
  cards = [],
  gameWidth = 960,
  gameHeight = 540,
  faceDown = true,
  { selectedInstanceId = null } = {},
) {
  renderCardHand(scene, renderRoot, textureKey, cards, {
    // Mao do inimigo fica centralizada horizontalmente.
    centerX: gameWidth / 2 + HAND_CENTER_OFFSET_X,
    centerY: getNpcHandCenterY(gameHeight),
    faceDown,
    selectedInstanceId,
  });
}
