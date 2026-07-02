import Phaser from "phaser";
import {
  getCardTextureFrame,
  getCardTextureKey,
  getNpcHandCardCenter,
  getPlayerHandCardCenter,
  getPlayerHandCenterY,
  HAND_CARD_HEIGHT,
  HAND_CARD_WIDTH,
  NPC_CARD_SCALE,
  PLAYER_CARD_SCALE,
  PLAYER_CARD_SELECTED_SCALE,
} from "./cardsRenderer";
import {
  preloadHandCards,
  setupCardFilters,
  renderAllHands,
} from "./handCards";
import { AIController, AI_ACTION_TYPES } from "../../application/ai";
import { gameAudio, SOUND_KEYS } from "../audio/gameAudio";
import { requestSound } from "../audio/connectAudioEvents";
import {
  LOGICAL_GAME_HEIGHT,
  LOGICAL_GAME_WIDTH,
} from "./gameDimensions";

const arenaImageUrl = "/arts/ui/arena_1.png";
const hudFrameImageUrl = "/arts/ui/moldura.png";
const healthBarImageUrl = "/arts/ui/vida.png";
const manaBarImageUrl = "/arts/ui/mana.png";
const turnInfoImageUrl = "/arts/ui/infos_turno.png";
const optionsMenuImageUrl = "/arts/ui/menu_de_opcoes.png";
const uiButtonImageUrls = {
  play: "/arts/ui/buttons/4.png",
  options: "/arts/ui/buttons/botaoOpcoes.png",
  chat: "/arts/ui/buttons/chatIcon.png",
  "end-turn": "/arts/ui/passarTurnoButton.png",
  restart: "/arts/ui/buttons/6.png",
  pause: "/arts/ui/buttons/7.png",
  concede: "/arts/ui/buttons/8.png",
  continue: "/arts/ui/buttons/9.png",
  exit: "/arts/ui/buttons/10.png",
  back: "/arts/ui/buttons/11.png",
  rematch: "/arts/ui/buttons/12.png",
};
const avatarImageUrls = [
  "/arts/avatares/avatar1.png",
  "/arts/avatares/avatar2.png",
  "/arts/avatares/avatar3.png",
  "/arts/avatares/avatar4.png",
];
const PLAYER_INDEX = 0;
const ENEMY_INDEX = 1;
const NPC_THINK_DELAY_MIN = 800;
const NPC_THINK_DELAY_MAX = 2500;
const NPC_ACTION_DELAY_MIN = 400;
const NPC_ACTION_DELAY_MAX = 1800;
const TURN_DURATION_MS = 90_000;
const TURN_WARNING_SECONDS = 20;
const TURN_COUNTDOWN_SECONDS = 10;
const INITIAL_DEAL_CARD_COUNT = 4;
const ARENA_BACKGROUND_INSET_X = 14;
const ARENA_BACKGROUND_INSET_Y = 10;

// Ajustado para 60 para que as cartas caibam perfeitamente nos quadrados da mesa.
const BOARD_CARD_WIDTH = 78;
const BOARD_CARD_HEIGHT = Math.round(
  BOARD_CARD_WIDTH * (HAND_CARD_HEIGHT / HAND_CARD_WIDTH),
);
const CARD_REVEAL_WIDTH = Math.round(HAND_CARD_WIDTH * 1.3);
const CARD_REVEAL_HEIGHT = Math.round(HAND_CARD_HEIGHT * 1.3);

const BOARD_CARD_CENTER_X = 515;
// Espaçamento alinhado visualmente com os slots da arena
const BOARD_CARD_SPACING = 100;
const BOARD_CARD_VERTICAL_OFFSET = -10;
const BOARD_CARD_CENTER_INDEX = 2;

const BOARD_CARD_BACK_EDGE_RAISE = 5;
const BOARD_CARD_DEPTH_BASE = 800;

// Mantém as pontas levemente viradas e o meio reto
const BOARD_CARD_SLOT_ANGLES = [-1, -1, 0, 1, 1];
const BOARD_CARD_SELECTED_SCALE = 1.06;
const BOARD_CARD_SELECTED_STROKE = 0xfacc15;
const BOARD_CARD_HOVER_STROKE_PLAYER = 0xfacc15;
const BOARD_CARD_HOVER_STROKE_ENEMY = 0x9ca3af;
const BOARD_CARD_HITBOX_SCALE_X = 0.82;
const BOARD_CARD_HITBOX_SCALE_Y = 0.88;
const BOARD_CARD_HEALTH_BADGE_WIDTH = 62;
const BOARD_CARD_HEALTH_BADGE_HEIGHT = 16;
const ATTACK_DRAG_THRESHOLD = 8;
const HAND_CARD_DRAG_THRESHOLD = 14;
const HAND_CARD_DRAG_SCALE = 0.82;

// Proporção 1.0 - sem esmagar as cartas
const BOARD_CARD_HEIGHT_SCALE_Y = 1.0;
const ENEMY_BOARD_CARD_FACE_ANGLE = 0;
const ENEMY_BOARD_CARD_FRONT_RAISE = 8;
const BOARD_INSPECT_CARD_MAX_WIDTH = Math.round(
  HAND_CARD_WIDTH * PLAYER_CARD_SELECTED_SCALE,
);
const BOARD_INSPECT_CARD_MAX_HEIGHT = Math.round(
  HAND_CARD_HEIGHT * PLAYER_CARD_SELECTED_SCALE,
);
const BOARD_INSPECT_PANEL_BOTTOM_GAP = 10;
const DECK_PILE_WIDTH = Math.round(HAND_CARD_WIDTH * 0.56);
const DECK_PILE_HEIGHT = Math.round(HAND_CARD_HEIGHT * 0.56);
const ENEMY_DECK_PILE_X = 73;
const ENEMY_DECK_PILE_Y = 165;
const PLAYER_DECK_PILE_RIGHT_MARGIN = 62;
const DECK_COUNT_BADGE_WIDTH = 28;
const DECK_COUNT_BADGE_HEIGHT = 20;
const DISCARD_PILE_OFFSET_X = 90;
const DISCARD_COUNT_BADGE_WIDTH = 28;
const DISCARD_COUNT_BADGE_HEIGHT = 20;
const HUD_FRAME_WIDTH = 128;
const HUD_FRAME_HEIGHT = 163;
const PLAYER_HUD_FRAME_LEFT_MARGIN = 22;
const PLAYER_HUD_FRAME_BOTTOM_MARGIN = 82;
const ENEMY_HUD_FRAME_RIGHT_MARGIN = 14;
const ENEMY_HUD_FRAME_TOP_MARGIN = 16;
const HUD_AVATAR_MAX_WIDTH = 88;
const HUD_AVATAR_MAX_HEIGHT = 92;
const HUD_RESOURCE_BAR_HEIGHT = 32;
const HUD_RESOURCE_BAR_GAP = 1;
const HUD_RESOURCE_TOP_GAP = 4;
const HUD_RESOURCE_STACK_HEIGHT =
  HUD_RESOURCE_BAR_HEIGHT * 2 + HUD_RESOURCE_BAR_GAP;
const HUD_RESOURCE_FRAMES = {
  health: {
    textureKey: "health-bar-ui",
    frameKey: "health-bar-content",
    source: { x: 609, y: 447, width: 701, height: 177 },
    fill: { x: 174, y: 61, width: 507, height: 66 },
    displayWidth: 127,
    emptyColor: 0x16060b,
  },
  mana: {
    textureKey: "mana-bar-ui",
    frameKey: "mana-bar-content",
    source: { x: 599, y: 446, width: 718, height: 181 },
    fill: { x: 153, y: 60, width: 536, height: 75 },
    displayWidth: 127,
    emptyColor: 0x0e0718,
  },
};
const UI_FRAME_DEFINITIONS = {
  "turn-info-ui": {
    frameKey: "turn-info-content",
    source: { x: 560, y: 361, width: 810, height: 362 },
  },
  "options-menu-ui": {
    frameKey: "options-menu-content",
    source: { x: 702, y: 199, width: 509, height: 741 },
  },
  "ui-button-play": {
    frameKey: "ui-button-play-content",
    source: { x: 764, y: 492, width: 391, height: 100 },
  },
  "ui-button-options": {
    frameKey: "ui-button-options-content",
    source: { x: 618, y: 316, width: 674, height: 466 },
  },
  "ui-button-chat": {
    frameKey: "ui-button-chat-content",
    source: { x: 616, y: 298, width: 683, height: 473 },
  },
  "ui-button-end-turn": {
    frameKey: "ui-button-end-turn-content",
    source: { x: 578, y: 372, width: 771, height: 359 },
  },
  "ui-button-restart": {
    frameKey: "ui-button-restart-content",
    source: { x: 758, y: 495, width: 407, height: 99 },
  },
  "ui-button-pause": {
    frameKey: "ui-button-pause-content",
    source: { x: 750, y: 487, width: 412, height: 102 },
  },
  "ui-button-concede": {
    frameKey: "ui-button-concede-content",
    source: { x: 750, y: 483, width: 412, height: 112 },
  },
  "ui-button-continue": {
    frameKey: "ui-button-continue-content",
    source: { x: 736, y: 488, width: 450, height: 112 },
  },
  "ui-button-exit": {
    frameKey: "ui-button-exit-content",
    source: { x: 728, y: 480, width: 466, height: 116 },
  },
  "ui-button-back": {
    frameKey: "ui-button-back-content",
    source: { x: 728, y: 480, width: 466, height: 116 },
  },
  "ui-button-rematch": {
    frameKey: "ui-button-rematch-content",
    source: { x: 728, y: 480, width: 466, height: 116 },
  },
};
const OPTIONS_BUTTON_X = 22;
const OPTIONS_BUTTON_Y = 20;
const OPTIONS_BUTTON_WIDTH = 58;
const OPTIONS_BUTTON_HEIGHT = 40;
const CHAT_BUTTON_X = OPTIONS_BUTTON_X;
const CHAT_BUTTON_Y = OPTIONS_BUTTON_Y + OPTIONS_BUTTON_HEIGHT + 6;
const CHAT_BUTTON_WIDTH = OPTIONS_BUTTON_WIDTH;
const CHAT_BUTTON_HEIGHT = OPTIONS_BUTTON_HEIGHT;
const PAUSE_OVERLAY_DEPTH = 900000;
const OPTIONS_DEPTH = 18000;
const TURN_BADGE_X = 90;
const TURN_BADGE_Y = 16;
const TURN_BADGE_WIDTH = 170;
const TURN_BADGE_HEIGHT = Math.round(TURN_BADGE_WIDTH * (362 / 810));
const MULLIGAN_CARD_WIDTH = 174;
const MULLIGAN_CARD_HEIGHT = Math.round(
  MULLIGAN_CARD_WIDTH * (HAND_CARD_HEIGHT / HAND_CARD_WIDTH),
);
const MULLIGAN_CARD_SPACING = 190;
const END_TURN_BUTTON_WIDTH = 146;
const END_TURN_BUTTON_HEIGHT = Math.round(
  END_TURN_BUTTON_WIDTH * (359 / 771),
);
const END_TURN_BUTTON_RIGHT_MARGIN = 22;
const END_TURN_BUTTON_BOTTOM_MARGIN = 18;
const DECK_CONTROL_VERTICAL_GAP = 15;

function createBoardSlots(centerX, y, spacing, count = 5) {
  return Array.from({ length: count }, (_slot, index) => ({
    x:
      centerX +
      (index - BOARD_CARD_CENTER_INDEX) * spacing -
      BOARD_CARD_WIDTH / 2,
    y: y + BOARD_CARD_VERTICAL_OFFSET,
  }));
}

const ALLY_BOARD_SLOTS = createBoardSlots(
  BOARD_CARD_CENTER_X,
  270,
  BOARD_CARD_SPACING,
);

const ENEMY_BOARD_SLOTS = createBoardSlots(
  BOARD_CARD_CENTER_X,
  118,
  BOARD_CARD_SPACING,
);

function getCardStatusLabel(card) {
  return card.exhausted || card.summoningSick ? "ESPERA" : "PRONTA";
}

function drawRoundedRect(scene, x, y, width, height, radius, fill, stroke) {
  const graphic = scene.add.graphics();
  graphic.fillStyle(fill, 1);
  graphic.fillRoundedRect(x, y, width, height, radius);
  graphic.lineStyle(2, stroke, 1);
  graphic.strokeRoundedRect(x, y, width, height, radius);
  return graphic;
}

function centerText(
  scene,
  x,
  y,
  text,
  size,
  color = "#f8fafc",
  weight = "700",
) {
  return scene.add
    .text(x, y, text, {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: `${size}px`,
      color,
      fontStyle: weight,
      align: "center",
      wordWrap: { width: 220 },
    })
    .setOrigin(0.5);
}

function getTextureFrameSize(scene, textureKey, frameKey) {
  const frame = scene.textures.getFrame(textureKey, frameKey);

  if (!frame) {
    return {
      width: HAND_CARD_WIDTH,
      height: HAND_CARD_HEIGHT,
    };
  }

  return {
    width: frame.cutWidth ?? frame.width,
    height: frame.cutHeight ?? frame.height,
  };
}

function fitSizePreservingAspect(
  sourceWidth,
  sourceHeight,
  maxWidth,
  maxHeight,
) {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const widthScale = Math.max(1, maxWidth) / safeSourceWidth;
  const heightScale = Math.max(1, maxHeight) / safeSourceHeight;
  const scale = Math.min(widthScale, heightScale);

  return {
    width: Math.max(1, Math.round(safeSourceWidth * scale)),
    height: Math.max(1, Math.round(safeSourceHeight * scale)),
  };
}

export class TcgScene extends Phaser.Scene {
  constructor() {
    super("tcg-scene");
    this.unsubscribe = null;
    this.selectedPlayerCardId = null;
    this.selectedNpcCardId = null;
    this.selectedBoardCardId = null;
    this.selectedBoardCardIndex = null;
    this.inspectedBoardCardId = null;
    this.inspectedBoardOwnerId = null;
    this.animatingPlayerCardId = null;
    this.animatingNpcCardId = null;
    this.animatingPlayerDrawCardId = null;
    this.animatingNpcDrawCardId = null;
    this.animatingDiscardCardIds = new Set();
    this.enteringBoardCardId = null;
    this.isCardPlayAnimating = false;
    this.isCardDrawAnimating = false;
    this.isTurnTransitionAnimating = false;
    this.turnAnnouncement = null;
    this.winnerPresentation = null;
    this.winnerPresentationKey = null;
    this.rematchPresentationControls = null;
    this.boardCardSelectionTweenId = null;
    this.boardCardContainers = new Map();
    this.attackDragGraphics = null;
    this.attackDragSource = null;
    this.pendingAttackDrag = null;
    this.handCardDropGraphics = null;
    this.handCardDropHint = null;
    this.handCardDrag = null;
    this.pendingHandCardDrag = null;
    this.activeHandCardHoverReset = null;
    this.boundPointerExitHandler = () => this.handlePointerExitGame();
    this.boundVisibilityChangeHandler = () => {
      if (document.hidden) this.handlePointerExitGame();
    };
    this.npcTurnInProgressForTurn = null;
    this.npcTurnTimers = [];
    this.npcChoicePreview = null;
    this.npcChoicePreviewCardId = null;
    this.npcAi = new AIController();
    this.npcTurnStartedAt = 0;
    this.previousRenderedState = null;
    this.lastAutomaticDrawAnimationKey = null;
    this.initialDealAnimationStarted = false;
    this.initialDealHiddenCardIds = new Set();
    this.initialDealAnimationsPending = 0;
    this.optionsMenuOpen = false;
    this.optionsMenuShouldAnimate = false;
    this.optionsMenuPanel = null;
    this.optionsMenuBackdrop = null;
    this.optionsMenuBackdropZone = null;
    this.optionsOverlayRoot = null;
    this.isGamePaused = false;
    this.pausedTurnRemainingMs = 0;
    this.onReady = null;
    this.onExitToMenu = null;
    this.onToggleChat = null;
    this.onGameResult = null;
    this.gameProgressResult = null;
    this.chatUnreadCount = 0;
    this.chatUnreadBadge = null;
    this.turnTimerKey = null;
    this.turnTimerEndsAt = 0;
    this.turnTimerText = null;
    this.turnTimerAutoEndedKey = null;
    this.turnTimerWarningKey = null;
    this.turnTimerWarning = null;
    this.turnTimerCountdown = null;
    this.turnTimerCountdownSecond = null;
    this.mulliganTimerText = null;
    this.multiplayerPauseTimerText = null;
    this.unsubscribeRemoteActions = null;
    this.logicalWidth = LOGICAL_GAME_WIDTH;
    this.logicalHeight = LOGICAL_GAME_HEIGHT;
    this.renderScale = 1;
  }

  init(data) {
    this.engine = data.engine;
    this.npcAi.setDifficulty(
      this.engine?.getState()?.config?.aiDifficulty ?? "medium",
    );
    this.onReady = data.onReady ?? null;
    this.onExitToMenu = data.onExitToMenu ?? null;
    this.onToggleChat = data.onToggleChat ?? null;
    this.onGameResult = data.onGameResult ?? null;
    this.logicalWidth = data.logicalWidth ?? LOGICAL_GAME_WIDTH;
    this.logicalHeight = data.logicalHeight ?? LOGICAL_GAME_HEIGHT;
    this.renderScale = data.renderScale ?? 1;
  }

  preload() {
    const cacheBust = "";

    if (this.textures.exists("arena-bg")) {
      this.textures.remove("arena-bg");
    }

    if (this.textures.exists("hud-frame")) {
      this.textures.remove("hud-frame");
    }

    avatarImageUrls.forEach((_url, index) => {
      const avatarKey = `avatar${index + 1}`;

      if (this.textures.exists(avatarKey)) {
        this.textures.remove(avatarKey);
      }
    });

    this.load.on("loaderror", (file) => {
      console.error("[Phaser] Erro ao carregar imagem:", file?.key, file);
    });

    this.load.image("arena-bg", arenaImageUrl + cacheBust);
    this.load.image("hud-frame", hudFrameImageUrl + cacheBust);
    this.load.image("health-bar-ui", healthBarImageUrl + cacheBust);
    this.load.image("mana-bar-ui", manaBarImageUrl + cacheBust);
    this.load.image("turn-info-ui", turnInfoImageUrl + cacheBust);
    this.load.image("options-menu-ui", optionsMenuImageUrl + cacheBust);
    Object.entries(uiButtonImageUrls).forEach(([name, url]) => {
      this.load.image(`ui-button-${name}`, url + cacheBust);
    });
    avatarImageUrls.forEach((url, index) => {
      this.load.image(`avatar${index + 1}`, url + cacheBust);
    });
    preloadHandCards(this, cacheBust);
  }

  create() {
    const addText = this.add.text.bind(this.add);
    this.add.text = (x, y, value, style = {}) =>
      addText(x, y, value, {
        ...style,
        resolution: style.resolution ?? this.renderScale,
      });
    this.renderRoot = this.add.container(0, 0);
    this.cameras.main.setViewport(
      0,
      0,
      this.game.renderer.width,
      this.game.renderer.height,
    );
    this.cameras.main.setZoom(this.renderScale);
    this.cameras.main.centerOn(this.logicalWidth / 2, this.logicalHeight / 2);
    this.cameras.main.setRoundPixels(false);
    this.input.on("pointermove", this.handleAttackPointerMove, this);
    this.input.on("pointerup", this.handleAttackPointerUp, this);
    this.input.on("gameout", this.handlePointerExitGame, this);
    this.game.canvas.addEventListener(
      "mouseleave",
      this.boundPointerExitHandler,
    );
    window.addEventListener("blur", this.boundPointerExitHandler);
    document.addEventListener(
      "visibilitychange",
      this.boundVisibilityChangeHandler,
    );

    setupCardFilters(this);
    gameAudio.preload();
    this.ensureHudResourceFrames();
    this.ensureInterfaceFrames();

    if (!this.engine) {
      console.error("[Phaser] Cena iniciada sem instancia do motor de jogo");
      return;
    }

    this.unsubscribe = this.engine.subscribe((state) => {
      let previousState = this.previousRenderedState;
      const canAnimateStateChange = !document.hidden;

      if (previousState?.winner && !state.winner) {
        this.resetSceneInteractionState();
        previousState = null;
      }

      this.syncMultiplayerPause(state);

      if (previousState && canAnimateStateChange) {
        this.prepareDiscardAnimations(previousState, state);
      }
      const shouldAnnouncePlayerTurn =
        canAnimateStateChange &&
        state.phase === "playing" &&
        !state.winner &&
        state.activePlayerIndex === PLAYER_INDEX &&
        (previousState?.phase !== "playing" ||
          previousState.activePlayerIndex !== PLAYER_INDEX);
      const queuedManaPenalty = previousState
        ? state.players
            .map((player, playerIndex) => ({
              playerIndex,
              amount: Math.max(
                0,
                (player.pendingManaPenalty ?? 0) -
                  (previousState.players[playerIndex]?.pendingManaPenalty ?? 0),
              ),
            }))
            .find((entry) => entry.amount > 0)
        : null;
      const appliedManaPenalty =
        previousState &&
        previousState.activePlayerIndex !== state.activePlayerIndex
          ? state.players[state.activePlayerIndex]?.lastManaPenaltyApplied ?? 0
          : 0;
      const fatigueEffects = this.getFatigueEffects(previousState, state);

      if (canAnimateStateChange) {
        if (previousState?.phase === "mulligan" && state.phase === "playing") {
          this.prepareInitialDealAnimation(state);
        } else if (previousState) {
          this.prepareAutomaticDrawAnimation(previousState, state);
        } else if (state.phase === "playing") {
          this.prepareInitialDealAnimation(state);
        }
      }

      this.isTurnTransitionAnimating = shouldAnnouncePlayerTurn;
      this.renderState(state);
      this.previousRenderedState = state;

      if (shouldAnnouncePlayerTurn) {
        this.animatePlayerTurnAnnouncement();
      }
      if (canAnimateStateChange && queuedManaPenalty) {
        this.showHeroEffect(
          queuedManaPenalty.playerIndex,
          "manaQueued",
          queuedManaPenalty.amount,
          120,
        );
      }
      if (canAnimateStateChange && appliedManaPenalty > 0) {
        this.showHeroEffect(
          state.activePlayerIndex,
          "manaPenalty",
          appliedManaPenalty,
          shouldAnnouncePlayerTurn ? 760 : 220,
        );
      }
      if (canAnimateStateChange) {
        fatigueEffects.forEach((effect, index) => {
          this.showHeroEffect(
            effect.playerIndex,
            "fatigue",
            effect.amount,
            (shouldAnnouncePlayerTurn ? 900 : 180) + index * 620,
          );
        });
      }
    });

    this.unsubscribeRemoteActions = this.engine.subscribeRemoteActions?.(
      (event) => this.handleRemoteMultiplayerAction(event),
    );

    const notifyReady = this.onReady;
    this.onReady = null;
    notifyReady?.();

    this.events.on("shutdown", () => {
      this.clearNpcTurnTimers();
      this.clearNpcChoicePreview();
      this.clearHandCardDrag();
      this.clearTurnTimerAlerts();
      this.input.off("pointermove", this.handleAttackPointerMove, this);
      this.input.off("pointerup", this.handleAttackPointerUp, this);
      this.input.off("gameout", this.handlePointerExitGame, this);
      this.game.canvas.removeEventListener(
        "mouseleave",
        this.boundPointerExitHandler,
      );
      window.removeEventListener("blur", this.boundPointerExitHandler);
      document.removeEventListener(
        "visibilitychange",
        this.boundVisibilityChangeHandler,
      );

      if (this.unsubscribe) {
        this.unsubscribe();
      }
      if (this.unsubscribeRemoteActions) {
        this.unsubscribeRemoteActions();
      }
    });
  }

  drawBoardBackground() {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const background = this.add.graphics();
    background.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x111827, 1);
    background.fillRect(0, 0, width, height);
    background.fillStyle(0x000000, 0.18);
    background.fillRect(0, 0, width, 44);
    background.fillRect(0, height - 44, width, 44);
    background.fillRect(0, 0, 44, height);
    background.fillRect(width - 44, 0, 44, height);

    if (this.textures.exists("arena-bg")) {
      const container = this.add.container(0, 0);
      const arenaWidth = width - ARENA_BACKGROUND_INSET_X * 2;
      const arenaHeight = height - ARENA_BACKGROUND_INSET_Y * 2;
      const arenaShadow = this.add.graphics();
      arenaShadow.fillStyle(0x000000, 0.44);
      arenaShadow.fillRoundedRect(
        ARENA_BACKGROUND_INSET_X - 8,
        ARENA_BACKGROUND_INSET_Y - 8,
        arenaWidth + 16,
        arenaHeight + 16,
        14,
      );

      const arenaBackground = this.add.image(width / 2, height / 2, "arena-bg");
      arenaBackground.setDisplaySize(arenaWidth, arenaHeight);
      arenaBackground.setOrigin(0.5);
      arenaBackground.setAlpha(1);
      arenaBackground.setBlendMode(Phaser.BlendModes.NORMAL);
      container.add([background, arenaShadow, arenaBackground]);
      return container;
    }

    const missingArenaText = centerText(
      this,
      width / 2,
      height / 2,
      "Imagem da arena nao carregada",
      24,
      "#fca5a5",
    );

    this.renderRoot.add(missingArenaText);
    return background;
  }

  drawHudPanel(player, x, y) {
    const width = HUD_FRAME_WIDTH;
    const height = HUD_FRAME_HEIGHT;
    const frame = this.textures.exists("hud-frame")
      ? this.add.image(x, y, "hud-frame").setOrigin(0)
      : drawRoundedRect(
          this,
          x,
          y,
          width,
          height,
          10,
          0x07111f,
          0x334155,
        );

    if (typeof frame.setDisplaySize === "function") {
      frame.setDisplaySize(width, height);
    }

    frame.setAlpha(0.96);
    frame.setDepth(1800);

    const textX = x + width / 2;

    const avatarKey = player.avatarKey ?? "avatar1";
    const avatar = this.textures.exists(avatarKey)
      ? this.add.image(textX, y + 70, avatarKey).setOrigin(0.5)
      : this.add
          .text(textX, y + 58, "Avatar", {
            fontFamily: "Trebuchet MS, Verdana, sans-serif",
            fontSize: "13px",
            color: "#f8fafc",
            fontStyle: "700",
            align: "center",
            fixedWidth: width - 28,
          })
          .setOrigin(0.5, 0);

    if (this.textures.exists(avatarKey) && typeof avatar.setDisplaySize === "function") {
      const avatarSize = getTextureFrameSize(this, avatarKey);
      const displaySize = fitSizePreservingAspect(
        avatarSize.width,
        avatarSize.height,
        HUD_AVATAR_MAX_WIDTH,
        HUD_AVATAR_MAX_HEIGHT,
      );
      avatar.setDisplaySize(displaySize.width, displaySize.height);
    }

    const name = this.add
      .text(textX, y + 133, player.name, {
        fontFamily: "Trebuchet MS, Verdana, sans-serif",
        fontSize: "12px",
        color: "#f8fafc",
        fontStyle: "700",
        align: "center",
        fixedWidth: width - 20,
        maxLines: 1,
      })
      .setOrigin(0.5, 0);

    const alignResourceX = (type) =>
      x < this.logicalWidth / 2
        ? x
        : x + width - HUD_RESOURCE_FRAMES[type].displayWidth;
    const healthBarY = y + height + HUD_RESOURCE_TOP_GAP;
    const manaBarY = healthBarY + HUD_RESOURCE_BAR_HEIGHT + HUD_RESOURCE_BAR_GAP;
    this.drawHudResourceBar(
      "health",
      Math.max(0, player.health),
      player.maxHealth,
      alignResourceX("health"),
      healthBarY,
    );
    this.drawHudResourceBar(
      "mana",
      Math.max(0, player.mana),
      player.maxMana,
      alignResourceX("mana"),
      manaBarY,
    );

    avatar.setDepth(1801);
    name.setDepth(1801);

    this.renderRoot.add([
      frame,
      avatar,
      name,
    ]);
  }

  ensureHudResourceFrames() {
    Object.values(HUD_RESOURCE_FRAMES).forEach((resource) => {
      if (!this.textures.exists(resource.textureKey)) return;
      const texture = this.textures.get(resource.textureKey);
      if (texture.has(resource.frameKey)) return;
      const { x, y, width, height } = resource.source;
      texture.add(resource.frameKey, 0, x, y, width, height);
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
  }

  ensureInterfaceFrames() {
    Object.entries(UI_FRAME_DEFINITIONS).forEach(([textureKey, definition]) => {
      if (!this.textures.exists(textureKey)) return;
      const texture = this.textures.get(textureKey);
      if (!texture.has(definition.frameKey)) {
        const { x, y, width, height } = definition.source;
        texture.add(definition.frameKey, 0, x, y, width, height);
      }
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
  }

  drawHudResourceBar(type, currentValue, maxValue, x, y) {
    const resource = HUD_RESOURCE_FRAMES[type];
    if (!resource || !this.textures.exists(resource.textureKey)) return;

    const safeMax = Math.max(1, maxValue ?? 1);
    const safeCurrent = Phaser.Math.Clamp(currentValue ?? 0, 0, safeMax);
    const ratio = safeCurrent / safeMax;
    const sourceScaleX = resource.displayWidth / resource.source.width;
    const sourceScaleY = HUD_RESOURCE_BAR_HEIGHT / resource.source.height;
    const fillX = x + resource.fill.x * sourceScaleX;
    const fillY = y + resource.fill.y * sourceScaleY;
    const fillWidth = resource.fill.width * sourceScaleX;
    const fillHeight = resource.fill.height * sourceScaleY;

    const sprite = this.add
      .image(x, y, resource.textureKey, resource.frameKey)
      .setOrigin(0)
      .setDisplaySize(resource.displayWidth, HUD_RESOURCE_BAR_HEIGHT)
      .setDepth(1800);
    const emptyFill = this.add.graphics().setDepth(1801);
    emptyFill.fillStyle(resource.emptyColor, 1);
    emptyFill.fillRoundedRect(fillX, fillY, fillWidth, fillHeight, 2);

    const activeFill = this.add
      .image(x, y, resource.textureKey, resource.frameKey)
      .setOrigin(0)
      .setDisplaySize(resource.displayWidth, HUD_RESOURCE_BAR_HEIGHT)
      .setVisible(ratio > 0)
      .setDepth(1802);
    if (ratio > 0) {
      activeFill.setCrop(
        resource.fill.x,
        resource.fill.y,
        resource.fill.width * ratio,
        resource.fill.height,
      );
    }

    const valueText = this.add
      .text(
        fillX + fillWidth / 2,
        fillY + fillHeight / 2,
        `${safeCurrent}/${safeMax}`,
        {
          fontFamily: "Trebuchet MS, Verdana, sans-serif",
          fontSize: "10px",
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#020617",
          strokeThickness: 2,
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(1803);

    this.renderRoot.add([sprite, emptyFill, activeFill, valueText]);
  }

  drawDeckPile(player, x, y) {
    if (player.deck.length === 0) {
      const emptySlot = this.add.graphics();
      emptySlot.fillStyle(0x020617, 0.54);
      emptySlot.fillRoundedRect(
        x - DECK_PILE_WIDTH / 2,
        y - DECK_PILE_HEIGHT / 2,
        DECK_PILE_WIDTH,
        DECK_PILE_HEIGHT,
        8,
      );
      emptySlot.lineStyle(2, 0x64748b, 0.62);
      emptySlot.strokeRoundedRect(
        x - DECK_PILE_WIDTH / 2,
        y - DECK_PILE_HEIGHT / 2,
        DECK_PILE_WIDTH,
        DECK_PILE_HEIGHT,
        8,
      );
      emptySlot.lineStyle(1, 0x94a3b8, 0.28);
      emptySlot.lineBetween(
        x - DECK_PILE_WIDTH / 2 + 10,
        y - DECK_PILE_HEIGHT / 2 + 10,
        x + DECK_PILE_WIDTH / 2 - 10,
        y + DECK_PILE_HEIGHT / 2 - 10,
      );
      emptySlot.lineBetween(
        x + DECK_PILE_WIDTH / 2 - 10,
        y - DECK_PILE_HEIGHT / 2 + 10,
        x - DECK_PILE_WIDTH / 2 + 10,
        y + DECK_PILE_HEIGHT / 2 - 10,
      );
      emptySlot.setDepth(700);

      const emptyText = centerText(this, x, y, "Vazio", 11, "#cbd5e1", "700");
      emptyText.setDepth(701);

      this.renderRoot.add([emptySlot, emptyText]);
      return;
    }

    if (!this.textures.exists("npc-card-back")) {
      return;
    }

    const cardFrame = getCardTextureFrame(this, "npc-card-back", true);
    const pile = this.add.container(x, y);
    pile.setDepth(700);
    const visibleCardCount = Math.min(player.deck.length, 3);

    for (let index = visibleCardCount - 1; index >= 0; index -= 1) {
      const card = this.add.image(
        index * 3,
        -index * 3,
        "npc-card-back",
        cardFrame,
      );
      card.setDisplaySize(DECK_PILE_WIDTH, DECK_PILE_HEIGHT);
      card.setOrigin(0.5);
      card.setAlpha(0.98);
      pile.add(card);
    }

    const countBadge = drawRoundedRect(
      this,
      x - DECK_COUNT_BADGE_WIDTH / 2,
      y - DECK_COUNT_BADGE_HEIGHT / 2,
      DECK_COUNT_BADGE_WIDTH,
      DECK_COUNT_BADGE_HEIGHT,
      7,
      0x07111f,
      0xe2e8f0,
    );
    countBadge.setAlpha(0.88);
    countBadge.setDepth(701);

    const countText = centerText(
      this,
      x,
      y,
      String(player.deck.length),
      11,
      "#ffffff",
    );
    countText.setDepth(702);

    this.renderRoot.add([pile, countBadge, countText]);
  }

  drawDiscardPile(player, x, y) {
    const visibleGraveyard = player.graveyard.filter(
      (card) => !this.animatingDiscardCardIds.has(card.instanceId),
    );

    if (visibleGraveyard.length === 0) {
      const emptySlot = this.add.graphics();
      emptySlot.fillStyle(0x020617, 0.46);
      emptySlot.fillRoundedRect(
        x - DECK_PILE_WIDTH / 2,
        y - DECK_PILE_HEIGHT / 2,
        DECK_PILE_WIDTH,
        DECK_PILE_HEIGHT,
        8,
      );
      emptySlot.lineStyle(2, 0x64748b, 0.48);
      emptySlot.strokeRoundedRect(
        x - DECK_PILE_WIDTH / 2,
        y - DECK_PILE_HEIGHT / 2,
        DECK_PILE_WIDTH,
        DECK_PILE_HEIGHT,
        8,
      );
      emptySlot.setDepth(700);

      const emptyText = centerText(this, x, y, "Desc.", 10, "#94a3b8", "800");
      emptyText.setDepth(701);

      this.renderRoot.add([emptySlot, emptyText]);
      return;
    }

    const topCard = visibleGraveyard[visibleGraveyard.length - 1];
    const textureKey = getCardTextureKey(this, topCard, "card-hand", "zoom");
    const textureFrame = getCardTextureFrame(this, textureKey, false);
    const pile = this.add.container(x, y);
    pile.setDepth(700);

    for (
      let index = Math.min(visibleGraveyard.length, 3) - 1;
      index >= 1;
      index -= 1
    ) {
      const shadowCard = this.add.graphics();
      shadowCard.fillStyle(0x0f172a, 0.76);
      shadowCard.fillRoundedRect(
        -DECK_PILE_WIDTH / 2 + index * 3,
        -DECK_PILE_HEIGHT / 2 - index * 3,
        DECK_PILE_WIDTH,
        DECK_PILE_HEIGHT,
        8,
      );
      shadowCard.lineStyle(1, 0x64748b, 0.45);
      shadowCard.strokeRoundedRect(
        -DECK_PILE_WIDTH / 2 + index * 3,
        -DECK_PILE_HEIGHT / 2 - index * 3,
        DECK_PILE_WIDTH,
        DECK_PILE_HEIGHT,
        8,
      );
      pile.add(shadowCard);
    }

    const card = this.add.image(0, 0, textureKey, textureFrame);
    card.setDisplaySize(DECK_PILE_WIDTH, DECK_PILE_HEIGHT);
    card.setOrigin(0.5);
    card.setAngle(-5);
    card.setAlpha(0.9);

    const tint = this.add.graphics();
    tint.fillStyle(0x020617, 0.2);
    tint.fillRoundedRect(
      -DECK_PILE_WIDTH / 2,
      -DECK_PILE_HEIGHT / 2,
      DECK_PILE_WIDTH,
      DECK_PILE_HEIGHT,
      8,
    );

    pile.add([card, tint]);

    const countBadge = drawRoundedRect(
      this,
      x + DECK_PILE_WIDTH / 2 - DISCARD_COUNT_BADGE_WIDTH / 2,
      y + DECK_PILE_HEIGHT / 2 - DISCARD_COUNT_BADGE_HEIGHT,
      DISCARD_COUNT_BADGE_WIDTH,
      DISCARD_COUNT_BADGE_HEIGHT,
      7,
      0x111827,
      0x94a3b8,
    );
    countBadge.setAlpha(0.92);
    countBadge.setDepth(701);

    const countText = centerText(
      this,
      x + DECK_PILE_WIDTH / 2,
      y + DECK_PILE_HEIGHT / 2 - DISCARD_COUNT_BADGE_HEIGHT / 2,
      String(player.graveyard.length),
      11,
      "#e2e8f0",
    );
    countText.setDepth(702);

    this.renderRoot.add([pile, countBadge, countText]);
  }

  getPlayerDeckPosition() {
    const endTurnTop =
      this.logicalHeight -
      END_TURN_BUTTON_HEIGHT -
      END_TURN_BUTTON_BOTTOM_MARGIN;

    return {
      x: this.logicalWidth - PLAYER_DECK_PILE_RIGHT_MARGIN,
      y:
        endTurnTop -
        DECK_CONTROL_VERTICAL_GAP -
        DECK_PILE_HEIGHT / 2,
    };
  }

  getDiscardPilePosition(playerIndex) {
    if (playerIndex === ENEMY_INDEX) {
      return {
        x: ENEMY_DECK_PILE_X + DISCARD_PILE_OFFSET_X,
        y: ENEMY_DECK_PILE_Y,
      };
    }

    const playerDeckPosition = this.getPlayerDeckPosition();
    return {
      x: playerDeckPosition.x - DISCARD_PILE_OFFSET_X,
      y: playerDeckPosition.y,
    };
  }

  getTurnTimerKey(state) {
    return `${state.turn}:${state.activePlayerIndex}`;
  }

  syncTurnTimer(state) {
    if (!state?.players || state.winner || state.phase !== "playing") {
      this.turnTimerText = null;
      this.turnTimerKey = null;
      this.turnTimerWarningKey = null;
      this.clearTurnTimerAlerts();
      return;
    }

    const timerKey = this.getTurnTimerKey(state);

    if (this.turnTimerKey === timerKey) {
      if (state.network?.turnEndsAt) {
        this.turnTimerEndsAt =
          this.time.now + Math.max(0, state.network.turnEndsAt - Date.now());
      }
      return;
    }

    this.turnTimerKey = timerKey;
    this.turnTimerAutoEndedKey = null;
    this.turnTimerWarningKey = null;
    this.clearTurnTimerAlerts();
    const serverRemainingMs = state.network?.turnEndsAt
      ? Math.max(0, state.network.turnEndsAt - Date.now())
      : TURN_DURATION_MS;
    this.turnTimerEndsAt = this.time.now + serverRemainingMs;
  }

  syncMultiplayerPause(state) {
    if (!this.engine?.isMultiplayer) {
      return;
    }

    const shouldPause = Boolean(state?.network?.paused);
    if (shouldPause === this.isGamePaused) {
      return;
    }

    this.isGamePaused = shouldPause;
    this.time.paused = shouldPause;
    if (shouldPause) {
      this.tweens.pauseAll();
      this.clearAttackDrag();
      this.clearHandCardDrag();
    } else {
      this.tweens.resumeAll();
      this.multiplayerPauseTimerText = null;
    }
  }

  clearTurnTimerAlerts() {
    if (this.turnTimerWarning?.active) {
      this.tweens.killTweensOf(this.turnTimerWarning);
      this.turnTimerWarning.destroy(true);
    }
    if (this.turnTimerCountdown?.container?.active) {
      const { container, ring, numberText } = this.turnTimerCountdown;
      this.tweens.killTweensOf([container, ring, numberText]);
      container.destroy(true);
    }

    this.turnTimerWarning = null;
    this.turnTimerCountdown = null;
    this.turnTimerCountdownSecond = null;
  }

  animateTurnTimerWarning() {
    if (this.turnTimerWarning?.active) {
      return;
    }

    const centerX = this.logicalWidth / 2;
    const centerY = this.logicalHeight / 2 - 92;
    const warning = this.add.container(centerX, centerY).setDepth(15800);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x020617, 0.88);
    shadow.fillRoundedRect(-142, -38, 284, 76, 10);
    shadow.lineStyle(2, 0xf59e0b, 0.94);
    shadow.strokeRoundedRect(-142, -38, 284, 76, 10);
    const flare = this.add.graphics();
    flare.fillStyle(0xf59e0b, 0.12);
    flare.fillRoundedRect(-132, -28, 264, 56, 8);
    const title = centerText(
      this,
      0,
      -9,
      `${TURN_WARNING_SECONDS} SEGUNDOS`,
      24,
      "#fef3c7",
      "900",
    );
    title.setStroke("#7c2d12", 4);
    const subtitle = centerText(
      this,
      0,
      18,
      "O TURNO ESTA ACABANDO",
      10,
      "#fdba74",
      "800",
    );

    warning.add([shadow, flare, title, subtitle]);
    warning.setAlpha(0);
    warning.setScale(0.7);
    this.turnTimerWarning = warning;
    this.tweens.add({
      targets: warning,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: flare,
          alpha: { from: 0.32, to: 0.08 },
          duration: 360,
          yoyo: true,
          repeat: 1,
        });
        this.time.delayedCall(1100, () => {
          if (!warning.active) {
            return;
          }
          this.tweens.add({
            targets: warning,
            y: centerY - 16,
            alpha: 0,
            duration: 360,
            ease: "Cubic.easeIn",
            onComplete: () => {
              if (this.turnTimerWarning === warning) {
                this.turnTimerWarning = null;
              }
              warning.destroy(true);
            },
          });
        });
      },
    });
  }

  createTurnTimerCountdown() {
    const container = this.add
      .container(this.logicalWidth / 2, this.logicalHeight / 2 - 36)
      .setDepth(15900);
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x02040a, 0.78);
    backdrop.fillCircle(0, 0, 58);
    backdrop.lineStyle(2, 0x7f1d1d, 0.72);
    backdrop.strokeCircle(0, 0, 58);
    const ring = this.add.graphics();
    ring.lineStyle(4, 0xef4444, 0.96);
    ring.strokeCircle(0, 0, 48);
    const numberText = centerText(
      this,
      0,
      -5,
      String(TURN_COUNTDOWN_SECONDS),
      54,
      "#fff7ed",
      "900",
    );
    numberText.setStroke("#7f1d1d", 7);
    const label = centerText(
      this,
      0,
      34,
      "TEMPO",
      10,
      "#fecaca",
      "900",
    );

    container.add([backdrop, ring, numberText, label]);
    this.turnTimerCountdown = { container, ring, numberText, label };
    return this.turnTimerCountdown;
  }

  animateTurnTimerCountdown(seconds) {
    if (this.turnTimerCountdownSecond === seconds) {
      return;
    }

    const countdown =
      this.turnTimerCountdown?.container?.active
        ? this.turnTimerCountdown
        : this.createTurnTimerCountdown();
    const { container, ring, numberText, label } = countdown;
    const critical = seconds <= 3;
    this.turnTimerCountdownSecond = seconds;
    numberText.setText(String(seconds));
    numberText.setColor(critical ? "#ffffff" : "#fff7ed");
    label.setText(seconds === 0 ? "TEMPO ESGOTADO" : "TEMPO");
    container.setAlpha(1);
    container.setScale(critical ? 1.42 : 1.28);
    ring.setAlpha(1);
    ring.setScale(0.72);
    numberText.setAlpha(1);
    this.tweens.killTweensOf([container, ring, numberText]);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: critical ? 210 : 280,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: ring,
      scaleX: critical ? 1.65 : 1.42,
      scaleY: critical ? 1.65 : 1.42,
      alpha: 0,
      duration: critical ? 620 : 760,
      ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: numberText,
      alpha: { from: 1, to: critical ? 0.72 : 0.88 },
      duration: 360,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

  }

  getRemainingTurnSeconds() {
    return Math.max(
      0,
      Math.ceil((this.turnTimerEndsAt - this.time.now) / 1000),
    );
  }

  formatTurnTimer() {
    const seconds = this.getRemainingTurnSeconds();
    return `Tempo ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60,
    ).padStart(2, "0")}`;
  }

  drawTurnBadge(state) {
    const activePlayer = state.players[state.activePlayerIndex];
    const width = TURN_BADGE_WIDTH;
    const height = TURN_BADGE_HEIGHT;
    const x = TURN_BADGE_X;
    const y = TURN_BADGE_Y;

    const badgeDefinition = UI_FRAME_DEFINITIONS["turn-info-ui"];
    const badge = this.add
      .image(x, y, "turn-info-ui", badgeDefinition.frameKey)
      .setOrigin(0)
      .setDisplaySize(width, height);

    const turnText = centerText(
      this,
      x + width / 2,
      y + 20,
      `Turno ${state.turn}`,
      12,
      "#3f1118",
      "900",
    );
    turnText.setFontFamily("Georgia, 'Times New Roman', serif");
    const activeText = centerText(
      this,
      x + width / 2,
      y + 37,
      activePlayer.name,
      11,
      "#7f1d1d",
      "900",
    );
    const timerText = centerText(
      this,
      x + width / 2,
      y + 55,
      this.formatTurnTimer(),
      11,
      "#20242a",
      "900",
    );

    this.turnTimerText = timerText;
    this.renderRoot.add([badge, turnText, activeText, timerText]);
  }

  playSound(key, options = {}) {
    requestSound(this.engine?.events, key, options);
  }

  animatePlayerTurnAnnouncement() {
    if (this.turnAnnouncement?.active) {
      this.turnAnnouncement.destroy(true);
    }

    this.playSound(SOUND_KEYS.turnBegin);

    const centerX = this.logicalWidth / 2;
    const centerY = this.logicalHeight / 2 - 18;
    const container = this.add.container(centerX, centerY);
    container.setDepth(15500);
    container.setAlpha(0);
    container.setScale(0.72);

    const glow = this.add.graphics();
    glow.fillStyle(0x0f172a, 0.94);
    glow.fillRoundedRect(-190, -48, 380, 96, 12);
    glow.lineStyle(2, 0xfacc15, 0.95);
    glow.strokeRoundedRect(-190, -48, 380, 96, 12);
    glow.lineStyle(1, 0xfef3c7, 0.5);
    glow.lineBetween(-160, -32, 160, -32);
    glow.lineBetween(-160, 32, 160, 32);

    const title = centerText(
      this,
      0,
      -8,
      "SEU TURNO",
      28,
      "#fef3c7",
      "900",
    );
    const subtitle = centerText(
      this,
      0,
      22,
      "Prepare sua jogada",
      12,
      "#e2e8f0",
      "700",
    );

    container.add([glow, title, subtitle]);
    this.turnAnnouncement = container;

    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(720, () => {
          this.tweens.add({
            targets: container,
            y: centerY - 20,
            alpha: 0,
            duration: 420,
            ease: "Cubic.easeIn",
            onComplete: () => {
              container.destroy(true);
              this.turnAnnouncement = null;
              this.isTurnTransitionAnimating = false;
              this.renderState(this.engine.getState());
            },
          });
        });
      },
    });
  }

  createOptionsActionIcon(type, color) {
    const icon = this.add.graphics();
    icon.fillStyle(color, 1);
    icon.lineStyle(2, color, 1);

    if (type === "pause") {
      icon.fillRoundedRect(-7, -9, 5, 18, 2);
      icon.fillRoundedRect(2, -9, 5, 18, 2);
    } else if (type === "play") {
      icon.fillTriangle(-5, -9, 9, 0, -5, 9);
    } else if (type === "restart") {
      icon.strokeCircle(0, 0, 8);
      icon.fillTriangle(-10, -7, -2, -9, -7, -1);
    } else {
      icon.lineBetween(-7, -10, -7, 10);
      icon.fillTriangle(-5, -9, 8, -5, -5, 1);
    }

    return icon;
  }

  openOptionsMenu() {
    if (this.optionsMenuOpen) {
      return;
    }

    this.optionsMenuOpen = true;
    this.optionsMenuShouldAnimate = !this.isGamePaused;
    window.dispatchEvent(new Event("blood-arena:options-open"));
    gameAudio.play(SOUND_KEYS.actionBarOpen);
    this.renderState(this.engine.getState());
  }

  closeOptionsMenu() {
    if (!this.optionsMenuOpen) {
      return;
    }

    gameAudio.play(SOUND_KEYS.actionBarClose);

    const finishClose = () => {
      this.optionsMenuOpen = false;
      this.optionsMenuShouldAnimate = false;
      this.optionsMenuPanel = null;
      this.optionsMenuBackdrop = null;
      this.optionsMenuBackdropZone = null;
      this.renderState(this.engine.getState());
    };

    if (
      this.isGamePaused ||
      !this.optionsMenuPanel?.active ||
      !this.optionsMenuBackdrop?.active
    ) {
      finishClose();
      return;
    }

    this.optionsMenuBackdropZone?.disableInteractive();
    this.tweens.add({
      targets: this.optionsMenuBackdrop,
      alpha: 0,
      duration: 170,
      ease: "Cubic.easeIn",
    });
    this.tweens.add({
      targets: this.optionsMenuPanel,
      y: this.optionsMenuPanel.y - 14,
      alpha: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 180,
      ease: "Cubic.easeIn",
      onComplete: finishClose,
    });
  }

  drawOptionsButton() {
    const x = OPTIONS_BUTTON_X;
    const y = OPTIONS_BUTTON_Y;
    const definition = UI_FRAME_DEFINITIONS["ui-button-options"];
    if (!this.textures.exists("ui-button-options")) return;

    const button = this.add
      .image(x, y, "ui-button-options", definition.frameKey)
      .setOrigin(0)
      .setDisplaySize(OPTIONS_BUTTON_WIDTH, OPTIONS_BUTTON_HEIGHT)
      .setDepth(OPTIONS_DEPTH);
    if (this.optionsMenuOpen) button.setTint(0xffd6d6);

    const zone = this.add
      .zone(x, y, OPTIONS_BUTTON_WIDTH, OPTIONS_BUTTON_HEIGHT)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(OPTIONS_DEPTH + 1);
    zone.on("pointerover", () => {
      button.setTint(0xffe4e4);
    });
    zone.on("pointerout", () => {
      button.setTint(this.optionsMenuOpen ? 0xffd6d6 : 0xffffff);
    });
    zone.on("pointerdown", (_pointer, _localX, _localY, event) => {
      event.stopPropagation();
      if (this.optionsMenuOpen) this.closeOptionsMenu();
      else this.openOptionsMenu();
    });

    this.renderRoot.add([button, zone]);
    if (this.optionsMenuOpen && !this.optionsOverlayRoot?.active) {
      this.drawOptionsMenu();
    }
  }

  drawChatButton() {
    if (!this.engine.isMultiplayer || !this.textures.exists("ui-button-chat")) {
      return;
    }

    const definition = UI_FRAME_DEFINITIONS["ui-button-chat"];
    const button = this.add
      .image(
        CHAT_BUTTON_X,
        CHAT_BUTTON_Y,
        "ui-button-chat",
        definition.frameKey,
      )
      .setOrigin(0)
      .setDisplaySize(CHAT_BUTTON_WIDTH, CHAT_BUTTON_HEIGHT)
      .setDepth(OPTIONS_DEPTH);
    const zone = this.add
      .zone(
        CHAT_BUTTON_X,
        CHAT_BUTTON_Y,
        CHAT_BUTTON_WIDTH,
        CHAT_BUTTON_HEIGHT,
      )
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(OPTIONS_DEPTH + 1);
    zone.on("pointerover", () => button.setTint(0xffe4e4));
    zone.on("pointerout", () => button.clearTint());
    zone.on("pointerdown", (_pointer, _localX, _localY, event) => {
      event.stopPropagation();
      gameAudio.play(SOUND_KEYS.uiButton);
      this.onToggleChat?.();
    });

    const badge = this.add
      .container(
        CHAT_BUTTON_X + CHAT_BUTTON_WIDTH - 5,
        CHAT_BUTTON_Y + 5,
      )
      .setDepth(OPTIONS_DEPTH + 2);
    const badgeBackground = this.add.graphics();
    badgeBackground.fillStyle(0xdc2626, 1);
    badgeBackground.fillCircle(0, 0, 9);
    badgeBackground.lineStyle(1.5, 0xffffff, 0.95);
    badgeBackground.strokeCircle(0, 0, 9);
    const badgeText = centerText(
      this,
      0,
      0,
      String(this.chatUnreadCount),
      9,
      "#ffffff",
      "900",
    );
    badge.add([badgeBackground, badgeText]);
    badge.setVisible(this.chatUnreadCount > 0);
    this.chatUnreadBadge = { container: badge, text: badgeText };

    this.renderRoot.add([button, zone, badge]);
  }

  setChatUnreadCount(count) {
    this.chatUnreadCount = Phaser.Math.Clamp(Number(count) || 0, 0, 99);
    if (!this.chatUnreadBadge?.container?.active) return;
    this.chatUnreadBadge.text.setText(String(this.chatUnreadCount));
    this.chatUnreadBadge.container.setVisible(this.chatUnreadCount > 0);
  }

  drawOptionsMenu() {
    const gameWidth = this.logicalWidth;
    const gameHeight = this.logicalHeight;
    const panelWidth = 300;
    const panelHeight = Math.round(panelWidth * (741 / 509));
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x02040a, 0.78);
    backdrop.fillRect(0, 0, gameWidth, gameHeight);
    backdrop.setDepth(OPTIONS_DEPTH + 5);

    const backdropZone = this.add
      .zone(0, 0, gameWidth, gameHeight)
      .setOrigin(0)
      .setInteractive()
      .setDepth(OPTIONS_DEPTH + 6);
    backdropZone.on("pointerdown", () => this.closeOptionsMenu());

    const panel = this.add.container(centerX, centerY).setDepth(OPTIONS_DEPTH + 10);
    const menuDefinition = UI_FRAME_DEFINITIONS["options-menu-ui"];
    const surface = this.add.graphics();
    surface.fillStyle(0x25282d, 0.98);
    surface.fillRoundedRect(
      -panelWidth / 2 + 20,
      -panelHeight / 2 + 22,
      panelWidth - 40,
      panelHeight - 44,
      22,
    );
    const frame = this.add
      .image(0, 0, "options-menu-ui", menuDefinition.frameKey)
      .setDisplaySize(panelWidth, panelHeight);
    const title = centerText(
      this,
      0,
      -panelHeight / 2 + 43,
      "OP\u00c7\u00d5ES",
      17,
      "#b83b49",
      "900",
    );
    title.setFontFamily("Georgia, 'Times New Roman', serif");
    title.setStroke("#2b0b10", 2);
    title.setShadow(0, 2, "#050505", 2, true, true);

    panel.add([surface, frame, title]);
    const isMultiplayer = this.engine.isMultiplayer;
    this.drawOptionsArtButton(
      panel,
      isMultiplayer ? -104 : -120,
      "ui-button-back",
      () => this.closeOptionsMenu(),
    );
    this.drawOptionsArtButton(
      panel,
      isMultiplayer ? -45 : -61,
      this.isGamePaused ? "ui-button-continue" : "ui-button-pause",
      () => this.toggleGamePause(),
    );
    if (!isMultiplayer) {
      this.drawOptionsArtButton(panel, -2, "ui-button-restart", () =>
        this.handleRestartGame(),
      );
    }
    if (isMultiplayer) {
      this.drawOptionsArtButton(panel, 14, "ui-button-concede", () =>
        this.handleConcedeGame(),
      );
    }
    this.drawOptionsVolumeControl(panel, isMultiplayer ? 91 : 62);
    if (!isMultiplayer) {
      this.drawOptionsArtButton(panel, 145, "ui-button-exit", () =>
        this.handleExitGame(),
      );
    }

    const overlayRoot = this.add
      .container(0, 0, [backdrop, backdropZone, panel])
      .setDepth(1000000);
    this.optionsOverlayRoot = overlayRoot;
    this.optionsMenuPanel = panel;
    this.optionsMenuBackdrop = backdrop;
    this.optionsMenuBackdropZone = backdropZone;

    const shouldAnimate = this.optionsMenuShouldAnimate && !this.isGamePaused;
    this.optionsMenuShouldAnimate = false;
    if (shouldAnimate) {
      backdrop.setAlpha(0);
      panel.setAlpha(0);
      panel.setScale(0.84);
      panel.setY(centerY - 16);
      this.tweens.add({ targets: backdrop, alpha: 1, duration: 220 });
      this.tweens.add({
        targets: panel,
        y: centerY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 320,
        ease: "Back.easeOut",
      });
    }
  }

  drawOptionsArtButton(parent, y, textureKey, onClick) {
    const definition = UI_FRAME_DEFINITIONS[textureKey];
    if (!definition || !this.textures.exists(textureKey)) return;
    const width = 232;
    const height = Math.round(
      width * (definition.source.height / definition.source.width),
    );
    const item = this.add.container(0, y);
    const image = this.add
      .image(0, 0, textureKey, definition.frameKey)
      .setDisplaySize(width, height);
    const zone = this.add
      .zone(0, 0, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => {
      image.setTint(0xffe4e4);
      this.tweens.add({
        targets: item,
        scaleX: 1.035,
        scaleY: 1.035,
        duration: 100,
      });
    });
    zone.on("pointerout", () => {
      image.clearTint();
      this.tweens.add({ targets: item, scaleX: 1, scaleY: 1, duration: 100 });
    });
    zone.on("pointerdown", (_pointer, _localX, _localY, event) => {
      event.stopPropagation();
      gameAudio.play(SOUND_KEYS.uiButton);
      onClick();
    });
    item.add([image, zone]);
    parent.add(item);
  }

  createThemedArtButton(x, y, width, textureKey, onClick) {
    const definition = UI_FRAME_DEFINITIONS[textureKey];
    if (!definition || !this.textures.exists(textureKey)) return null;
    const height = Math.round(
      width * (definition.source.height / definition.source.width),
    );
    const container = this.add.container(x, y);
    const image = this.add
      .image(0, 0, textureKey, definition.frameKey)
      .setDisplaySize(width, height);
    const zone = this.add
      .zone(0, 0, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => image.setTint(0xffe4e4));
    zone.on("pointerout", () => image.clearTint());
    zone.on("pointerdown", (_pointer, _x, _y, event) => {
      event.stopPropagation();
      gameAudio.play(SOUND_KEYS.uiButton);
      onClick();
    });
    container.add([image, zone]);
    return { container, image, zone };
  }

  drawOptionsVolumeControl(parent, y) {
    const item = this.add.container(0, y);
    const background = this.add.graphics();
    const track = this.add.graphics();
    const label = centerText(this, -64, -16, "VOLUME", 8, "#e6c57e", "900");
    const value = centerText(this, 0, -16, "", 9, "#fff7ed", "900");
    const muteLabel = centerText(this, 62, -16, "", 7, "#f8fafc", "900");
    const minus = centerText(this, -84, 9, "-", 17, "#e6c57e", "900");
    const plus = centerText(this, 84, 9, "+", 16, "#e6c57e", "900");
    const trackX = -60;
    const trackY = 5;
    const trackWidth = 120;
    const drawControl = () => {
      const settings = gameAudio.getSettings();
      background.clear();
      background.fillStyle(0x3a1118, 0.97);
      background.fillRoundedRect(-97, -28, 194, 56, 7);
      background.lineStyle(1.5, 0x9f7442, 0.92);
      background.strokeRoundedRect(-97, -28, 194, 56, 7);
      background.fillStyle(0x6f1d29, 0.35);
      background.fillRoundedRect(-92, -24, 184, 20, 5);
      track.clear();
      track.fillStyle(0x2a1117, 1);
      track.fillRoundedRect(trackX, trackY, trackWidth, 8, 4);
      track.fillStyle(settings.muted ? 0x4b5563 : 0xb91c1c, 1);
      track.fillRoundedRect(trackX, trackY, trackWidth * settings.volume, 8, 4);
      track.fillStyle(settings.muted ? 0x94a3b8 : 0xfca5a5, 1);
      track.fillCircle(trackX + trackWidth * settings.volume, trackY + 4, 6);
      value.setText(`${Math.round(settings.volume * 100)}%`);
      muteLabel.setText(settings.muted ? "DESLIGADO" : "LIGADO");
      muteLabel.setColor(settings.muted ? "#94a3b8" : "#86efac");
    };
    const setFromPointer = (pointer) => {
      const position = this.getAttackPointerPosition(pointer);
      const localPoint = item
        .getWorldTransformMatrix()
        .applyInverse(position.x, position.y);
      const ratio = Phaser.Math.Clamp(
        (localPoint.x - trackX) / trackWidth,
        0,
        1,
      );
      gameAudio.setVolume(ratio);
      gameAudio.setMuted(false);
      drawControl();
    };
    const adjustVolume = (delta) => {
      const settings = gameAudio.getSettings();
      gameAudio.setVolume(Phaser.Math.Clamp(settings.volume + delta, 0, 1));
      gameAudio.setMuted(false);
      gameAudio.play(SOUND_KEYS.uiButton, { gain: 0.55 });
      drawControl();
    };
    drawControl();

    const trackZone = this.add
      .zone(0, trackY + 4, trackWidth + 12, 22)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(trackZone);
    trackZone.on("pointerdown", (pointer, _x, _y, event) => {
      event.stopPropagation();
      setFromPointer(pointer);
    });
    trackZone.on("drag", (pointer) => setFromPointer(pointer));
    const minusZone = this.add
      .zone(-84, 9, 26, 26)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    minusZone.on("pointerdown", (_pointer, _x, _y, event) => {
      event.stopPropagation();
      adjustVolume(-0.1);
    });
    const plusZone = this.add
      .zone(84, 9, 26, 26)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    plusZone.on("pointerdown", (_pointer, _x, _y, event) => {
      event.stopPropagation();
      adjustVolume(0.1);
    });
    const muteZone = this.add
      .zone(62, -16, 62, 20)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    muteZone.on("pointerdown", (_pointer, _x, _y, event) => {
      event.stopPropagation();
      const wasMuted = gameAudio.getSettings().muted;
      if (!wasMuted) gameAudio.play(SOUND_KEYS.uiButton, { gain: 0.55 });
      gameAudio.toggleMuted();
      if (wasMuted) gameAudio.play(SOUND_KEYS.uiButton);
      drawControl();
    });

    item.add([
      background,
      track,
      label,
      value,
      muteLabel,
      minus,
      plus,
      trackZone,
      minusZone,
      plusZone,
      muteZone,
    ]);
    parent.add(item);
  }

  drawOptionsMenuItem(
    parent,
    y,
    width,
    height,
    label,
    iconType,
    palette,
    onClick,
  ) {
    const item = this.add.container(0, y);
    const background = this.add.graphics();
    const drawBackground = (hovering = false) => {
      background.clear();
      background.fillStyle(palette.fill, hovering ? 1 : 0.9);
      background.fillRoundedRect(-width / 2, -height / 2, width, height, 7);
      background.lineStyle(
        hovering ? 2 : 1,
        palette.stroke,
        hovering ? 1 : 0.72,
      );
      background.strokeRoundedRect(-width / 2, -height / 2, width, height, 7);
      background.fillStyle(palette.stroke, hovering ? 0.22 : 0.12);
      background.fillRoundedRect(
        -width / 2 + 8,
        -height / 2 + 8,
        36,
        height - 16,
        6,
      );
    };
    drawBackground();

    const icon = this.createOptionsActionIcon(iconType, palette.icon);
    icon.setX(-width / 2 + 26);
    const text = this.add
      .text(-width / 2 + 54, 0, label, {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#f8fafc",
      })
      .setOrigin(0, 0.5);
    const arrow = this.add
      .text(width / 2 - 23, 0, ">", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#94a3b8",
      })
      .setOrigin(0.5);
    const zone = this.add
      .zone(0, 0, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => {
      drawBackground(true);
      arrow.setColor("#f8fafc");
      this.tweens.add({
        targets: item,
        scaleX: 1.018,
        scaleY: 1.018,
        duration: 110,
        ease: "Quad.easeOut",
      });
    });
    zone.on("pointerout", () => {
      drawBackground(false);
      arrow.setColor("#94a3b8");
      this.tweens.add({
        targets: item,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: "Quad.easeOut",
      });
    });
    zone.on("pointerdown", onClick);

    item.add([background, icon, text, arrow, zone]);
    parent.add(item);
  }

  toggleGamePause() {
    const state = this.engine?.getState();

    if (!state || state.phase !== "playing" || state.winner) {
      return;
    }

    if (this.engine.isMultiplayer) {
      if (state.network?.paused) {
        this.engine.resume();
      } else {
        this.engine.pause();
      }
      this.closeOptionsMenu();
      return;
    }

    if (this.isGamePaused) {
      this.isGamePaused = false;
      this.time.paused = false;
      this.tweens.resumeAll();
      this.turnTimerEndsAt = this.time.now + this.pausedTurnRemainingMs;
    } else {
      this.pausedTurnRemainingMs = Math.max(
        0,
        this.turnTimerEndsAt - this.time.now,
      );
      this.isGamePaused = true;
      this.time.paused = true;
      this.tweens.pauseAll();
      this.clearAttackDrag();
    }

    this.optionsMenuOpen = false;
    this.optionsMenuShouldAnimate = false;
    this.renderState(state);
  }

  drawPauseOverlay(state) {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const blocker = this.add
      .zone(0, 0, width, height)
      .setOrigin(0)
      .setInteractive();
    blocker.setDepth(PAUSE_OVERLAY_DEPTH);

    const shade = this.add.graphics();
    shade.fillStyle(0x020617, 0.74);
    shade.fillRect(0, 0, width, height);
    shade.setDepth(PAUSE_OVERLAY_DEPTH);

    const panelWidth = 300;
    const panelHeight = 116;
    const panel = drawRoundedRect(
      this,
      width / 2 - panelWidth / 2,
      height / 2 - panelHeight / 2,
      panelWidth,
      panelHeight,
      10,
      0x07111f,
      0x94a3b8,
    );
    panel.setAlpha(0.96);
    panel.setDepth(PAUSE_OVERLAY_DEPTH + 1);

    const title = centerText(
      this,
      width / 2,
      height / 2 - 10,
      "JOGO PAUSADO",
      22,
      "#f8fafc",
      "900",
    );
    title.setDepth(PAUSE_OVERLAY_DEPTH + 2);
    const subtitle = centerText(
      this,
      width / 2,
      height / 2 + 20,
      this.engine.isMultiplayer
        ? "Pausa compartilhada - retomada automática em 30s"
        : "Abra as opções para continuar",
      11,
      "#cbd5e1",
      "700",
    );
    subtitle.setDepth(PAUSE_OVERLAY_DEPTH + 2);

    const timerText = this.engine.isMultiplayer
      ? centerText(
          this,
          width / 2,
          height / 2 + 42,
          "30s",
          13,
          "#fde68a",
          "900",
        )
      : null;
    timerText?.setDepth(PAUSE_OVERLAY_DEPTH + 2);
    this.multiplayerPauseTimerText = timerText;

    this.renderRoot.add([
      shade,
      blocker,
      panel,
      title,
      subtitle,
      ...(timerText ? [timerText] : []),
    ]);
    this.updateMultiplayerPauseTimer(state);
  }

  drawMulliganOverlay(state) {
    const player = state.players[PLAYER_INDEX];
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x020617, 0.72);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(6000);

    const panelWidth = Math.min(width - 40, 880);
    const panelHeight = 430;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const panel = drawRoundedRect(
      this,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      10,
      0x07111f,
      0x64748b,
    );
    panel.setAlpha(0.94);
    panel.setDepth(6001);

    const title = centerText(
      this,
      width / 2,
      panelY + 30,
      "Cartas iniciais",
      20,
      "#f8fafc",
      "900",
    );
    title.setDepth(6002);

    const subtitle = centerText(
      this,
      width / 2,
      panelY + 55,
      player.mulliganUsed
        ? "Voce ja trocou uma vez. Agora escolha comecar o jogo."
        : "Se não gostar dessas cartas, você pode trocar todas uma única vez.",
      12,
      "#cbd5e1",
      "700",
    );
    subtitle.setDepth(6002);

    const mulliganTimer = this.engine.isMultiplayer
      ? centerText(
          this,
          width / 2,
          panelY + 78,
          "30s",
          13,
          "#fde68a",
          "900",
        )
      : null;
    mulliganTimer?.setDepth(6002);
    this.mulliganTimerText = mulliganTimer;

    const startX =
      width / 2 -
      ((player.hand.length - 1) * MULLIGAN_CARD_SPACING) / 2;
    const cardY = panelY + 214;
    const cardObjects = [];

    player.hand.slice(0, INITIAL_DEAL_CARD_COUNT).forEach((card, index) => {
      const cardX = startX + index * MULLIGAN_CARD_SPACING;
      const textureKey = getCardTextureKey(this, card, "card-hand", "zoom");
      const textureFrame = getCardTextureFrame(this, textureKey, false);
      const image = this.add.image(cardX, cardY, textureKey, textureFrame);
      image.setDisplaySize(MULLIGAN_CARD_WIDTH, MULLIGAN_CARD_HEIGHT);
      image.setOrigin(0.5);
      image.setDepth(6003);

      cardObjects.push(image);
    });

    const buttonWidth = 174;
    const buttonHeight = 38;
    const buttonGap = 14;
    const rerollX = width / 2 - buttonWidth - buttonGap / 2;
    const startButtonX = width / 2 + buttonGap / 2;
    const buttonY = panelY + panelHeight - 50;
    const rerollDisabled = player.mulliganUsed || player.mulliganConfirmed;
    const rerollButton = drawRoundedRect(
      this,
      rerollX,
      buttonY,
      buttonWidth,
      buttonHeight,
      10,
      rerollDisabled ? 0x1f2937 : 0x7f1d1d,
      rerollDisabled ? 0x475569 : 0xfca5a5,
    );
    rerollButton.setAlpha(rerollDisabled ? 0.7 : 0.94);
    rerollButton.setDepth(6002);

    const rerollLabel = centerText(
      this,
      rerollX + buttonWidth / 2,
      buttonY + buttonHeight / 2,
      player.mulliganConfirmed
        ? "Escolha confirmada"
        : rerollDisabled
          ? "Troca usada"
          : "Trocar cartas",
      13,
      rerollDisabled ? "#94a3b8" : "#fff7ed",
      "900",
    );
    rerollLabel.setDepth(6003);

    const startButton = drawRoundedRect(
      this,
      startButtonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      10,
      0x14532d,
      0x86efac,
    );
    startButton.setAlpha(0.94);
    startButton.setDepth(6002);

    const startLabel = centerText(
      this,
      startButtonX + buttonWidth / 2,
      buttonY + buttonHeight / 2,
      player.mulliganConfirmed ? "Aguardando rival..." : "Começar jogo",
      13,
      "#f0fdf4",
      "900",
    );
    startLabel.setDepth(6003);

    const zones = [];

    if (!rerollDisabled) {
      const rerollZone = this.add
        .zone(rerollX, buttonY, buttonWidth, buttonHeight)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      rerollZone.setDepth(6004);
      rerollZone.on("pointerdown", () => {
        gameAudio.play(SOUND_KEYS.uiButton);
        this.engine.rerollMulligan(PLAYER_INDEX);
      });
      zones.push(rerollZone);
    }

    if (!player.mulliganConfirmed) {
      const confirmZone = this.add
        .zone(startButtonX, buttonY, buttonWidth, buttonHeight)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      confirmZone.setDepth(6004);
      confirmZone.on("pointerdown", () => {
        gameAudio.play(SOUND_KEYS.uiButton);
        this.engine.confirmMulligan();
      });
      zones.push(confirmZone);
    }

    this.renderRoot.add([
      overlay,
      panel,
      title,
      subtitle,
      ...(mulliganTimer ? [mulliganTimer] : []),
      ...cardObjects,
      rerollButton,
      rerollLabel,
      startButton,
      startLabel,
      ...zones,
    ]);
    this.updateMulliganTimer(state);
  }

  updateMulliganTimer(state = this.engine?.getState()) {
    if (!this.mulliganTimerText?.active || state?.phase !== "mulligan") {
      return;
    }

    const endsAt = state.network?.mulliganEndsAt;
    const remaining = endsAt
      ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      : 30;
    this.mulliganTimerText.setText(`${remaining}s`);
    this.mulliganTimerText.setColor(remaining <= 10 ? "#fca5a5" : "#fde68a");
  }

  updateMultiplayerPauseTimer(state = this.engine?.getState()) {
    if (!this.multiplayerPauseTimerText?.active || !state?.network?.paused) {
      return;
    }

    const endsAt = state.network.pauseEndsAt;
    const remaining = endsAt
      ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      : 30;
    this.multiplayerPauseTimerText.setText(`${remaining}s`);
  }

  updateTurnTimer() {
    const state = this.engine?.getState();

    if (
      !state?.players ||
      state.winner ||
      this.isGamePaused ||
      state.phase !== "playing" ||
      !this.turnTimerKey
    ) {
      return;
    }

    const remainingSeconds = this.getRemainingTurnSeconds();
    const timerKey = this.getTurnTimerKey(state);

    if (this.turnTimerText?.active) {
      this.turnTimerText.setText(this.formatTurnTimer());
      this.turnTimerText.setColor(
        remainingSeconds <= TURN_COUNTDOWN_SECONDS
          ? "#991b1b"
          : remainingSeconds <= TURN_WARNING_SECONDS
            ? "#854d0e"
            : "#20242a",
      );
    }

    if (
      remainingSeconds <= TURN_WARNING_SECONDS &&
      this.turnTimerWarningKey !== timerKey
    ) {
      this.turnTimerWarningKey = timerKey;
      this.animateTurnTimerWarning();
    }

    if (remainingSeconds <= TURN_COUNTDOWN_SECONDS) {
      this.animateTurnTimerCountdown(remainingSeconds);
    }

    if (remainingSeconds > 0) {
      return;
    }

    if (this.engine.isMultiplayer) {
      return;
    }

    if (
      this.turnTimerAutoEndedKey === timerKey ||
      this.isCardPlayAnimating ||
      this.isCardDrawAnimating
    ) {
      return;
    }

    this.turnTimerAutoEndedKey = timerKey;
    this.engine.endTurn();
  }

  update() {
    this.updateMulliganTimer();
    this.updateMultiplayerPauseTimer();
    this.keepOptionsOverlayOnTop();

    if (this.isGamePaused) {
      return;
    }

    this.updateTurnTimer();
  }

  keepOptionsOverlayOnTop() {
    if (!this.optionsMenuOpen || !this.optionsOverlayRoot?.active) {
      return;
    }

    this.optionsOverlayRoot.setDepth(1000000);
    this.children.bringToTop(this.optionsOverlayRoot);
  }

  drawEndTurnButton(state) {
    const width = END_TURN_BUTTON_WIDTH;
    const height = END_TURN_BUTTON_HEIGHT;
    const x = this.logicalWidth - width - END_TURN_BUTTON_RIGHT_MARGIN;
    const y = this.logicalHeight - height - END_TURN_BUTTON_BOTTOM_MARGIN;
    const isPlayerTurn = state.activePlayerIndex === PLAYER_INDEX;
    const disabled =
      Boolean(state.winner) ||
      this.isCardPlayAnimating ||
      this.isCardDrawAnimating ||
      this.isTurnTransitionAnimating ||
      this.isGamePaused ||
      !isPlayerTurn;

    if (!this.textures.exists("ui-button-end-turn")) return;
    const definition = UI_FRAME_DEFINITIONS["ui-button-end-turn"];
    const container = this.add.container(x + width / 2, y + height / 2);
    const button = this.add
      .image(0, 0, "ui-button-end-turn", definition.frameKey)
      .setDisplaySize(width, height)
      .setAlpha(disabled ? 0.42 : 0.96);
    const zone = this.add.zone(0, 0, width, height).setOrigin(0.5);

    if (!disabled) {
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => {
        button.setTint(0xffe5d0);
        this.tweens.add({
          targets: container,
          scaleX: 1.035,
          scaleY: 1.035,
          duration: 110,
          ease: "Quad.easeOut",
        });
      });
      zone.on("pointerout", () => {
        button.clearTint();
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: "Quad.easeOut",
        });
      });
      zone.on("pointerdown", () => {
        zone.disableInteractive();
        gameAudio.play(SOUND_KEYS.turnEnd);
        this.tweens.add({
          targets: container,
          scaleX: 0.93,
          scaleY: 0.93,
          duration: 90,
          yoyo: true,
          ease: "Quad.easeInOut",
          onComplete: () => this.engine.endTurn(),
        });
      });
    }

    container.add([button, zone]);
    this.renderRoot.add(container);
  }

  resetSceneInteractionState() {
    this.clearNpcTurnTimers();
    this.clearNpcChoicePreview();
    this.selectedPlayerCardId = null;
    this.selectedNpcCardId = null;
    this.selectedBoardCardId = null;
    this.selectedBoardCardIndex = null;
    this.inspectedBoardCardId = null;
    this.inspectedBoardOwnerId = null;
    this.animatingPlayerCardId = null;
    this.animatingNpcCardId = null;
    this.animatingPlayerDrawCardId = null;
    this.animatingNpcDrawCardId = null;
    this.animatingDiscardCardIds.clear();
    this.enteringBoardCardId = null;
    this.isCardPlayAnimating = false;
    this.isCardDrawAnimating = false;
    this.isTurnTransitionAnimating = false;
    if (this.turnAnnouncement?.active) {
      this.turnAnnouncement.destroy(true);
    }
    this.turnAnnouncement = null;
    if (this.winnerPresentation?.active) {
      this.winnerPresentation.destroy(true);
    }
    this.winnerPresentation = null;
    this.winnerPresentationKey = null;
    this.rematchPresentationControls = null;
    this.gameProgressResult = null;
    this.isGamePaused = false;
    this.optionsMenuOpen = false;
    this.optionsMenuShouldAnimate = false;
    this.optionsMenuPanel = null;
    this.optionsMenuBackdrop = null;
    this.optionsMenuBackdropZone = null;
    if (!this.optionsMenuOpen && this.optionsOverlayRoot?.active) {
      this.optionsOverlayRoot.destroy(true);
    }
    if (!this.optionsOverlayRoot?.active) {
      this.optionsOverlayRoot = null;
    }
    this.pausedTurnRemainingMs = 0;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.boardCardSelectionTweenId = null;
    this.boardCardContainers = new Map();
    this.attackDragGraphics = null;
    this.attackDragSource = null;
    this.pendingAttackDrag = null;
    this.clearHandCardDrag();
    this.npcTurnInProgressForTurn = null;
    this.previousRenderedState = null;
    this.lastAutomaticDrawAnimationKey = null;
    this.initialDealAnimationStarted = false;
    this.initialDealHiddenCardIds.clear();
    this.initialDealAnimationsPending = 0;
    this.turnTimerKey = null;
    this.turnTimerAutoEndedKey = null;
    this.turnTimerWarningKey = null;
    this.clearTurnTimerAlerts();
  }

  handleRestartGame() {
    this.optionsMenuOpen = false;
    this.resetSceneInteractionState();
    this.engine.reset();
  }

  handleExitGame() {
    if (this.engine.isMultiplayer) {
      return;
    }

    this.optionsMenuOpen = false;
    this.isGamePaused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.clearNpcTurnTimers();
    this.onExitToMenu?.();
  }

  handleConcedeGame() {
    this.optionsMenuOpen = false;
    this.isGamePaused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.engine.concede(PLAYER_INDEX);
    this.clearNpcTurnTimers();

    if (this.engine.isMultiplayer) {
      return;
    }

    this.time.delayedCall(3200, () => {
      if (typeof this.onExitToMenu === "function") {
        this.onExitToMenu();
      }
    });
  }

  getInspectedBoardCard(state) {
    if (!this.inspectedBoardCardId) {
      return null;
    }

    const players = this.inspectedBoardOwnerId
      ? state.players.filter((player) => player.id === this.inspectedBoardOwnerId)
      : state.players;

    for (const player of players) {
      const boardIndex = player.board.findIndex(
        (card) => card.instanceId === this.inspectedBoardCardId,
      );

      if (boardIndex >= 0) {
        return {
          card: player.board[boardIndex],
          player,
          boardIndex,
        };
      }
    }

    return null;
  }

  drawBoardInspectPanel(state) {
    const inspected = this.getInspectedBoardCard(state);

    if (!inspected) {
      return;
    }

    const { card } = inspected;
    const textureKey = getCardTextureKey(this, card, "card-hand", "zoom");

    if (!this.textures.exists(textureKey)) {
      return;
    }

    const frame = getCardTextureFrame(this, textureKey, false);
    const nativeSize = getTextureFrameSize(this, textureKey, frame);
    const previewSize = fitSizePreservingAspect(
      nativeSize.width,
      nativeSize.height,
      BOARD_INSPECT_CARD_MAX_WIDTH,
      BOARD_INSPECT_CARD_MAX_HEIGHT,
    );
    const x = this.logicalWidth - 88;
    const endTurnTop =
      this.logicalHeight -
      END_TURN_BUTTON_HEIGHT -
      END_TURN_BUTTON_BOTTOM_MARGIN;
    const lowestY = Math.round(
      endTurnTop -
        BOARD_INSPECT_PANEL_BOTTOM_GAP -
        previewSize.height / 2,
    );
    const y = Math.min(Math.round(this.logicalHeight / 2 + 8), lowestY);
    const preview = this.add.container(x, y);
    preview.setDepth(5200);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.36);
    shadow.fillRoundedRect(
      -previewSize.width / 2 + 3,
      -previewSize.height / 2 + 5,
      previewSize.width,
      previewSize.height,
      8,
    );

    const image = this.add.image(0, 0, textureKey, frame);
    image.setDisplaySize(previewSize.width, previewSize.height);
    image.setOrigin(0.5);

    preview.add([shadow, image]);
    this.renderRoot.add(preview);
  }

  drawWinnerPresentation(state) {
    if (!state.winner || this.isCardPlayAnimating) {
      return;
    }

    const winnerPlayer =
      state.players.find((player) => player.id === state.winnerId) ??
      state.players.find((player) => player.name === state.winner);
    const presentationKey = state.winnerId ?? state.winner;

    if (!winnerPlayer) {
      return;
    }

    if (
      this.winnerPresentation?.active &&
      this.winnerPresentationKey === presentationKey
    ) {
      this.updateRematchPresentation(state);
      return;
    }

    if (this.winnerPresentation?.active) {
      this.winnerPresentation.destroy(true);
    }

    this.playSound(
      winnerPlayer.id === state.players[PLAYER_INDEX]?.id
        ? SOUND_KEYS.gameWin
        : SOUND_KEYS.gameLose,
    );

    this.clearNpcTurnTimers();
    this.clearAttackDrag();
    this.isTurnTransitionAnimating = false;
    if (this.turnAnnouncement?.active) {
      this.turnAnnouncement.destroy(true);
      this.turnAnnouncement = null;
    }

    const isPlayerWinner = winnerPlayer.id === "p1";
    if (!this.engine.isMultiplayer && !this.gameProgressResult) {
      this.gameProgressResult = this.onGameResult?.({
        won: isPlayerWinner,
        deckId: state.config?.playerDeckId ?? state.players[PLAYER_INDEX]?.deckId,
        difficulty: state.config?.aiDifficulty ?? "easy",
      });
    }
    const progressResult = this.gameProgressResult;
    const accentColor = isPlayerWinner ? 0xfacc15 : 0xef4444;
    const accentCss = isPlayerWinner ? "#fde68a" : "#fca5a5";
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const presentation = this.add.container(0, 0);
    presentation.setDepth(20000);

    const blocker = this.add
      .zone(0, 0, width, height)
      .setOrigin(0)
      .setInteractive();
    const shade = this.add.graphics();
    shade.fillStyle(0x020617, 0.86);
    shade.fillRect(0, 0, width, height);
    shade.setAlpha(0);
    const revealFlash = this.add.graphics();
    revealFlash.fillStyle(accentColor, 0.38);
    revealFlash.fillRect(0, 0, width, height);
    revealFlash.setAlpha(0);
    const centerRing = this.add.graphics({ x: width / 2, y: height / 2 - 48 });
    centerRing.lineStyle(3, accentColor, 0.86);
    centerRing.strokeCircle(0, 0, 78);
    centerRing.setScale(0.35);
    centerRing.setAlpha(0);
    const titleLine = this.add.graphics({
      x: width / 2,
      y: height / 2 + 76,
    });
    titleLine.fillStyle(accentColor, 0.9);
    titleLine.fillRect(-142, -1, 284, 2);
    titleLine.setScale(0, 1);

    const winnerCard = this.add.container(
      isPlayerWinner
        ? PLAYER_HUD_FRAME_LEFT_MARGIN + HUD_FRAME_WIDTH / 2
        : width - ENEMY_HUD_FRAME_RIGHT_MARGIN - HUD_FRAME_WIDTH / 2,
      isPlayerWinner
        ? height -
            HUD_FRAME_HEIGHT -
            PLAYER_HUD_FRAME_BOTTOM_MARGIN +
            HUD_FRAME_HEIGHT / 2
        : ENEMY_HUD_FRAME_TOP_MARGIN + HUD_FRAME_HEIGHT / 2,
    );
    winnerCard.setAngle(isPlayerWinner ? -6 : 6);
    winnerCard.setAlpha(0);
    winnerCard.setScale(0.72);

    const halo = this.add.graphics();
    halo.fillStyle(accentColor, 0.14);
    halo.fillCircle(0, -4, 92);
    halo.lineStyle(2, accentColor, 0.55);
    halo.strokeCircle(0, -4, 88);

    const frame = this.textures.exists("hud-frame")
      ? this.add.image(0, 0, "hud-frame")
      : null;
    if (frame) {
      frame.setDisplaySize(HUD_FRAME_WIDTH, HUD_FRAME_HEIGHT);
    }

    const avatarKey = winnerPlayer.avatarKey ?? "avatar1";
    const avatar = this.textures.exists(avatarKey)
      ? this.add.image(0, -12, avatarKey)
      : centerText(this, 0, -12, "Avatar", 13, "#f8fafc", "700");
    if (this.textures.exists(avatarKey)) {
      const avatarSize = getTextureFrameSize(this, avatarKey);
      const displaySize = fitSizePreservingAspect(
        avatarSize.width,
        avatarSize.height,
        HUD_AVATAR_MAX_WIDTH,
        HUD_AVATAR_MAX_HEIGHT,
      );
      avatar.setDisplaySize(displaySize.width, displaySize.height);
    }

    const winnerName = centerText(
      this,
      0,
      62,
      winnerPlayer.name,
      13,
      "#ffffff",
      "900",
    );
    winnerCard.add([halo, ...(frame ? [frame] : []), avatar, winnerName]);

    const resultTitle = centerText(
      this,
      width / 2,
      height / 2 + 92,
      isPlayerWinner ? "VITÓRIA" : "DERROTA",
      32,
      accentCss,
      "900",
    );
    resultTitle.setStroke(isPlayerWinner ? "#713f12" : "#450a0a", 6);
    resultTitle.setScale(0.72);
    resultTitle.setAlpha(0);
    const resultText = centerText(
      this,
      width / 2,
      height / 2 + 126,
      progressResult
        ? `${progressResult.deckName} • ${progressResult.difficultyLabel}`
        : `${winnerPlayer.name} venceu a partida`,
      14,
      "#f8fafc",
      "800",
    );
    resultText.setAlpha(0);

    const progressElements = [];
    if (progressResult) {
      const progressPanel = this.add.graphics();
      progressPanel.fillStyle(0x12070a, 0.9);
      progressPanel.fillRoundedRect(width / 2 - 196, height / 2 + 140, 392, 62, 7);
      progressPanel.lineStyle(1, accentColor, 0.48);
      progressPanel.strokeRoundedRect(width / 2 - 196, height / 2 + 140, 392, 62, 7);
      progressPanel.setAlpha(0);

      const pointsText = centerText(
        this,
        width / 2,
        height / 2 + 153,
        `+${progressResult.pointsGained} pontos  •  Pontuação: ${progressResult.previousPoints} → ${progressResult.currentPoints}`,
        11,
        accentCss,
        "900",
      );
      const rankText = centerText(
        this,
        width / 2,
        height / 2 + 171,
        progressResult.rankUp
          ? `Rank: ${progressResult.previousRank} → ${progressResult.currentRank}`
          : `Rank atual: ${progressResult.currentRank}`,
        10,
        "#f8fafc",
        "800",
      );
      const nextRankText = centerText(
        this,
        width / 2,
        height / 2 + 189,
        progressResult.rankUp
          ? "Novo rank alcançado!"
          : progressResult.nextRank
            ? `Faltam ${progressResult.pointsToNextRank} pontos para ${progressResult.nextRank}`
            : "Rank máximo alcançado",
        10,
        progressResult.rankUp ? "#fde68a" : "#cbd5e1",
        "800",
      );
      pointsText.setAlpha(0);
      rankText.setAlpha(0);
      nextRankText.setAlpha(0);
      progressElements.push(progressPanel, pointsText, rankText, nextRankText);
    }

    const resultButtonY = height / 2 + (progressResult ? 222 : 175);
    const rematchArt = this.createThemedArtButton(
      width / 2 - 98,
      resultButtonY,
      176,
      "ui-button-rematch",
      () => {
        if (this.engine.isMultiplayer) {
          this.engine.requestRematch();
          rematchArt.image.setTint(0x94a3b8);
          rematchArt.zone.disableInteractive();
          return;
        }
        this.handleRestartGame();
      },
    );
    const backArt = this.createThemedArtButton(
      width / 2 + 98,
      resultButtonY,
      176,
      "ui-button-back",
      () => {
        if (typeof this.onExitToMenu === "function") {
          this.onExitToMenu();
        }
      },
    );
    rematchArt.container.setAlpha(0);
    backArt.container.setAlpha(0);
    rematchArt.zone.disableInteractive();
    backArt.zone.disableInteractive();

    const sparks = Array.from({ length: 30 }, (_item, index) => {
      const angle = (Math.PI * 2 * index) / 30;
      const spark = this.add.circle(width / 2, height / 2 - 36, 2, accentColor);
      spark.setAlpha(0);
      spark.setData(
        "targetX",
        width / 2 + Math.cos(angle) * (138 + (index % 4) * 20),
      );
      spark.setData(
        "targetY",
        height / 2 - 36 + Math.sin(angle) * (108 + (index % 5) * 14),
      );
      return spark;
    });

    presentation.add([
      shade,
      revealFlash,
      blocker,
      centerRing,
      ...sparks,
      winnerCard,
      titleLine,
      resultTitle,
      resultText,
      ...progressElements,
      rematchArt.container,
      backArt.container,
    ]);
    this.winnerPresentation = presentation;
    this.winnerPresentationKey = presentationKey;
    this.rematchPresentationControls = this.engine.isMultiplayer
      ? {
          statusText: resultText,
          rematchImage: rematchArt.image,
          rematchZone: rematchArt.zone,
        }
      : null;
    this.updateRematchPresentation(state);

    this.tweens.add({ targets: shade, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: revealFlash,
      alpha: { from: 0, to: 0.72 },
      delay: 110,
      duration: 120,
      yoyo: true,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: centerRing,
      alpha: { from: 0.92, to: 0 },
      scaleX: 2.45,
      scaleY: 2.45,
      delay: 160,
      duration: 760,
      ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: winnerCard,
      x: width / 2,
      y: height / 2 - 48,
      alpha: 1,
      scaleX: 1.45,
      scaleY: 1.45,
      angle: 0,
      duration: 780,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: halo,
          alpha: { from: 0.55, to: 1 },
          scaleX: { from: 1, to: 1.12 },
          scaleY: { from: 1, to: 1.12 },
          duration: 980,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });
    sparks.forEach((spark, index) => {
      this.tweens.add({
        targets: spark,
        x: spark.getData("targetX"),
        y: spark.getData("targetY"),
        alpha: { from: 0.95, to: 0 },
        delay: 360 + index * 12,
        duration: 900,
        ease: "Cubic.easeOut",
      });
    });
    this.tweens.add({
      targets: resultTitle,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      delay: 560,
      duration: 360,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: resultText,
      alpha: 1,
      delay: 760,
      duration: 360,
    });
    if (progressElements.length > 0) {
      this.tweens.add({
        targets: progressElements,
        alpha: 1,
        delay: 900,
        duration: 360,
      });
    }
    this.tweens.add({
      targets: titleLine,
      scaleX: 1,
      delay: 620,
      duration: 480,
      ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: [rematchArt.container, backArt.container],
      alpha: 1,
      delay: 1250,
      duration: 360,
      onComplete: () => {
        backArt.zone.setInteractive({ useHandCursor: true });
        if (this.engine.isMultiplayer) {
          this.updateRematchPresentation(this.engine.getState());
        } else {
          rematchArt.zone.setInteractive({ useHandCursor: true });
        }
      },
    });
  }

  updateRematchPresentation(state) {
    const controls = this.rematchPresentationControls;
    if (!this.engine.isMultiplayer || !controls || !state?.network) {
      return;
    }

    const localSlot = state.network.localSlot;
    const opponentSlot = localSlot === 0 ? 1 : 0;
    const votes = state.network.rematchVotes ?? [];
    const localRequested = votes.includes(localSlot);
    const opponentRequested = votes.includes(opponentSlot);
    const opponentConnected =
      state.network.connectedPlayers?.[opponentSlot] !== false;
    const opponentName = state.players[ENEMY_INDEX]?.name ?? "O adversário";

    if (localRequested && !opponentConnected) {
      controls.statusText.setText(
        `${opponentName} não aceitou e voltou ao menu.`,
      );
      controls.rematchImage.setTint(0x94a3b8);
      controls.rematchZone.disableInteractive();
      return;
    }

    if (!localRequested && !opponentConnected) {
      controls.statusText.setText(`${opponentName} voltou ao menu.`);
      controls.rematchImage.setTint(0x94a3b8);
      controls.rematchZone.disableInteractive();
      return;
    }

    if (localRequested) {
      controls.statusText.setText(
        `Pedido enviado. Aguardando ${opponentName} aceitar...`,
      );
      controls.rematchImage.setTint(0x94a3b8);
      controls.rematchZone.disableInteractive();
      return;
    }

    if (opponentRequested) {
      controls.statusText.setText(`${opponentName} pediu uma revanche.`);
      controls.rematchImage.clearTint();
      controls.rematchZone.setInteractive({ useHandCursor: true });
      return;
    }

    controls.rematchImage.clearTint();
    controls.rematchZone.setInteractive({ useHandCursor: true });
  }

  getBoardCardPose(slot, index, isEnemyCard = false) {
    const angle = BOARD_CARD_SLOT_ANGLES[index] ?? 0;
    const displayAngle = isEnemyCard
      ? ENEMY_BOARD_CARD_FACE_ANGLE - angle
      : angle;
    const heightScaleY = BOARD_CARD_HEIGHT_SCALE_Y;

    const displayWidth = BOARD_CARD_WIDTH;
    const displayHeight = BOARD_CARD_HEIGHT * heightScaleY;

    const cardX = slot.x + BOARD_CARD_WIDTH / 2;
    const cardY = slot.y + displayHeight / 2 + 12;

    return {
      x: cardX,
      y: cardY,
      scaleX: 1,
      scaleY: 1,
      displayWidth,
      displayHeight,
      angle,
      displayAngle,
      animationAngle: displayAngle,
      depth: BOARD_CARD_DEPTH_BASE + slot.y + index,
      projectedHeight: displayHeight,
      isEnemyCard,
      cardOffsetY: isEnemyCard ? -ENEMY_BOARD_CARD_FRONT_RAISE : 0,
      backEdgeRaise: isEnemyCard ? 0 : BOARD_CARD_BACK_EDGE_RAISE,
    };
  }

  createSummoningSickIndicator(cardWidth, cardHeight, cardOffsetY) {
    const indicator = this.add.container(
      cardWidth / 2 - 9,
      cardOffsetY - cardHeight / 2 + 12,
    );
    const glow = this.add.graphics();
    glow.fillStyle(0x0f172a, 0.94);
    glow.fillCircle(0, 0, 14);
    glow.lineStyle(1.5, 0x93c5fd, 0.95);
    glow.strokeCircle(0, 0, 14);

    const moon = this.add.graphics();
    moon.fillStyle(0xbfdbfe, 1);
    moon.fillCircle(-3, 2, 6);
    moon.fillStyle(0x0f172a, 1);
    moon.fillCircle(0, 0, 6);

    const largeZ = this.add
      .text(4, -5, "Z", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#1e3a8a",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    const smallZ = this.add
      .text(10, -12, "z", {
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        fontStyle: "bold",
        color: "#bfdbfe",
        stroke: "#172554",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    indicator.add([glow, moon, largeZ, smallZ]);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.58, to: 1 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.92, to: 1.08 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: [largeZ, smallZ],
      y: "-=5",
      alpha: { from: 0.45, to: 1 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return indicator;
  }

  createCardActionStateVisual(
    cardWidth,
    cardHeight,
    cardOffsetY,
    cardAngle,
    canActNow,
  ) {
    const color = canActNow ? 0x22c55e : 0xef4444;
    const visual = this.add.container(0, cardOffsetY);
    visual.setAngle(cardAngle);
    const tint = this.add.graphics();
    tint.fillStyle(color, canActNow ? 0.035 : 0.12);
    tint.fillRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      5,
    );
    const glow = this.add.graphics();
    glow.lineStyle(canActNow ? 5 : 4, color, canActNow ? 0.2 : 0.16);
    glow.strokeRoundedRect(
      -cardWidth / 2 - 2,
      -cardHeight / 2 - 2,
      cardWidth + 4,
      cardHeight + 4,
      7,
    );
    const frame = this.add.graphics();
    frame.lineStyle(canActNow ? 2 : 1.5, color, canActNow ? 0.96 : 0.82);
    frame.strokeRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      5,
    );
    const statusDot = this.add.circle(
      -cardWidth / 2 + 8,
      -cardHeight / 2 + 8,
      3.5,
      color,
      1,
    );
    statusDot.setStrokeStyle(1.5, 0xf8fafc, 0.9);
    visual.add([tint, glow, frame, statusDot]);

    this.tweens.add({
      targets: [glow, statusDot],
      alpha: { from: canActNow ? 0.45 : 0.58, to: 1 },
      scaleX: { from: 0.98, to: canActNow ? 1.04 : 1.01 },
      scaleY: { from: 0.98, to: canActNow ? 1.04 : 1.01 },
      duration: canActNow ? 680 : 1050,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    return visual;
  }

  drawPlayedCard(
    pose,
    cardData,
    onClick,
    isReady,
    canActNow,
    isSelectedForAction = false,
    attackDragHandlers = null,
  ) {
    const cardTextureKey = getCardTextureKey(
      this,
      cardData,
      "card-hand",
      "board",
    );

    if (!this.textures.exists(cardTextureKey)) {
      return;
    }

    const cardFrame = getCardTextureFrame(this, cardTextureKey, false);
    const nativeCardSize = getTextureFrameSize(this, cardTextureKey, cardFrame);

    const cardAngle =
      pose.displayAngle ??
      (pose.isEnemyCard ? -(pose.angle ?? 0) : (pose.angle ?? 0));
    const projectedHeight = pose.projectedHeight ?? BOARD_CARD_HEIGHT;
    const baseWidth = pose.displayWidth ?? BOARD_CARD_WIDTH;
    const baseHeight = pose.displayHeight ?? projectedHeight;
    const fittedSize = fitSizePreservingAspect(
      nativeCardSize.width,
      nativeCardSize.height,
      baseWidth,
      baseHeight,
    );
    const selectionScale = isSelectedForAction ? BOARD_CARD_SELECTED_SCALE : 1;
    const cardWidth = Math.max(
      1,
      Math.round(fittedSize.width * selectionScale),
    );
    const cardHeight = Math.max(
      1,
      Math.round(fittedSize.height * selectionScale),
    );
    const cardOffsetY = pose.cardOffsetY ?? 0;
    const shadowOffsetX = pose.isEnemyCard ? 2 : 3;
    const shadowOffsetY = pose.isEnemyCard ? cardOffsetY + 4 : 5;

    const shadow = this.add.graphics({ x: pose.x, y: pose.y });
    shadow.fillStyle(0x000000, isReady ? 0.32 : 0.18);

    shadow.fillRoundedRect(
      -cardWidth / 2 + shadowOffsetX,
      -cardHeight / 2 + shadowOffsetY,
      cardWidth,
      cardHeight,
      4,
    );

    if (cardAngle) {
      shadow.setAngle(cardAngle);
    }

    shadow.setDepth(pose.depth - 1);

    const supportEdge = this.add.graphics({ x: pose.x, y: pose.y });
    supportEdge.fillStyle(0x020617, pose.isEnemyCard ? 0.16 : 0);
    supportEdge.fillRoundedRect(
      -cardWidth / 2,
      cardHeight / 2 - 10 + (pose.isEnemyCard ? cardOffsetY + 3 : 0),
      cardWidth,
      10,
      4,
    );

    if (cardAngle) {
      supportEdge.setAngle(cardAngle);
    }

    supportEdge.setDepth(pose.depth - 0.5);

    const cardContainer = this.add.container(pose.x, pose.y);
    cardContainer.setDepth(pose.depth);

    if (pose.shouldTweenSelection) {
      this.tweens.add({
        targets: cardContainer,
        y: pose.y - 4,
        duration: 140,
        ease: "Back.easeOut",
      });
    }

    const cardImage = this.add.image(0, 0, cardTextureKey, cardFrame);
    cardImage.setDisplaySize(cardWidth, cardHeight);
    cardImage.setOrigin(0.5, 0.5);
    cardImage.setY(cardOffsetY);
    cardImage.setAngle(cardAngle);
    cardImage.setAlpha(
      pose.isEnemyCard ? (isReady ? 1 : 0.72) : canActNow ? 1 : 0.64,
    );
    const actionStateVisual = !pose.isEnemyCard
      ? this.createCardActionStateVisual(
          cardWidth,
          cardHeight,
          cardOffsetY,
          cardAngle,
          canActNow,
        )
      : null;

    const selectionFrame = this.add.graphics();
    selectionFrame.lineStyle(2, BOARD_CARD_SELECTED_STROKE, 0.86);
    selectionFrame.strokeRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      10,
    );
    selectionFrame.setAngle(cardAngle);
    selectionFrame.setY(cardOffsetY);
    selectionFrame.setAlpha(isSelectedForAction ? 1 : 0);
    const tauntFrame = cardData.taunt ? this.add.graphics() : null;
    if (tauntFrame) {
      tauntFrame.lineStyle(2, 0x60a5fa, 0.94);
      tauntFrame.strokeRoundedRect(
        -cardWidth / 2 - 2,
        -cardHeight / 2 - 2,
        cardWidth + 4,
        cardHeight + 4,
        7,
      );
      tauntFrame.setAngle(cardAngle);
      tauntFrame.setY(cardOffsetY);
    }

    const currentHealth = Math.max(
      0,
      cardData.currentHealth ?? cardData.baseHealth ?? 0,
    );
    const baseHealth = Math.max(1, cardData.baseHealth ?? currentHealth);
    const healthRatio = currentHealth / baseHealth;
    const healthColor =
      healthRatio > 0.5 ? 0x22c55e : healthRatio > 0.25 ? 0xf59e0b : 0xef4444;
    const healthBadgeY =
      cardOffsetY + cardHeight / 2 + BOARD_CARD_HEALTH_BADGE_HEIGHT / 2 + 4;
    const healthBadge = this.add.graphics();
    healthBadge.fillStyle(0x020617, 0.92);
    healthBadge.fillRoundedRect(
      -BOARD_CARD_HEALTH_BADGE_WIDTH / 2,
      healthBadgeY - BOARD_CARD_HEALTH_BADGE_HEIGHT / 2,
      BOARD_CARD_HEALTH_BADGE_WIDTH,
      BOARD_CARD_HEALTH_BADGE_HEIGHT,
      6,
    );
    healthBadge.lineStyle(1, healthColor, 0.95);
    healthBadge.strokeRoundedRect(
      -BOARD_CARD_HEALTH_BADGE_WIDTH / 2,
      healthBadgeY - BOARD_CARD_HEALTH_BADGE_HEIGHT / 2,
      BOARD_CARD_HEALTH_BADGE_WIDTH,
      BOARD_CARD_HEALTH_BADGE_HEIGHT,
      6,
    );
    const healthText = this.add
      .text(0, healthBadgeY, `VIDA ${currentHealth}/${baseHealth}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#f8fafc",
        stroke: "#020617",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    const summoningSickIndicator = cardData.summoningSick
      ? this.createSummoningSickIndicator(
          cardWidth,
          cardHeight,
          cardOffsetY,
        )
      : null;

    let hoverFrame = null;
    const hideHoverFrame = () => {
      if (!hoverFrame) {
        return;
      }

      hoverFrame.destroy();
      hoverFrame = null;
    };
    const showHoverFrame = () => {
      if (this.isCardPlayAnimating || this.attackDragSource || hoverFrame) {
        return;
      }

      hoverFrame = this.add.graphics();
      hoverFrame.lineStyle(
        2,
        pose.isEnemyCard
          ? BOARD_CARD_HOVER_STROKE_ENEMY
          : BOARD_CARD_HOVER_STROKE_PLAYER,
        pose.isEnemyCard ? 0.72 : 0.82,
      );
      hoverFrame.strokeRoundedRect(
        -cardWidth / 2,
        -cardHeight / 2,
        cardWidth,
        cardHeight,
        10,
      );
      hoverFrame.setAngle(cardAngle);
      hoverFrame.setY(cardOffsetY);
      cardContainer.add(hoverFrame);
    };

    const hitboxWidth = Math.round(cardWidth * BOARD_CARD_HITBOX_SCALE_X);
    const hitboxHeight = Math.round(cardHeight * BOARD_CARD_HITBOX_SCALE_Y);
    const zone = this.add
      .zone(0, cardOffsetY, hitboxWidth, hitboxHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    zone.setAngle(cardAngle);
    zone.on("pointermove", showHoverFrame);
    zone.on("pointerout", hideHoverFrame);

    if (attackDragHandlers) {
      zone.on("pointerdown", (pointer) => {
        if (pointer.button !== 0) {
          return;
        }

        hideHoverFrame();
        this.prepareAttackDrag(pointer, attackDragHandlers.onStart, onClick);
      });
    } else {
      zone.on("pointerdown", (pointer) => {
        if (pointer.button !== 0) {
          return;
        }

        hideHoverFrame();
        onClick();
      });
    }

    cardContainer.add([
      cardImage,
      ...(actionStateVisual ? [actionStateVisual] : []),
      ...(tauntFrame ? [tauntFrame] : []),
      selectionFrame,
      healthBadge,
      healthText,
      ...(summoningSickIndicator ? [summoningSickIndicator] : []),
      zone,
    ]);

    this.renderRoot.add([shadow, supportEdge, cardContainer]);
    return cardContainer;
  }

  getPlayerHandCardCenter(handIndex, handCount) {
    return getPlayerHandCardCenter(
      this.logicalWidth,
      this.logicalHeight,
      handIndex,
      handCount,
      true,
    );
  }

  getNpcHandCardCenter(handIndex, handCount) {
    return getNpcHandCardCenter(
      this.logicalWidth,
      this.logicalHeight,
      handIndex,
      handCount,
      true,
    );
  }

  getPlayedCardDestination(card, player) {
    const textureKey = getCardTextureKey(this, card, "card-hand", "board");
    const textureFrame = getCardTextureFrame(this, textureKey, false);
    const nativeSize = getTextureFrameSize(this, textureKey, textureFrame);

    if (card.type !== "creature") {
      const spellSize = fitSizePreservingAspect(
        nativeSize.width,
        nativeSize.height,
        Math.round(HAND_CARD_WIDTH * 0.9),
        Math.round(HAND_CARD_HEIGHT * 0.9),
      );

      return {
        x: this.logicalWidth / 2,
        y: this.logicalHeight / 2,
        displayWidth: spellSize.width,
        displayHeight: spellSize.height,
        textureFrame,
      };
    }

    const slot = ALLY_BOARD_SLOTS[player.board.length];

    if (!slot) {
      return null;
    }

    return {
      ...this.getBoardCardPose(slot, player.board.length),
    };
  }

  getNpcPlayedCardDestination(card, npc) {
    const textureKey = getCardTextureKey(this, card, "card-hand", "board");
    const textureFrame = getCardTextureFrame(this, textureKey, false);
    const nativeSize = getTextureFrameSize(this, textureKey, textureFrame);

    if (card.type !== "creature") {
      const spellSize = fitSizePreservingAspect(
        nativeSize.width,
        nativeSize.height,
        Math.round(HAND_CARD_WIDTH * 0.9),
        Math.round(HAND_CARD_HEIGHT * 0.9),
      );

      return {
        x: this.logicalWidth / 2,
        y: this.logicalHeight / 2,
        displayWidth: spellSize.width,
        displayHeight: spellSize.height,
        textureFrame,
      };
    }

    const slot = ENEMY_BOARD_SLOTS[npc.board.length];

    if (!slot) {
      return null;
    }

    return {
      ...this.getBoardCardPose(slot, npc.board.length, true),
    };
  }

  getCardEffectFeedback(state, playerIndex, card, targetIndex = null) {
    const player = state.players[playerIndex];
    const opponentIndex = playerIndex === PLAYER_INDEX ? ENEMY_INDEX : PLAYER_INDEX;
    const opponent = state.players[opponentIndex];
    const manaAfterCost = Math.max(0, player.mana - (card.manaCost ?? 0));
    const restoredMana = card.onPlayMana
      ? Math.max(
          0,
          Math.min(card.onPlayMana, player.maxMana - manaAfterCost),
        )
      : 0;
    const restoredHealth = card.onPlayHeal
      ? Math.max(
          0,
          Math.min(card.onPlayHeal, player.maxHealth - player.health),
        )
      : 0;
    const directDamage = Math.max(0, card.onPlayDamage ?? card.damage ?? 0);
    const creatureDamageTargets = (card.enemyBoardDamage ?? 0) > 0
      ? opponent.board.map((target, index) => ({
          index,
          instanceId: target.instanceId,
          amount: card.enemyBoardDamage,
          destroyed: card.enemyBoardDamage >= target.currentHealth,
        }))
      : card.targetType === "enemyCreature" && opponent.board[targetIndex]
        ? [
            {
              index: targetIndex,
              instanceId: opponent.board[targetIndex].instanceId,
              amount: card.destroyTargetCreature
                ? opponent.board[targetIndex].currentHealth
                : card.targetCreatureDamage ?? 0,
              destroyed:
                card.destroyTargetCreature ||
                (card.targetCreatureDamage ?? 0) >=
                  opponent.board[targetIndex].currentHealth,
            },
          ]
        : [];

    return {
      playerIndex,
      opponentIndex,
      hasManaEffect: (card.onPlayMana ?? 0) > 0,
      hasHealthEffect: (card.onPlayHeal ?? 0) > 0,
      restoredMana,
      restoredHealth,
      directDamage: Math.min(directDamage, Math.max(0, opponent.health)),
      creatureDamageTargets,
      isLethalDamage:
        directDamage > 0 && directDamage >= Math.max(0, opponent.health),
    };
  }

  getHeroEffectAnchor(playerIndex, useStatsCard = false) {
    const frameX =
      playerIndex === PLAYER_INDEX
        ? PLAYER_HUD_FRAME_LEFT_MARGIN
        : this.logicalWidth - HUD_FRAME_WIDTH - ENEMY_HUD_FRAME_RIGHT_MARGIN;
    const frameY =
      playerIndex === PLAYER_INDEX
        ? this.logicalHeight - HUD_FRAME_HEIGHT - PLAYER_HUD_FRAME_BOTTOM_MARGIN
        : ENEMY_HUD_FRAME_TOP_MARGIN;

    return {
      x: frameX + HUD_FRAME_WIDTH / 2,
      y: useStatsCard
        ? frameY + HUD_FRAME_HEIGHT + HUD_RESOURCE_STACK_HEIGHT / 2
        : frameY + 70,
    };
  }

  getFatigueEffects(previousState, nextState) {
    if (!previousState?.players || !nextState?.players) return [];

    return nextState.players.flatMap((player, playerIndex) => {
      const previousFatigue = Math.max(
        0,
        previousState.players[playerIndex]?.fatigueDamage ?? 0,
      );
      const currentFatigue = Math.max(0, player.fatigueDamage ?? 0);

      return Array.from(
        { length: Math.max(0, currentFatigue - previousFatigue) },
        (_item, index) => ({
          playerIndex,
          amount: previousFatigue + index + 1,
        }),
      );
    });
  }

  showHeroEffect(playerIndex, type, amount, delay = 0, playSound = true) {
    const isFatigue = type === "fatigue";
    const isDamage = type === "damage" || isFatigue;

    if (amount <= 0 && isDamage) {
      return;
    }

    if (playSound && type === "mana" && amount > 0) {
      this.playSound(SOUND_KEYS.manaRestore, { gain: 0.72 });
    } else if (playSound && type === "health" && amount > 0) {
      const healthSound =
        amount >= 7
          ? SOUND_KEYS.waterBig
          : amount >= 4
            ? SOUND_KEYS.waterMedium
            : SOUND_KEYS.waterSmall;
      this.playSound(healthSound, { gain: 0.72 });
    } else if (playSound && isDamage && amount > 0) {
      this.playSound(SOUND_KEYS.genericDamage, { gain: 0.72 });
    } else if (
      playSound &&
      (type === "manaPenalty" || type === "manaQueued") &&
      amount > 0
    ) {
      this.playSound(SOUND_KEYS.colorlessMedium, { gain: 0.68 });
    }

    const isManaPenalty = type === "manaPenalty" || type === "manaQueued";
    const rawAnchor = this.getHeroEffectAnchor(playerIndex, !isDamage);
    const badgeWidth = isManaPenalty ? 176 : isFatigue ? 138 : 114;
    const horizontalMargin = Math.max(58, badgeWidth / 2 + 10);
    const anchor = {
      ...rawAnchor,
      x: Phaser.Math.Clamp(
        rawAnchor.x,
        horizontalMargin,
        this.logicalWidth - horizontalMargin,
      ),
    };
    const palette =
      type === "mana"
        ? { fill: 0x172554, stroke: 0x60a5fa, color: "#dbeafe" }
        : isFatigue
          ? { fill: 0x240b2f, stroke: 0xe879f9, color: "#fae8ff" }
        : isManaPenalty
          ? { fill: 0x2e1065, stroke: 0xc084fc, color: "#f3e8ff" }
        : type === "health"
          ? { fill: 0x052e16, stroke: 0x4ade80, color: "#dcfce7" }
          : { fill: 0x450a0a, stroke: 0xf87171, color: "#fee2e2" };
    const label =
      type === "mana"
        ? amount > 0
          ? `+${amount} MANA`
          : "MANA CHEIA"
        : type === "manaQueued"
          ? `-${amount} MANA PROX. TURNO`
          : type === "manaPenalty"
            ? `-${amount} MANA NESTE TURNO`
        : type === "health"
          ? amount > 0
            ? `+${amount} VIDA`
            : "VIDA CHEIA"
          : isFatigue
            ? `-${amount} FADIGA`
          : `-${amount} VIDA`;
    const effect = this.add
      .container(anchor.x, anchor.y)
      .setDepth(isFatigue ? 20500 : 16500);
    const halo = this.add.graphics();
    halo.fillStyle(palette.stroke, 0.16);
    halo.fillCircle(0, 0, 34);
    halo.lineStyle(2, palette.stroke, 0.78);
    halo.strokeCircle(0, 0, 29);
    const background = this.add.graphics();
    background.fillStyle(palette.fill, 0.96);
    background.fillRoundedRect(-badgeWidth / 2, -19, badgeWidth, 38, 10);
    background.lineStyle(2, palette.stroke, 1);
    background.strokeRoundedRect(-badgeWidth / 2, -19, badgeWidth, 38, 10);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: isManaPenalty ? "12px" : "16px",
        fontStyle: "bold",
        color: palette.color,
        stroke: "#020617",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const particles = Array.from({ length: 8 }, (_item, index) => {
      const angle = (Math.PI * 2 * index) / 8;
      const particle = this.add.circle(0, 0, 2.5, palette.stroke, 1);
      particle.setData("targetX", Math.cos(angle) * 48);
      particle.setData("targetY", Math.sin(angle) * 34);
      return particle;
    });

    effect.add([halo, ...particles, background, text]);
    effect.setAlpha(0);
    effect.setScale(0.65);

    this.tweens.add({
      targets: effect,
      alpha: 1,
      scaleX: 1.06,
      scaleY: 1.06,
      delay,
      duration: 220,
      ease: "Back.easeOut",
      onStart: () => {
        if (isDamage) {
          this.cameras.main.shake(110, 0.0022);
        }
      },
      onComplete: () => {
        particles.forEach((particle) => {
          this.tweens.add({
            targets: particle,
            x: particle.getData("targetX"),
            y: particle.getData("targetY"),
            alpha: 0,
            duration: 520,
            ease: "Cubic.easeOut",
          });
        });
        this.tweens.add({
          targets: halo,
          scaleX: 1.45,
          scaleY: 1.45,
          alpha: 0,
          duration: 620,
          ease: "Cubic.easeOut",
        });
        this.tweens.add({
          targets: effect,
          y: anchor.y - 42,
          alpha: 0,
          delay: 850,
          duration: 620,
          ease: "Cubic.easeIn",
          onComplete: () => effect.destroy(true),
        });
      },
    });
  }

  getDamageSpellPalette(effectType) {
    const palettes = {
      arcane: {
        outer: 0x38bdf8,
        core: 0xf8fafc,
        secondary: 0xe11d48,
      },
      shadow: {
        outer: 0xbe123c,
        core: 0x450a0a,
        secondary: 0x111827,
      },
      ash: {
        outer: 0xf97316,
        core: 0xfef3c7,
        secondary: 0x64748b,
      },
      fire: {
        outer: 0xf97316,
        core: 0xfef08a,
        secondary: 0xdc2626,
      },
      volcanic: {
        outer: 0xff6b1a,
        core: 0x292524,
        secondary: 0xfacc15,
      },
      bloodfire: {
        outer: 0xef4444,
        core: 0xfecaca,
        secondary: 0x7f1d1d,
      },
      meteor: {
        outer: 0xfb923c,
        core: 0x1c1917,
        secondary: 0xfacc15,
      },
    };

    return palettes[effectType] ?? palettes.arcane;
  }

  createDamageSpellProjectile(effectType, palette) {
    const projectile = this.add.container(0, 0);
    const fireLikeEffects = new Set([
      "ash",
      "fire",
      "volcanic",
      "bloodfire",
      "meteor",
    ]);
    const tails = fireLikeEffects.has(effectType)
      ? Array.from({ length: 3 }, (_item, index) => {
          const tail = this.add.triangle(
            -12 - index * 6,
            (index - 1) * 4,
            -14,
            -6,
            8,
            0,
            -14,
            6,
            effectType === "ash" && index === 2
              ? palette.secondary
              : index % 2 === 0
                ? palette.outer
                : palette.secondary,
            0.72 - index * 0.12,
          );
          tail.setBlendMode(Phaser.BlendModes.ADD);
          return tail;
        })
      : effectType === "shadow"
        ? Array.from({ length: 3 }, (_item, index) =>
            this.add.circle(
              -12 - index * 7,
              (index - 1) * 4,
              6 - index,
              index % 2 === 0 ? palette.secondary : palette.outer,
              0.46 - index * 0.08,
            ),
          )
        : [];
    const aura = this.add.circle(0, 0, 17, palette.outer, 0.18);
    aura.setBlendMode(Phaser.BlendModes.ADD);
    const glow = this.add.circle(0, 0, 10, palette.outer, 0.76);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    let core;

    if (effectType === "arcane") {
      core = this.add.polygon(
        0,
        0,
        [0, -13, 9, 0, 0, 13, -9, 0],
        palette.secondary,
        1,
      );
      core.setStrokeStyle(2, palette.core, 0.95);
    } else if (effectType === "volcanic" || effectType === "meteor") {
      core = this.add.polygon(
        0,
        0,
        [-10, -7, 2, -11, 11, -2, 7, 10, -7, 8, -12, 1],
        palette.core,
        1,
      );
      core.setStrokeStyle(2, palette.secondary, 0.92);
    } else {
      core = this.add.circle(0, 0, 7.5, palette.core, 1);
      core.setStrokeStyle(2, palette.secondary, 0.95);
    }

    const satellites = Array.from({ length: 4 }, (_item, index) => {
      const angle = (Math.PI * 2 * index) / 4;
      return this.add.circle(
        Math.cos(angle) * 13,
        Math.sin(angle) * 13,
        effectType === "shadow" ? 3.5 : 2.5,
        index % 2 === 0 ? palette.outer : palette.secondary,
        0.9,
      );
    });

    projectile.add([...tails, aura, glow, ...satellites, core]);
    this.tweens.add({
      targets: [aura, glow, ...tails],
      scaleX: { from: 0.82, to: 1.22 },
      scaleY: { from: 0.82, to: 1.22 },
      alpha: { from: 0.55, to: 1 },
      duration: 170,
      yoyo: true,
      repeat: 4,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: satellites,
      angle: 210,
      duration: 680,
      ease: "Linear",
    });

    return projectile;
  }

  showDamageSpellImpact(
    target,
    targetIndex,
    amount,
    effectType,
    palette,
    onComplete = null,
  ) {
    const impact = this.add.container(target.x, target.y).setDepth(16800);
    const flash = this.add.circle(0, 0, 22, palette.core, 0.9);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    const shockwave = this.add.graphics();
    shockwave.lineStyle(
      effectType === "volcanic" || effectType === "meteor" ? 4 : 3,
      palette.outer,
      0.96,
    );
    shockwave.strokeCircle(0, 0, 24);
    const innerWave = this.add.graphics();
    innerWave.lineStyle(2, palette.secondary, 0.9);
    innerWave.strokeCircle(0, 0, 15);
    const particles = Array.from({ length: 18 }, (_item, index) => {
      const angle = (Math.PI * 2 * index) / 18;
      const distance = 42 + (index % 4) * 10;
      const particle = this.add.circle(
        0,
        0,
        2 + (index % 3),
        index % 3 === 0 ? palette.core : palette.outer,
        1,
      );
      particle.setData("targetX", Math.cos(angle) * distance);
      particle.setData("targetY", Math.sin(angle) * distance * 0.76);
      return particle;
    });

    impact.add([flash, shockwave, innerWave, ...particles]);
    impact.setScale(0.45);
    this.cameras.main.shake(
      effectType === "volcanic" || effectType === "meteor" ? 260 : 180,
      effectType === "volcanic" || effectType === "meteor" ? 0.006 : 0.0038,
    );
    this.tweens.add({
      targets: impact,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 190,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: flash,
      scaleX: 2.1,
      scaleY: 2.1,
      alpha: 0,
      duration: 320,
      ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: [shockwave, innerWave],
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: 620,
      ease: "Cubic.easeOut",
    });
    particles.forEach((particle, index) => {
      this.tweens.add({
        targets: particle,
        x: particle.getData("targetX"),
        y: particle.getData("targetY"),
        alpha: 0,
        delay: index * 9,
        duration: 480 + (index % 4) * 55,
        ease: "Cubic.easeOut",
      });
    });
    this.showHeroEffect(targetIndex, "damage", amount, 120, false);
    this.time.delayedCall(880, () => {
      impact.destroy(true);
      onComplete?.();
    });
  }

  animateMeteorDamageSpell(
    target,
    targetIndex,
    amount,
    palette,
    onComplete = null,
  ) {
    const sourceX = this.logicalWidth / 2;
    const sourceY = this.logicalHeight / 2 - 72;
    const meteorCount = 4;

    for (let index = 0; index < meteorCount; index += 1) {
      const startX = sourceX - 84 + index * 38;
      const startY = sourceY - 34 - (index % 2) * 42;
      const endX = target.x + (index - 1.5) * 13;
      const endY = target.y + (index % 2) * 6;
      const meteor = this.createDamageSpellProjectile("meteor", palette);
      meteor.setPosition(startX, startY);
      meteor.setScale(0.74 + index * 0.07);
      meteor.setDepth(16750 + index);
      meteor.setAngle(
        Phaser.Math.RadToDeg(Math.atan2(endY - startY, endX - startX)),
      );
      const streak = this.add.graphics().setDepth(16740 + index);
      streak.lineStyle(5, palette.outer, 0.22);
      streak.lineBetween(startX, startY, endX, endY);
      streak.lineStyle(2, palette.secondary, 0.55);
      streak.lineBetween(startX, startY, endX, endY);
      streak.setAlpha(0);
      const delay = index * 115;

      this.tweens.add({
        targets: streak,
        alpha: { from: 0, to: 0.75 },
        delay,
        duration: 120,
        yoyo: true,
        hold: 230,
        onComplete: () => streak.destroy(),
      });
      this.tweens.add({
        targets: meteor,
        x: endX,
        y: endY,
        delay,
        duration: 520,
        ease: "Cubic.easeIn",
        onComplete: () => {
          meteor.destroy(true);
          if (index === meteorCount - 1) {
            this.showDamageSpellImpact(
              target,
              targetIndex,
              amount,
              "meteor",
              palette,
              onComplete,
            );
          }
        },
      });
    }
  }

  animateDirectDamageSpell(card, targetIndex, amount, onComplete = null) {
    const effectType = card.damageEffect ?? "arcane";
    const palette = this.getDamageSpellPalette(effectType);
    const target = this.getHeroEffectAnchor(targetIndex, false);
    const isFireEffect = ["bloodfire", "fire", "meteor", "volcanic"].includes(
      effectType,
    );
    const soundKey = isFireEffect
      ? amount >= 7
        ? SOUND_KEYS.fireBig
        : amount >= 4
          ? SOUND_KEYS.fireMedium
          : SOUND_KEYS.fireSmall
      : amount >= 7
        ? SOUND_KEYS.colorlessBig
        : amount >= 4
          ? SOUND_KEYS.colorlessMedium
          : SOUND_KEYS.colorlessSmall;
    gameAudio.play(soundKey, { gain: 0.82 });

    if (effectType === "meteor") {
      this.animateMeteorDamageSpell(
        target,
        targetIndex,
        amount,
        palette,
        onComplete,
      );
      return;
    }

    const source = {
      x: this.logicalWidth / 2,
      y: this.logicalHeight / 2,
    };
    const projectile = this.createDamageSpellProjectile(effectType, palette);
    projectile.setPosition(source.x, source.y);
    projectile.setDepth(16760);
    projectile.setAngle(
      Phaser.Math.RadToDeg(
        Math.atan2(target.y - source.y, target.x - source.x),
      ),
    );
    const sourceBurst = this.add.graphics().setDepth(16740);
    sourceBurst.lineStyle(3, palette.outer, 0.82);
    sourceBurst.strokeCircle(source.x, source.y, 18);
    const trail = Array.from({ length: 14 }, (_item, index) => {
      const particle = this.add.circle(
        source.x,
        source.y,
        2 + (index % 3),
        index % 3 === 0 ? palette.secondary : palette.outer,
        0,
      );
      particle.setDepth(16745);
      return particle;
    });

    this.tweens.add({
      targets: sourceBurst,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => sourceBurst.destroy(),
    });
    trail.forEach((particle, index) => {
      const spread = (index % 2 === 0 ? -1 : 1) * (4 + (index % 4) * 2);
      this.tweens.add({
        targets: particle,
        x: target.x + spread,
        y: target.y - spread * 0.45,
        alpha: { from: 0.82, to: 0 },
        delay: index * 24,
        duration: 560 + index * 12,
        ease: "Cubic.easeIn",
        onComplete: () => particle.destroy(),
      });
    });
    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      duration:
        effectType === "volcanic" || effectType === "bloodfire" ? 760 : 660,
      ease:
        effectType === "volcanic" || effectType === "bloodfire"
          ? "Cubic.easeIn"
          : "Sine.easeIn",
      onComplete: () => {
        projectile.destroy(true);
        this.showDamageSpellImpact(
          target,
          targetIndex,
          amount,
          effectType,
          palette,
          onComplete,
        );
      },
    });
  }

  getDamageSpellCompletionDelay(card, isLethal = false) {
    const effectDelay = card?.damageEffect === "meteor" ? 1750 : 1550;
    return effectDelay + (isLethal ? 1200 : 0);
  }

  showCreatureSpellDamage(feedback, card) {
    const isEnemySide = feedback.opponentIndex === ENEMY_INDEX;
    const slots = isEnemySide ? ENEMY_BOARD_SLOTS : ALLY_BOARD_SLOTS;
    const effectType = card?.damageEffect ?? "shadow";
    const isFire = ["bloodfire", "fire", "meteor", "volcanic"].includes(
      effectType,
    );
    gameAudio.play(isFire ? SOUND_KEYS.fireMedium : SOUND_KEYS.colorlessMedium, {
      gain: 0.78,
    });

    feedback.creatureDamageTargets.forEach((target, order) => {
      const slot = slots[target.index];
      if (!slot) return;
      const pose = this.getBoardCardPose(slot, target.index, isEnemySide);

      this.time.delayedCall(order * 110, () => {
        const effect = this.add.container(pose.x, pose.y).setDepth(16900);
        const burst = this.add.graphics();
        const color = isFire ? 0xef4444 : 0x7c3aed;
        burst.fillStyle(color, 0.24);
        burst.fillCircle(0, 0, 42);
        burst.lineStyle(3, color, 0.95);
        burst.strokeCircle(0, 0, 31);
        burst.lineStyle(1.5, 0xfef2f2, 0.8);
        burst.strokeCircle(0, 0, 20);
        const label = centerText(
          this,
          0,
          0,
          target.destroyed ? "DESTRUIDA" : `-${target.amount}`,
          target.destroyed ? 13 : 22,
          "#ffffff",
          "900",
        );
        label.setStroke(isFire ? "#7f1d1d" : "#3b0764", 4);
        effect.add([burst, label]);
        effect.setScale(0.45);

        this.tweens.add({
          targets: effect,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 220,
          ease: "Back.easeOut",
          onComplete: () => {
            this.tweens.add({
              targets: effect,
              y: pose.y - 32,
              alpha: 0,
              delay: 620,
              duration: 420,
              onComplete: () => effect.destroy(true),
            });
          },
        });
      });
    });
  }

  showCardEffectFeedback(feedback, card) {
    let ownerEffectIndex = 0;

    if (feedback.hasHealthEffect) {
      this.showHeroEffect(
        feedback.playerIndex,
        "health",
        feedback.restoredHealth,
        ownerEffectIndex * 260,
      );
      ownerEffectIndex += 1;
    }

    if (feedback.hasManaEffect) {
      this.showHeroEffect(
        feedback.playerIndex,
        "mana",
        feedback.restoredMana,
        ownerEffectIndex * 260,
      );
    }

    if (feedback.directDamage > 0) {
      if (card?.type === "spell") {
        const fatalTarget = {
          ...this.getHeroEffectAnchor(feedback.opponentIndex, false),
          playerIndex: feedback.opponentIndex,
        };
        this.animateDirectDamageSpell(
          card,
          feedback.opponentIndex,
          feedback.directDamage,
          feedback.isLethalDamage
            ? () => this.animateLethalHeroBreak(fatalTarget, () => {})
            : null,
        );
      } else {
        this.showHeroEffect(
          feedback.opponentIndex,
          "damage",
          feedback.directDamage,
        );
      }
    }

    if (feedback.creatureDamageTargets.length > 0) {
      this.showCreatureSpellDamage(feedback, card);
    }
  }

  animatePlayedCard(start, destination, onComplete) {
    const cardTextureKey = start.textureKey ?? "card-hand";
    gameAudio.play(SOUND_KEYS.cardSlide, { gain: 0.66 });
    const cardFrame = start.textureFrame;
    const nativeSize = getTextureFrameSize(this, cardTextureKey, cardFrame);
    const defaultRevealSize = fitSizePreservingAspect(
      nativeSize.width,
      nativeSize.height,
      CARD_REVEAL_WIDTH,
      CARD_REVEAL_HEIGHT,
    );
    const defaultStartSize = fitSizePreservingAspect(
      nativeSize.width,
      nativeSize.height,
      HAND_CARD_WIDTH,
      HAND_CARD_HEIGHT,
    );

    if (!this.textures.exists(cardTextureKey)) {
      destination.onResolve?.();
      destination.onResolve = null;
      if (destination.discardCardId) {
        this.animatingDiscardCardIds.delete(destination.discardCardId);
      }
      onComplete();
      return;
    }

    const centerX = this.logicalWidth / 2;
    const centerY = this.logicalHeight / 2;
    const revealAngle =
      destination.displayAngle ??
      destination.animationAngle ??
      destination.angle ??
      0;
    const cardContainer = this.add.container(start.x, start.y);
    cardContainer.setDepth(10000);
    cardContainer.setAngle(start.angle ?? 0);

    const cardImage = this.add.image(0, 0, cardTextureKey, cardFrame);
    cardImage.setDisplaySize(
      start.displayWidth ?? defaultStartSize.width,
      start.displayHeight ?? defaultStartSize.height,
    );
    cardImage.setOrigin(0.5);
    cardImage.setBlendMode(Phaser.BlendModes.NORMAL);

    cardContainer.add(cardImage);

    if (start.directPlay) {
      const landingAngle =
        destination.animationAngle ??
        destination.displayAngle ??
        destination.angle ??
        0;

      this.tweens.add({
        targets: cardImage,
        displayWidth: destination.displayWidth ?? HAND_CARD_WIDTH,
        displayHeight: destination.displayHeight ?? HAND_CARD_HEIGHT,
        duration: 320,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: cardContainer,
        x: destination.x,
        y: destination.y,
        angle: landingAngle,
        duration: 320,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.finishPlayedCardAnimation(
            cardContainer,
            cardImage,
            destination,
            onComplete,
          );
        },
      });
      return;
    }

    this.tweens.add({
      targets: cardImage,
      displayWidth: defaultRevealSize.width,
      displayHeight: defaultRevealSize.height,
      duration: 450,
      ease: "Cubic.easeIn",
    });

    this.tweens.add({
      targets: cardContainer,
      x: centerX,
      y: centerY,
      angle: revealAngle,
      duration: 450,
      ease: "Cubic.easeIn",
      onComplete: () => {
        const landingAngle =
          destination.animationAngle ??
          destination.displayAngle ??
          destination.angle ??
          0;
        const landingWidth = destination.displayWidth ?? HAND_CARD_WIDTH;
        const landingHeight = destination.displayHeight ?? HAND_CARD_HEIGHT;

        this.tweens.add({
          targets: cardImage,
          displayWidth: landingWidth,
          displayHeight: landingHeight,
          duration: 380,
          ease: "Bounce.easeOut",
        });

        this.tweens.add({
          targets: cardContainer,
          x: destination.x,
          y: destination.y,
          angle: landingAngle,
          duration: 380,
          ease: "Bounce.easeOut",
          onComplete: () => {
            this.finishPlayedCardAnimation(
              cardContainer,
              cardImage,
              destination,
              onComplete,
            );
          },
        });
      },
    });
  }

  clearNpcTurnTimers() {
    this.npcTurnTimers.forEach((timer) => {
      if (timer && !timer.hasDispatched) {
        timer.remove(false);
      }
    });
    this.npcTurnTimers = [];
  }

  clearNpcChoicePreview() {
    if (this.npcChoicePreview) {
      this.tweens.killTweensOf(this.npcChoicePreview);
      this.npcChoicePreview.destroy(true);
      this.npcChoicePreview = null;
    }

    this.npcChoicePreviewCardId = null;
  }

  queueNpcTurnStep(delay, callback) {
    const timer = this.time.delayedCall(delay, () => {
      this.npcTurnTimers = this.npcTurnTimers.filter((item) => item !== timer);
      callback();
    });

    this.npcTurnTimers.push(timer);
  }

  getNpcThinkDelay() {
    return Phaser.Math.Between(NPC_THINK_DELAY_MIN, NPC_THINK_DELAY_MAX);
  }

  getNpcActionDelay() {
    return Phaser.Math.Between(NPC_ACTION_DELAY_MIN, NPC_ACTION_DELAY_MAX);
  }

  getNpcChoiceCount() {
    const roll = Phaser.Math.Between(1, 100);

    if (roll <= 10) {
      return 3;
    }

    if (roll <= 45) {
      return 2;
    }

    return 1;
  }

  getNpcChoiceSequence(state, finalIndex) {
    const npc = state.players[ENEMY_INDEX];
    const choiceCount = Math.min(this.getNpcChoiceCount(), npc.hand.length);
    const availableIndexes = npc.hand
      .map((_card, index) => index)
      .filter((index) => index !== finalIndex);
    const sequence = [];

    while (sequence.length < choiceCount - 1 && availableIndexes.length > 0) {
      const randomListIndex = Phaser.Math.Between(
        0,
        availableIndexes.length - 1,
      );
      const [randomHandIndex] = availableIndexes.splice(randomListIndex, 1);
      sequence.push(randomHandIndex);
    }

    sequence.push(finalIndex);
    return sequence;
  }

  showNpcChoicePreview(handIndex, handCount) {
    if (!this.textures.exists("npc-card-back")) {
      return;
    }

    const target = this.getNpcHandCardCenter(handIndex, handCount);
    const cardFrame = getCardTextureFrame(this, "npc-card-back", true);

    if (!this.npcChoicePreview) {
      const preview = this.add.container(target.x, target.y);
      preview.setScale(NPC_CARD_SCALE);
      preview.setDepth(3200);

      const card = this.add.image(0, 0, "npc-card-back", cardFrame);
      card.setDisplaySize(HAND_CARD_WIDTH, HAND_CARD_HEIGHT);
      card.setOrigin(0.5, 0.5);
      card.setAlpha(0.96);

      const frame = this.add.graphics();
      frame.lineStyle(4, 0xfacc15, 0.95);
      frame.strokeRoundedRect(
        -HAND_CARD_WIDTH / 2,
        -HAND_CARD_HEIGHT / 2,
        HAND_CARD_WIDTH,
        HAND_CARD_HEIGHT,
        10,
      );

      preview.add([card, frame]);
      this.npcChoicePreview = preview;
      return;
    }

    this.tweens.add({
      targets: this.npcChoicePreview,
      x: target.x,
      y: target.y,
      duration: 260,
      ease: "Sine.easeInOut",
    });
  }

  previewNpcChoiceSequence(
    sequence,
    finalIndex,
    onComplete,
    targetIndex = null,
  ) {
    const state = this.engine.getState();

    if (
      state.winner ||
      state.activePlayerIndex !== ENEMY_INDEX ||
      sequence.length === 0
    ) {
      onComplete();
      return;
    }

    const [handIndex, ...remainingSequence] = sequence;
    const npc = state.players[ENEMY_INDEX];
    const selectedCard = npc.hand[handIndex];

    if (!selectedCard) {
      this.previewNpcChoiceSequence(
        remainingSequence,
        finalIndex,
        onComplete,
        targetIndex,
      );
      return;
    }

    this.selectedNpcCardId = null;
    this.npcChoicePreviewCardId = selectedCard.instanceId;
    this.renderState(state);
    this.showNpcChoicePreview(handIndex, npc.hand.length);

    this.queueNpcTurnStep(this.getNpcActionDelay(), () => {
      if (handIndex === finalIndex && remainingSequence.length === 0) {
        this.clearNpcChoicePreview();
        this.playNpcCardWithAnimation(
          handIndex,
          selectedCard,
          onComplete,
          targetIndex,
        );
        return;
      }

      this.previewNpcChoiceSequence(
        remainingSequence,
        finalIndex,
        onComplete,
        targetIndex,
      );
    });
  }

  startNpcTurn(state) {
    if (
      this.engine.isMultiplayer ||
      this.isGamePaused ||
      state.winner ||
      state.phase !== "playing" ||
      state.activePlayerIndex !== ENEMY_INDEX ||
      this.npcTurnInProgressForTurn === state.turn
    ) {
      return;
    }

    this.clearNpcTurnTimers();
    this.clearNpcChoicePreview();
    this.selectedPlayerCardId = null;
    this.selectedNpcCardId = null;
    this.selectedBoardCardId = null;
    this.selectedBoardCardIndex = null;
    this.boardCardSelectionTweenId = null;
    this.inspectedBoardCardId = null;
    this.inspectedBoardOwnerId = null;
    this.npcTurnInProgressForTurn = state.turn;
    this.npcTurnStartedAt = this.time.now;

    this.queueNpcTurnStep(this.getNpcThinkDelay(), () => {
      this.continueNpcPlaysOrAttack();
    });
  }

  finishPlayedCardAnimation(
    cardContainer,
    cardImage,
    destination,
    onComplete,
  ) {
    destination.onResolve?.();
    destination.onResolve = null;

    if (!destination.discardDestination) {
      onComplete();
      this.time.delayedCall(50, () => cardContainer.destroy(true));
      return;
    }

    this.time.delayedCall(260, () => {
      this.tweens.add({
        targets: cardImage,
        displayWidth: DECK_PILE_WIDTH,
        displayHeight: DECK_PILE_HEIGHT,
        duration: 420,
        ease: "Cubic.easeInOut",
      });
      this.tweens.add({
        targets: cardContainer,
        x: destination.discardDestination.x,
        y: destination.discardDestination.y,
        angle: -5,
        duration: 420,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          if (destination.discardCardId) {
            this.animatingDiscardCardIds.delete(destination.discardCardId);
          }
          cardContainer.destroy(true);
          const remainingEffectTime = Math.max(
            0,
            (destination.effectCompletionDelay ?? 0) - 680,
          );
          if (remainingEffectTime > 0) {
            this.time.delayedCall(remainingEffectTime, onComplete);
          } else {
            onComplete();
          }
        },
      });
    });
  }

  continueNpcPlaysOrAttack() {
    const state = this.engine.getState();

    if (state.winner || state.activePlayerIndex !== ENEMY_INDEX) {
      this.npcTurnInProgressForTurn = null;
      return;
    }

    const elapsedMs = Math.max(0, this.time.now - this.npcTurnStartedAt);
    const decision = this.npcAi.chooseNextAction(state, ENEMY_INDEX, {
      elapsedMs,
    });
    const action = decision.action;

    if (!action || action.type === AI_ACTION_TYPES.END_TURN) {
      this.queueNpcTurnStep(decision.thinkDelayMs ?? 400, () => {
        this.finishNpcTurn();
      });
      return;
    }

    this.queueNpcTurnStep(decision.thinkDelayMs ?? this.getNpcActionDelay(), () => {
      this.executeNpcAiAction(action, () => {
        this.continueNpcPlaysOrAttack();
      });
    });
  }

  executeNpcAiAction(action, onComplete) {
    const state = this.engine.getState();

    if (state.winner || state.activePlayerIndex !== ENEMY_INDEX) {
      this.npcTurnInProgressForTurn = null;
      onComplete();
      return;
    }

    if (action.type === AI_ACTION_TYPES.PLAY_CARD) {
      this.previewNpcChoiceSequence(
        this.getNpcChoiceSequence(state, action.handIndex),
        action.handIndex,
        onComplete,
        action.targetIndex,
      );
      return;
    }

    if (action.type === AI_ACTION_TYPES.ATTACK_FACE) {
      const npc = state.players[ENEMY_INDEX];
      const attacker = npc.board[action.boardIndex];
      const slot = ENEMY_BOARD_SLOTS[action.boardIndex];

      if (!attacker || !slot) {
        this.engine.attackFace(action.boardIndex);
        onComplete();
        return;
      }

      const pose = this.getBoardCardPose(slot, action.boardIndex, true);
      const heroX = PLAYER_HUD_FRAME_LEFT_MARGIN + HUD_FRAME_WIDTH / 2;
      const heroY =
        this.logicalHeight -
        HUD_FRAME_HEIGHT -
        PLAYER_HUD_FRAME_BOTTOM_MARGIN +
        HUD_FRAME_HEIGHT / 2;

      this.animateBoardAttack(
        {
          card: attacker,
          boardIndex: action.boardIndex,
          x: pose.x,
          y: pose.y,
        },
        { type: "hero", playerIndex: PLAYER_INDEX, x: heroX, y: heroY },
        () => {
          this.engine.attackFace(action.boardIndex);
          onComplete();
        },
      );
      return;
    }

    if (action.type === AI_ACTION_TYPES.ATTACK_CREATURE) {
      const npc = state.players[ENEMY_INDEX];
      const player = state.players[PLAYER_INDEX];
      const attacker = npc.board[action.boardIndex];
      const targetCard = player.board[action.targetIndex];
      const attackerSlot = ENEMY_BOARD_SLOTS[action.boardIndex];
      const targetSlot = ALLY_BOARD_SLOTS[action.targetIndex];

      if (!attacker || !targetCard || !attackerSlot || !targetSlot) {
        this.engine.attackCreature(action.boardIndex, action.targetIndex);
        onComplete();
        return;
      }

      const attackerPose = this.getBoardCardPose(
        attackerSlot,
        action.boardIndex,
        true,
      );
      const targetPose = this.getBoardCardPose(
        targetSlot,
        action.targetIndex,
        false,
      );

      this.animateBoardAttack(
        {
          card: attacker,
          boardIndex: action.boardIndex,
          x: attackerPose.x,
          y: attackerPose.y,
        },
        {
          type: "creature",
          card: targetCard,
          index: action.targetIndex,
          x: targetPose.x,
          y: targetPose.y,
        },
        () => {
          this.engine.attackCreature(action.boardIndex, action.targetIndex);
          onComplete();
        },
      );
      return;
    }

    this.finishNpcTurn();
  }

  handleRemoteMultiplayerAction({ action, apply }) {
    if (!action || typeof apply !== "function") {
      apply?.();
      return;
    }

    // Navegadores pausam tweens em abas sem foco. Aplicar o snapshot direto
    // evita deixar cartas ocultas ou paradas quando o outro jogador age.
    if (document.hidden) {
      apply();
      return;
    }

    if (action.type === "playCard") {
      this.animateRemoteCardPlay(action, apply);
      return;
    }

    if (action.type === "attackFace") {
      const state = this.engine.getState();
      const attacker = state.players[ENEMY_INDEX]?.board[action.boardIndex];
      const slot = ENEMY_BOARD_SLOTS[action.boardIndex];
      if (!attacker || !slot) {
        apply();
        return;
      }

      const pose = this.getBoardCardPose(slot, action.boardIndex, true);
      const heroX = PLAYER_HUD_FRAME_LEFT_MARGIN + HUD_FRAME_WIDTH / 2;
      const heroY =
        this.logicalHeight -
        HUD_FRAME_HEIGHT -
        PLAYER_HUD_FRAME_BOTTOM_MARGIN +
        HUD_FRAME_HEIGHT / 2;
      this.animateBoardAttack(
        {
          card: attacker,
          boardIndex: action.boardIndex,
          x: pose.x,
          y: pose.y,
        },
        { type: "hero", playerIndex: PLAYER_INDEX, x: heroX, y: heroY },
        apply,
      );
      return;
    }

    if (action.type === "attackCreature") {
      const state = this.engine.getState();
      const attacker = state.players[ENEMY_INDEX]?.board[action.boardIndex];
      const target = state.players[PLAYER_INDEX]?.board[action.targetIndex];
      const attackerSlot = ENEMY_BOARD_SLOTS[action.boardIndex];
      const targetSlot = ALLY_BOARD_SLOTS[action.targetIndex];
      if (!attacker || !target || !attackerSlot || !targetSlot) {
        apply();
        return;
      }

      const attackerPose = this.getBoardCardPose(
        attackerSlot,
        action.boardIndex,
        true,
      );
      const targetPose = this.getBoardCardPose(
        targetSlot,
        action.targetIndex,
        false,
      );
      this.animateBoardAttack(
        {
          card: attacker,
          boardIndex: action.boardIndex,
          x: attackerPose.x,
          y: attackerPose.y,
        },
        {
          type: "creature",
          card: target,
          index: action.targetIndex,
          x: targetPose.x,
          y: targetPose.y,
        },
        apply,
      );
      return;
    }

    apply();
  }

  animateRemoteCardPlay(action, apply) {
    const state = this.engine.getState();
    const opponent = state.players[ENEMY_INDEX];
    const handIndex = action.handIndex;
    const selectedCard = action.card ?? opponent?.hand[handIndex];

    if (!selectedCard) {
      apply();
      return;
    }

    const destination = this.getNpcPlayedCardDestination(
      selectedCard,
      opponent,
    );
    if (!destination) {
      apply();
      return;
    }

    const textureKey = getCardTextureKey(
      this,
      selectedCard,
      "card-hand",
      "zoom",
    );
    const start = {
      ...this.getNpcHandCardCenter(handIndex, opponent.hand.length),
      displayWidth: Math.round(HAND_CARD_WIDTH * NPC_CARD_SCALE),
      displayHeight: Math.round(HAND_CARD_HEIGHT * NPC_CARD_SCALE),
      textureKey,
      textureFrame: getCardTextureFrame(this, textureKey, false),
    };
    const isBoardCard = selectedCard.type === "creature";
    const effectFeedback = this.getCardEffectFeedback(
      state,
      ENEMY_INDEX,
      selectedCard,
      action.targetIndex,
    );

    if (!isBoardCard) {
      destination.discardDestination = this.getDiscardPilePosition(ENEMY_INDEX);
      destination.discardCardId = selectedCard.instanceId;
      if (effectFeedback.directDamage > 0) {
        destination.effectCompletionDelay =
          this.getDamageSpellCompletionDelay(
            selectedCard,
            effectFeedback.isLethalDamage,
          );
      }
      if (effectFeedback.creatureDamageTargets.length > 0) {
        destination.effectCompletionDelay = Math.max(
          destination.effectCompletionDelay ?? 0,
          1500,
        );
      }
      this.animatingDiscardCardIds.add(selectedCard.instanceId);
    }

    this.animatingNpcCardId = selectedCard.instanceId;
    this.enteringBoardCardId = isBoardCard ? selectedCard.instanceId : null;
    this.isCardPlayAnimating = true;
    this.renderState(state);
    destination.onResolve = () => {
      this.showCardEffectFeedback(effectFeedback, selectedCard);
    };

    this.animatePlayedCard(start, destination, () => {
      apply();
      this.animatingNpcCardId = null;
      this.enteringBoardCardId = null;
      this.isCardPlayAnimating = false;
      this.renderState(this.engine.getState());
    });
  }

  playNpcCardWithAnimation(
    handIndex,
    selectedCard,
    onComplete,
    targetIndex = null,
  ) {
    const state = this.engine.getState();

    if (state.winner || state.activePlayerIndex !== ENEMY_INDEX) {
      this.selectedNpcCardId = null;
      onComplete();
      return;
    }

    const npc = state.players[ENEMY_INDEX];
    const destination = this.getNpcPlayedCardDestination(selectedCard, npc);

    if (!destination) {
      this.selectedNpcCardId = null;
      this.engine.playCard(handIndex, targetIndex);
      onComplete();
      return;
    }

    const start = {
      ...this.getNpcHandCardCenter(handIndex, npc.hand.length),
      displayWidth: Math.round(HAND_CARD_WIDTH * NPC_CARD_SCALE),
      displayHeight: Math.round(HAND_CARD_HEIGHT * NPC_CARD_SCALE),
      textureKey: getCardTextureKey(this, selectedCard, "card-hand", "zoom"),
      textureFrame: getCardTextureFrame(
        this,
        getCardTextureKey(this, selectedCard, "card-hand", "zoom"),
        false,
      ),
    };
    const isBoardCard = selectedCard.type === "creature";
    const effectFeedback = this.getCardEffectFeedback(
      state,
      ENEMY_INDEX,
      selectedCard,
      targetIndex,
    );

    if (!isBoardCard) {
      destination.discardDestination =
        this.getDiscardPilePosition(ENEMY_INDEX);
      destination.discardCardId = selectedCard.instanceId;
      if (effectFeedback.directDamage > 0) {
        destination.effectCompletionDelay =
          this.getDamageSpellCompletionDelay(
            selectedCard,
            effectFeedback.isLethalDamage,
          );
      }
      if (effectFeedback.creatureDamageTargets.length > 0) {
        destination.effectCompletionDelay = Math.max(
          destination.effectCompletionDelay ?? 0,
          1500,
        );
      }
      this.animatingDiscardCardIds.add(selectedCard.instanceId);
    }

    this.selectedNpcCardId = null;
    this.animatingNpcCardId = selectedCard.instanceId;
    this.enteringBoardCardId = isBoardCard ? selectedCard.instanceId : null;
    this.isCardPlayAnimating = true;
    this.engine.playCard(handIndex, targetIndex);

    const nextState = this.engine.getState();
    const nextNpc = nextState.players[ENEMY_INDEX];
    const wasPlayed = isBoardCard
      ? nextNpc.board.some(
          (card) => card.instanceId === selectedCard.instanceId,
        )
      : !nextNpc.hand.some(
          (card) => card.instanceId === selectedCard.instanceId,
        );

    if (!wasPlayed) {
      this.animatingDiscardCardIds.delete(selectedCard.instanceId);
      this.animatingNpcCardId = null;
      this.enteringBoardCardId = null;
      this.isCardPlayAnimating = false;
      this.renderState(nextState);
      onComplete();
      return;
    }

    destination.onResolve = () => {
      this.showCardEffectFeedback(effectFeedback, selectedCard);
    };

    this.animatePlayedCard(start, destination, () => {
      this.animatingNpcCardId = null;
      this.enteringBoardCardId = null;
      this.isCardPlayAnimating = false;
      this.renderState(this.engine.getState());
      onComplete();
    });
  }

  finishNpcTurn() {
    const state = this.engine.getState();
    this.npcTurnInProgressForTurn = null;

    if (!state.winner && state.activePlayerIndex === ENEMY_INDEX) {
      this.engine.endTurn();
    }
  }

  playSelectedCardWithAnimation(
    state,
    selectedIndex,
    selectedCard,
    startOverride = null,
    targetIndex = null,
  ) {
    if (this.isCardPlayAnimating || this.isCardDrawAnimating) {
      return;
    }

    const player = state.players[PLAYER_INDEX];
    const destination = this.getPlayedCardDestination(selectedCard, player);

    if (!destination) {
      this.engine.playCard(selectedIndex, targetIndex);
      return;
    }

    const selectedTextureKey = getCardTextureKey(
      this,
      selectedCard,
      "card-hand",
      "zoom",
    );
    const start = startOverride ?? {
      ...this.getPlayerHandCardCenter(selectedIndex, player.hand.length),
      displayWidth: Math.round(HAND_CARD_WIDTH * PLAYER_CARD_SELECTED_SCALE),
      displayHeight: Math.round(HAND_CARD_HEIGHT * PLAYER_CARD_SELECTED_SCALE),
      textureKey: selectedTextureKey,
      textureFrame: getCardTextureFrame(this, selectedTextureKey, false),
    };
    const isBoardCard = selectedCard.type === "creature";
    const effectFeedback = this.getCardEffectFeedback(
      state,
      PLAYER_INDEX,
      selectedCard,
      targetIndex,
    );

    if (!isBoardCard) {
      destination.discardDestination =
        this.getDiscardPilePosition(PLAYER_INDEX);
      destination.discardCardId = selectedCard.instanceId;
      if (effectFeedback.directDamage > 0) {
        destination.effectCompletionDelay =
          this.getDamageSpellCompletionDelay(
            selectedCard,
            effectFeedback.isLethalDamage,
          );
      }
      if (effectFeedback.creatureDamageTargets.length > 0) {
        destination.effectCompletionDelay = Math.max(
          destination.effectCompletionDelay ?? 0,
          1500,
        );
      }
      this.animatingDiscardCardIds.add(selectedCard.instanceId);
    }

    this.selectedPlayerCardId = null;
    this.selectedBoardCardId = null;
    this.selectedBoardCardIndex = null;
    this.animatingPlayerCardId = selectedCard.instanceId;
    this.enteringBoardCardId = isBoardCard ? selectedCard.instanceId : null;
    this.isCardPlayAnimating = true;
    this.engine.playCard(selectedIndex, targetIndex);

    const nextState = this.engine.getState();
    const nextPlayer = nextState.players[PLAYER_INDEX];
    const wasPlayed = isBoardCard
      ? nextPlayer.board.some(
          (card) => card.instanceId === selectedCard.instanceId,
        )
      : !nextPlayer.hand.some(
          (card) => card.instanceId === selectedCard.instanceId,
        );

    if (!wasPlayed) {
      this.animatingDiscardCardIds.delete(selectedCard.instanceId);
      this.animatingPlayerCardId = null;
      this.enteringBoardCardId = null;
      this.isCardPlayAnimating = false;
      this.renderState(nextState);
      return;
    }

    destination.onResolve = () => {
      this.showCardEffectFeedback(effectFeedback, selectedCard);
    };

    this.animatePlayedCard(start, destination, () => {
      this.animatingPlayerCardId = null;
      this.enteringBoardCardId = null;
      this.isCardPlayAnimating = false;
      this.renderState(this.engine.getState());
    });
  }

  drawBoardCards(player, slots) {
    player.board.forEach((card, index) => {
      if (card.instanceId === this.enteringBoardCardId) {
        return;
      }

      const slot = slots[index];
      if (!slot) {
        return;
      }

      const actionLabel = getCardStatusLabel(card);
      const isReady = actionLabel === "PRONTA";
      const isPlayerCard = player.id === "p1";
      const pose = this.getBoardCardPose(slot, index, player.id !== "p1");
      const isSelectedForAction =
        isPlayerCard && card.instanceId === this.selectedBoardCardId;
      pose.shouldTweenSelection =
        isSelectedForAction &&
        card.instanceId === this.boardCardSelectionTweenId;
      const state = this.engine.getState();
      const ownerIndex = isPlayerCard ? PLAYER_INDEX : ENEMY_INDEX;
      const canActNow =
        isReady &&
        state.phase === "playing" &&
        state.activePlayerIndex === ownerIndex &&
        !state.winner &&
        !this.isCardPlayAnimating &&
        !this.isCardDrawAnimating &&
        !this.isTurnTransitionAnimating &&
        !this.isGamePaused;
      const canDragAttack =
        isPlayerCard &&
        canActNow;

      const cardContainer = this.drawPlayedCard(
        pose,
        card,
        () => {
          this.handleBoardCardClick(card, index, player.id);
        },
        isReady,
        canActNow,
        isSelectedForAction,
        canDragAttack
          ? {
              onStart: (pointer) =>
                this.beginAttackDrag(card, index, pose, pointer),
              onMove: (pointer) => this.updateAttackDrag(pointer),
              onEnd: (pointer) => this.finishAttackDrag(pointer),
            }
          : null,
      );

      if (cardContainer) {
        this.boardCardContainers.set(card.instanceId, cardContainer);
      }
    });
  }

  animateDrawCard(start, destination, onComplete) {
    if (!this.textures.exists("npc-card-back")) {
      onComplete();
      return;
    }

    gameAudio.play(SOUND_KEYS.cardSlide, { gain: 0.6 });

    const cardFrame = getCardTextureFrame(this, "npc-card-back", true);
    const card = this.add.image(start.x, start.y, "npc-card-back", cardFrame);
    card.setDisplaySize(start.displayWidth, start.displayHeight);
    card.setOrigin(0.5);
    card.setDepth(11000);

    this.tweens.add({
      targets: card,
      x: destination.x,
      y: destination.y,
      displayWidth: destination.displayWidth,
      displayHeight: destination.displayHeight,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => {
        card.destroy();
        onComplete();
      },
    });
  }

  getDiscardAnimationStart(previousPlayer, playerIndex, card) {
    const boardIndex = previousPlayer.board.findIndex(
      (boardCard) => boardCard.instanceId === card.instanceId,
    );

    if (boardIndex >= 0) {
      const slots =
        playerIndex === ENEMY_INDEX ? ENEMY_BOARD_SLOTS : ALLY_BOARD_SLOTS;
      const pose = this.getBoardCardPose(
        slots[boardIndex],
        boardIndex,
        playerIndex === ENEMY_INDEX,
      );
      return {
        x: pose.x,
        y: pose.y,
        displayWidth: pose.displayWidth,
        displayHeight: pose.displayHeight,
        angle: pose.displayAngle,
      };
    }

    const handIndex = previousPlayer.hand.findIndex(
      (handCard) => handCard.instanceId === card.instanceId,
    );

    if (handIndex >= 0) {
      const center =
        playerIndex === ENEMY_INDEX
          ? getNpcHandCardCenter(
              this.logicalWidth,
              this.logicalHeight,
              handIndex,
              previousPlayer.hand.length,
              false,
            )
          : getPlayerHandCardCenter(
              this.logicalWidth,
              this.logicalHeight,
              handIndex,
              previousPlayer.hand.length,
              false,
            );
      const scale =
        playerIndex === ENEMY_INDEX ? NPC_CARD_SCALE : PLAYER_CARD_SCALE;
      return {
        ...center,
        displayWidth: Math.round(HAND_CARD_WIDTH * scale),
        displayHeight: Math.round(HAND_CARD_HEIGHT * scale),
        angle: 0,
      };
    }

    const deckPosition =
      playerIndex === ENEMY_INDEX
        ? { x: ENEMY_DECK_PILE_X, y: ENEMY_DECK_PILE_Y }
        : this.getPlayerDeckPosition();
    return {
      ...deckPosition,
      displayWidth: DECK_PILE_WIDTH,
      displayHeight: DECK_PILE_HEIGHT,
      angle: 0,
    };
  }

  animateCardToDiscard(card, playerIndex, start, delay = 0) {
    const textureKey = getCardTextureKey(this, card, "card-hand", "zoom");
    const textureFrame = getCardTextureFrame(this, textureKey, false);
    const destination = this.getDiscardPilePosition(playerIndex);

    if (!this.textures.exists(textureKey)) {
      this.animatingDiscardCardIds.delete(card.instanceId);
      this.renderState(this.engine.getState());
      return;
    }

    const cardImage = this.add.image(
      start.x,
      start.y,
      textureKey,
      textureFrame,
    );
    cardImage.setDisplaySize(start.displayWidth, start.displayHeight);
    cardImage.setOrigin(0.5);
    cardImage.setAngle(start.angle ?? 0);
    cardImage.setDepth(12500);

    this.tweens.add({
      targets: cardImage,
      x: destination.x,
      y: destination.y,
      displayWidth: DECK_PILE_WIDTH,
      displayHeight: DECK_PILE_HEIGHT,
      angle: -5,
      delay,
      duration: 520,
      ease: "Cubic.easeInOut",
      onComplete: () => {
        cardImage.destroy();
        this.animatingDiscardCardIds.delete(card.instanceId);
        this.renderState(this.engine.getState());
      },
    });
  }

  prepareDiscardAnimations(previousState, nextState) {
    if (!previousState?.players || !nextState?.players) {
      return;
    }

    const animations = [];

    nextState.players.forEach((nextPlayer, playerIndex) => {
      const previousPlayer = previousState.players[playerIndex];
      if (!previousPlayer) {
        return;
      }

      const previousDiscardIds = new Set(
        previousPlayer.graveyard.map((card) => card.instanceId),
      );

      nextPlayer.graveyard.forEach((card) => {
        if (
          previousDiscardIds.has(card.instanceId) ||
          this.animatingDiscardCardIds.has(card.instanceId)
        ) {
          return;
        }

        this.animatingDiscardCardIds.add(card.instanceId);
        animations.push({
          card,
          playerIndex,
          start: this.getDiscardAnimationStart(
            previousPlayer,
            playerIndex,
            card,
          ),
        });
      });
    });

    animations.forEach((animation, index) => {
      this.time.delayedCall(0, () => {
        this.animateCardToDiscard(
          animation.card,
          animation.playerIndex,
          animation.start,
          index * 90,
        );
      });
    });
  }

  getDrawnCardId(previousHand, nextHand) {
    const previousIds = new Set(previousHand.map((card) => card.instanceId));
    const drawnCard = nextHand.find((card) => !previousIds.has(card.instanceId));

    return drawnCard?.instanceId ?? null;
  }

  prepareInitialDealAnimation(state) {
    if (
      this.initialDealAnimationStarted ||
      !state?.players ||
      !this.textures.exists("npc-card-back")
    ) {
      return;
    }

    const dealItems = state.players.flatMap((player, playerIndex) =>
      player.hand.slice(0, INITIAL_DEAL_CARD_COUNT).map((card, handIndex) => ({
        card,
        handIndex,
        handCount: player.hand.length,
        isNpc: playerIndex === ENEMY_INDEX,
      })),
    );

    if (dealItems.length === 0) {
      return;
    }

    this.initialDealAnimationStarted = true;
    this.initialDealAnimationsPending = dealItems.length;
    this.initialDealHiddenCardIds = new Set(
      dealItems.map((item) => item.card.instanceId),
    );

    dealItems.forEach((item, index) => {
      this.time.delayedCall(index * 110, () => {
        const deckPosition = item.isNpc
          ? { x: ENEMY_DECK_PILE_X, y: ENEMY_DECK_PILE_Y }
          : this.getPlayerDeckPosition();
        const handCenter = item.isNpc
          ? this.getNpcHandCardCenter(item.handIndex, item.handCount)
          : this.getPlayerHandCardCenter(item.handIndex, item.handCount);
        const handScale = item.isNpc ? NPC_CARD_SCALE : PLAYER_CARD_SCALE;

        this.animateDrawCard(
          {
            x: deckPosition.x,
            y: deckPosition.y,
            displayWidth: DECK_PILE_WIDTH,
            displayHeight: DECK_PILE_HEIGHT,
          },
          {
            x: handCenter.x,
            y: handCenter.y,
            displayWidth: Math.round(HAND_CARD_WIDTH * handScale),
            displayHeight: Math.round(HAND_CARD_HEIGHT * handScale),
          },
          () => {
            this.initialDealHiddenCardIds.delete(item.card.instanceId);
            this.initialDealAnimationsPending -= 1;

            if (this.initialDealAnimationsPending <= 0) {
              this.initialDealHiddenCardIds.clear();
            }

            this.renderState(this.engine.getState());
          },
        );
      });
    });
  }

  prepareAutomaticDrawAnimation(previousState, nextState) {
    if (
      !previousState?.players ||
      !nextState?.players ||
      previousState.phase !== "playing" ||
      nextState.phase !== "playing"
    ) {
      return;
    }

    const drawInfo = nextState.players
      .map((nextPlayer, playerIndex) => {
        const previousPlayer = previousState.players[playerIndex];
        const drawnCardId = previousPlayer
          ? this.getDrawnCardId(previousPlayer.hand, nextPlayer.hand)
          : null;

        return drawnCardId ? { playerIndex, drawnCardId } : null;
      })
      .find(Boolean);

    if (!drawInfo) {
      return;
    }

    const activeIndex = drawInfo.playerIndex;
    const drawnCardId = drawInfo.drawnCardId;
    const nextPlayer = nextState.players[activeIndex];

    const animationKey = `${nextState.turn}:${activeIndex}:${drawnCardId}:${nextPlayer.deck.length}`;

    if (this.lastAutomaticDrawAnimationKey === animationKey) {
      return;
    }

    const isNpc = activeIndex === ENEMY_INDEX;
    const handIndex = nextPlayer.hand.findIndex(
      (card) => card.instanceId === drawnCardId,
    );
    const destinationCenter = isNpc
      ? this.getNpcHandCardCenter(handIndex, nextPlayer.hand.length)
      : this.getPlayerHandCardCenter(handIndex, nextPlayer.hand.length);
    const deckPosition = isNpc
      ? { x: ENEMY_DECK_PILE_X, y: ENEMY_DECK_PILE_Y }
      : this.getPlayerDeckPosition();
    const handScale = isNpc ? NPC_CARD_SCALE : PLAYER_CARD_SCALE;

    this.lastAutomaticDrawAnimationKey = animationKey;
    this.isCardDrawAnimating = true;

    if (isNpc) {
      this.animatingNpcDrawCardId = drawnCardId;
    } else {
      this.animatingPlayerDrawCardId = drawnCardId;
    }

    this.animateDrawCard(
      {
        x: deckPosition.x,
        y: deckPosition.y,
        displayWidth: DECK_PILE_WIDTH,
        displayHeight: DECK_PILE_HEIGHT,
      },
      {
        x: destinationCenter.x,
        y: destinationCenter.y,
        displayWidth: Math.round(HAND_CARD_WIDTH * handScale),
        displayHeight: Math.round(HAND_CARD_HEIGHT * handScale),
      },
      () => {
        if (isNpc) {
          this.animatingNpcDrawCardId = null;
        } else {
          this.animatingPlayerDrawCardId = null;
        }

        this.isCardDrawAnimating = false;
        this.renderState(this.engine.getState());
      },
    );
  }

  getAttackPointerPosition(pointer) {
    return {
      x: pointer.worldX ?? pointer.x,
      y: pointer.worldY ?? pointer.y,
    };
  }

  getHandCardDropBounds() {
    const firstSlot = ALLY_BOARD_SLOTS[0];
    const lastSlot = ALLY_BOARD_SLOTS[ALLY_BOARD_SLOTS.length - 1];
    const left = firstSlot.x - 18;
    const top = Math.max(this.logicalHeight / 2 + 8, firstSlot.y + 8);
    const bottom = firstSlot.y + BOARD_CARD_HEIGHT + 64;

    return new Phaser.Geom.Rectangle(
      left,
      top,
      lastSlot.x + BOARD_CARD_WIDTH + 18 - left,
      bottom - top,
    );
  }

  getUntargetedSpellDropBounds() {
    const firstSlot = ENEMY_BOARD_SLOTS[0];
    const left = firstSlot.x - 40;
    const top = ENEMY_HUD_FRAME_TOP_MARGIN;
    const right = this.logicalWidth - ENEMY_HUD_FRAME_RIGHT_MARGIN;
    const bottom =
      getPlayerHandCenterY(this.logicalHeight) -
      (HAND_CARD_HEIGHT * PLAYER_CARD_SCALE) / 2 -
      8;

    return new Phaser.Geom.Rectangle(
      left,
      top,
      right - left,
      bottom - top,
    );
  }

  clearHandCardDropIndicator() {
    if (this.handCardDropGraphics?.active) {
      this.handCardDropGraphics.destroy();
    }
    if (this.handCardDropHint?.container?.active) {
      this.handCardDropHint.container.destroy(true);
    }

    this.handCardDropGraphics = null;
    this.handCardDropHint = null;
  }

  drawDropTargetCorners(
    graphics,
    x,
    y,
    width,
    height,
    color,
    alpha,
    thickness = 1.5,
  ) {
    const cornerLength = 12;
    const right = x + width;
    const bottom = y + height;
    graphics.lineStyle(thickness, color, alpha);
    graphics.lineBetween(x, y, x + cornerLength, y);
    graphics.lineBetween(x, y, x, y + cornerLength);
    graphics.lineBetween(right, y, right - cornerLength, y);
    graphics.lineBetween(right, y, right, y + cornerLength);
    graphics.lineBetween(x, bottom, x + cornerLength, bottom);
    graphics.lineBetween(x, bottom, x, bottom - cornerLength);
    graphics.lineBetween(right, bottom, right - cornerLength, bottom);
    graphics.lineBetween(right, bottom, right, bottom - cornerLength);
  }

  clearHandCardDrag() {
    this.clearHandCardDropIndicator();

    const visual = this.handCardDrag?.visual;
    if (visual?.container?.active) {
      visual.container.setData("isHandDragging", false);
    }
    this.handCardDrag = null;
    this.pendingHandCardDrag = null;
  }

  clearHandCardHover() {
    const resetHover = this.activeHandCardHoverReset;
    this.activeHandCardHoverReset = null;
    resetHover?.();
  }

  handlePointerExitGame() {
    const hadAttackInteraction = Boolean(
      this.attackDragSource || this.pendingAttackDrag,
    );
    this.clearHandCardHover();
    this.clearHandCardDrag();
    this.clearAttackDrag();

    if (hadAttackInteraction) {
      this.selectedBoardCardId = null;
      this.selectedBoardCardIndex = null;
      this.boardCardSelectionTweenId = null;
    }

    if (
      this.renderRoot?.active &&
      this.engine?.getState() &&
      !this.isCardPlayAnimating &&
      !this.isCardDrawAnimating
    ) {
      this.renderState(this.engine.getState());
    }
  }

  prepareHandCardDrag(pointer, handIndex, card, visual) {
    if (!card || pointer.button !== 0) {
      return;
    }

    const position = this.getAttackPointerPosition(pointer);
    this.pendingHandCardDrag = {
      pointerId: pointer.id,
      startX: position.x,
      startY: position.y,
      handIndex,
      card,
      visual,
    };
  }

  canStartHandCardDrag() {
    const state = this.engine.getState();

    return (
      state.phase === "playing" &&
      !state.winner &&
      state.activePlayerIndex === PLAYER_INDEX &&
      !this.isCardPlayAnimating &&
      !this.isCardDrawAnimating &&
      !this.isTurnTransitionAnimating &&
      !this.isGamePaused
    );
  }

  beginHandCardDrag(pointer) {
    const pending = this.pendingHandCardDrag;
    if (!pending || !this.canStartHandCardDrag()) {
      return false;
    }

    this.clearAttackDrag();
    this.pendingHandCardDrag = null;
    this.handCardDrag = {
      ...pending,
      originalDepth: pending.visual.container.depth,
    };

    const { container, cardImage, selectionFrame, typeBadge } = pending.visual;
    this.tweens.killTweensOf(container);
    this.tweens.killTweensOf(cardImage);
    container.setData("isHandDragging", true);
    container.setDepth(15500);
    selectionFrame?.setAlpha(0);
    cardImage.setDisplaySize(
      Math.round(HAND_CARD_WIDTH * HAND_CARD_DRAG_SCALE),
      Math.round(HAND_CARD_HEIGHT * HAND_CARD_DRAG_SCALE),
    );
    typeBadge?.setVisible(true);
    typeBadge?.setY(
      Math.round((HAND_CARD_HEIGHT * HAND_CARD_DRAG_SCALE) / 2) + 15,
    );

    this.handCardDropGraphics = this.add.graphics().setDepth(9400);
    const hintContainer = this.add.container(0, 0).setDepth(9401);
    const hintBackground = this.add.graphics();
    const hintText = centerText(this, 0, 0, "SUA AREA DE JOGO", 10, "#cbd5e1", "900");
    hintContainer.add([hintBackground, hintText]);
    this.handCardDropHint = {
      container: hintContainer,
      background: hintBackground,
      text: hintText,
    };
    this.updateHandCardDrag(pointer);
    return true;
  }

  updateHandCardDrag(pointer) {
    const drag = this.handCardDrag;
    if (!drag || pointer.id !== drag.pointerId) {
      return;
    }

    const position = this.getAttackPointerPosition(pointer);
    const state = this.engine.getState();
    const player = state.players[PLAYER_INDEX];
    const enemy = state.players[ENEMY_INDEX];
    const isTargetedSpell = drag.card.targetType === "enemyCreature";
    const isUntargetedSpell =
      drag.card.type === "spell" && !isTargetedSpell;
    const bounds = isUntargetedSpell
      ? this.getUntargetedSpellDropBounds()
      : this.getHandCardDropBounds();
    const creatureTarget = isTargetedSpell
      ? this.getEnemySpellTargetAt(position.x, position.y)
      : null;
    const isOverBoard = isTargetedSpell
      ? Boolean(creatureTarget)
      : Phaser.Geom.Rectangle.Contains(bounds, position.x, position.y);
    const canPay = drag.card.manaCost <= player.mana;
    const hasBoardSlot =
      drag.card.type !== "creature" ||
      player.board.length < state.config.maxBoardSize;
    const hasRequiredTarget = !isTargetedSpell || Boolean(creatureTarget);
    const canPlay = canPay && hasBoardSlot && hasRequiredTarget;
    const color = !isOverBoard ? 0x94a3b8 : canPlay ? 0x4ade80 : 0xf87171;
    const colorCss = `#${color.toString(16).padStart(6, "0")}`;
    const centerX = bounds.centerX;
    const centerY = isTargetedSpell
      ? ENEMY_BOARD_SLOTS[0]?.y ?? bounds.centerY - 120
      : bounds.centerY - 4;

    drag.visual.container.setPosition(position.x, position.y - 18);
    this.handCardDropGraphics.clear();
    if (!isTargetedSpell) {
      this.handCardDropGraphics.fillStyle(color, isOverBoard ? 0.075 : 0.028);
      this.handCardDropGraphics.fillEllipse(
        centerX,
        centerY + 8,
        bounds.width * 0.94,
        bounds.height * 0.78,
      );
    }

    if (isTargetedSpell) {
      const tauntActive = enemy.board.some((card) => card.taunt);
      enemy.board.forEach((card, index) => {
        if (tauntActive && !card.taunt) return;
        const slot = ENEMY_BOARD_SLOTS[index];
        if (!slot) return;
        const pose = this.getBoardCardPose(slot, index, true);
        const isHovered = creatureTarget?.index === index;
        this.drawDropTargetCorners(
          this.handCardDropGraphics,
          pose.x - BOARD_CARD_WIDTH / 2 - 4,
          pose.y - BOARD_CARD_HEIGHT / 2 - 4,
          BOARD_CARD_WIDTH + 8,
          BOARD_CARD_HEIGHT + 8,
          isHovered ? 0xf87171 : 0xcbd5e1,
          isHovered ? 1 : 0.52,
          isHovered ? 2.5 : 1.5,
        );
      });
    } else if (drag.card.type === "creature" && hasBoardSlot) {
      ALLY_BOARD_SLOTS.forEach((slot, index) => {
        if (index < player.board.length) {
          return;
        }

        const pose = this.getBoardCardPose(slot, index, false);
        const isNextSlot = index === player.board.length;
        const markerWidth = BOARD_CARD_WIDTH + (isNextSlot ? 8 : 2);
        const markerHeight = BOARD_CARD_HEIGHT + (isNextSlot ? 2 : -6);
        const markerX = pose.x - markerWidth / 2;
        const markerY = Math.max(
          bounds.y + 4,
          pose.y - markerHeight / 2,
        );
        const markerAlpha = isNextSlot
          ? isOverBoard
            ? 0.96
            : 0.58
          : isOverBoard
            ? 0.3
            : 0.18;

        if (isNextSlot) {
          this.handCardDropGraphics.fillStyle(
            color,
            isOverBoard ? 0.1 : 0.045,
          );
          this.handCardDropGraphics.fillRoundedRect(
            markerX,
            markerY,
            markerWidth,
            markerHeight,
            7,
          );
        }
        this.drawDropTargetCorners(
          this.handCardDropGraphics,
          markerX,
          markerY,
          markerWidth,
          markerHeight,
          color,
          markerAlpha,
          isNextSlot ? 2 : 1,
        );
      });
    } else {
      const runeRadius = 34;
      this.handCardDropGraphics.lineStyle(
        2,
        color,
        isOverBoard ? 0.82 : 0.42,
      );
      this.handCardDropGraphics.strokeCircle(centerX, centerY, runeRadius);
      this.handCardDropGraphics.lineStyle(
        1,
        color,
        isOverBoard ? 0.52 : 0.24,
      );
      this.handCardDropGraphics.strokeCircle(centerX, centerY, runeRadius - 8);
      this.handCardDropGraphics.lineBetween(
        centerX - 18,
        centerY,
        centerX + 18,
        centerY,
      );
      this.handCardDropGraphics.lineBetween(
        centerX,
        centerY - 18,
        centerX,
        centerY + 18,
      );
    }

    if (this.handCardDropHint) {
      const hintMessage = !isOverBoard
        ? isTargetedSpell
          ? "SOLTE SOBRE UMA CRIATURA"
          : isUntargetedSpell
            ? "SOLTE NA ARENA"
            : "SUA AREA DE JOGO"
        : !canPay
          ? "MANA INSUFICIENTE"
          : !hasBoardSlot
            ? "CAMPO CHEIO"
            : drag.card.type === "creature"
              ? "SOLTE PARA INVOCAR"
              : isTargetedSpell
                ? `ALVO: ${creatureTarget.card.name}`
                : "SOLTE PARA CONJURAR";
      const { container, background, text } = this.handCardDropHint;
      container.setPosition(
        centerX,
        isTargetedSpell ? centerY - 72 : bounds.bottom - 13,
      );
      container.setAlpha(isOverBoard ? 1 : 0.68);
      background.clear();
      background.fillStyle(0x020617, isOverBoard ? 0.9 : 0.68);
      background.fillRoundedRect(-76, -11, 152, 22, 8);
      background.lineStyle(1, color, isOverBoard ? 0.78 : 0.38);
      background.strokeRoundedRect(-76, -11, 152, 22, 8);
      text.setText(hintMessage);
      text.setColor(colorCss);
    }
  }

  animateHandCardReturn(drag) {
    const { container } = drag.visual;
    if (!container?.active) {
      return;
    }

    container.setData("isHandDragging", false);
    this.tweens.add({
      targets: container,
      x: drag.visual.homeX,
      y: drag.visual.homeY,
      duration: 260,
      ease: "Back.easeOut",
      onComplete: () => this.renderState(this.engine.getState()),
    });
  }

  showCardPlayRejection(message, drag) {
    const x = drag.visual.container.x;
    const y = drag.visual.container.y - 42;
    const badge = this.add.container(x, y).setDepth(17000);
    const background = this.add.graphics();
    background.fillStyle(0x450a0a, 0.96);
    background.fillRoundedRect(-88, -21, 176, 42, 10);
    background.lineStyle(2, 0xf87171, 1);
    background.strokeRoundedRect(-88, -21, 176, 42, 10);
    const text = centerText(this, 0, 0, message, 15, "#ffffff");
    badge.add([background, text]);
    badge.setScale(0.72);
    this.cameras.main.shake(120, 0.002);

    this.tweens.add({
      targets: badge,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 180,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: badge,
          y: y - 28,
          alpha: 0,
          delay: 650,
          duration: 420,
          onComplete: () => badge.destroy(true),
        });
      },
    });
  }

  finishHandCardDrag(pointer) {
    const drag = this.handCardDrag;
    if (!drag || pointer.id !== drag.pointerId) {
      this.clearHandCardDrag();
      return;
    }

    const position = this.getAttackPointerPosition(pointer);
    const state = this.engine.getState();
    const player = state.players[PLAYER_INDEX];
    const isTargetedSpell = drag.card.targetType === "enemyCreature";
    const isUntargetedSpell =
      drag.card.type === "spell" && !isTargetedSpell;
    const dropBounds = isUntargetedSpell
      ? this.getUntargetedSpellDropBounds()
      : this.getHandCardDropBounds();
    const creatureTarget = isTargetedSpell
      ? this.getEnemySpellTargetAt(position.x, position.y)
      : null;
    const isOverBoard = isTargetedSpell
      ? Boolean(creatureTarget)
      : Phaser.Geom.Rectangle.Contains(
          dropBounds,
          position.x,
          position.y,
        );
    const handIndex = player.hand.findIndex(
      (card) => card.instanceId === drag.card.instanceId,
    );

    this.clearHandCardDropIndicator();
    this.handCardDrag = null;
    this.pendingHandCardDrag = null;

    if (!isOverBoard || handIndex < 0 || !this.canStartHandCardDrag()) {
      if (isTargetedSpell && handIndex >= 0) {
        this.showCardPlayRejection("ESCOLHA UMA CRIATURA", drag);
      }
      this.animateHandCardReturn(drag);
      return;
    }

    if (drag.card.manaCost > player.mana) {
      this.showCardPlayRejection("MANA INSUFICIENTE", drag);
      this.animateHandCardReturn(drag);
      return;
    }

    if (
      drag.card.type === "creature" &&
      player.board.length >= state.config.maxBoardSize
    ) {
      this.showCardPlayRejection("CAMPO CHEIO", drag);
      this.animateHandCardReturn(drag);
      return;
    }

    const start = {
      x: drag.visual.container.x,
      y: drag.visual.container.y,
      angle: drag.visual.container.angle,
      displayWidth: drag.visual.cardImage.displayWidth,
      displayHeight: drag.visual.cardImage.displayHeight,
      textureKey: drag.visual.textureKey,
      textureFrame: drag.visual.textureFrame,
      directPlay: true,
    };

    drag.visual.container.setData("isHandDragging", false);
    this.playSelectedCardWithAnimation(
      state,
      handIndex,
      drag.card,
      start,
      creatureTarget?.index ?? null,
    );
  }

  handleHandCardPointerMove(pointer) {
    if (this.pendingHandCardDrag) {
      if (
        pointer.id !== this.pendingHandCardDrag.pointerId ||
        !pointer.isDown
      ) {
        return true;
      }

      const position = this.getAttackPointerPosition(pointer);
      const distance = Math.hypot(
        position.x - this.pendingHandCardDrag.startX,
        position.y - this.pendingHandCardDrag.startY,
      );

      if (distance >= HAND_CARD_DRAG_THRESHOLD) {
        this.beginHandCardDrag(pointer);
      }
      return true;
    }

    if (!this.handCardDrag) {
      return false;
    }

    if (!pointer.isDown) {
      this.clearHandCardDrag();
      return true;
    }

    this.updateHandCardDrag(pointer);
    return true;
  }

  dismissSelectedHandCardOutsideHand(pointer) {
    if (
      !this.selectedPlayerCardId ||
      pointer.isDown ||
      this.handCardDrag ||
      this.pendingHandCardDrag
    ) {
      return false;
    }

    const position = this.getAttackPointerPosition(pointer);
    const normalHandTop =
      getPlayerHandCenterY(this.logicalHeight) -
      (HAND_CARD_HEIGHT * PLAYER_CARD_SCALE) / 2;

    if (position.y >= normalHandTop) {
      return false;
    }

    this.selectedPlayerCardId = null;
    this.renderState(this.engine.getState());
    return true;
  }

  getEnemyCreatureTargetAt(x, y) {
    const state = this.engine.getState();
    const enemy = state.players[ENEMY_INDEX];

    for (let index = enemy.board.length - 1; index >= 0; index -= 1) {
      const slot = ENEMY_BOARD_SLOTS[index];

      if (!slot) {
        continue;
      }

      const pose = this.getBoardCardPose(slot, index, true);
      const bounds = new Phaser.Geom.Rectangle(
        pose.x - BOARD_CARD_WIDTH / 2,
        pose.y - BOARD_CARD_HEIGHT / 2,
        BOARD_CARD_WIDTH,
        BOARD_CARD_HEIGHT,
      );

      if (Phaser.Geom.Rectangle.Contains(bounds, x, y)) {
        return {
          type: "creature",
          card: enemy.board[index],
          index,
          x: pose.x,
          y: pose.y,
          bounds,
        };
      }
    }

    return null;
  }

  getEnemySpellTargetAt(x, y) {
    const target = this.getEnemyCreatureTargetAt(x, y);
    if (!target) return null;

    const enemy = this.engine.getState().players[ENEMY_INDEX];
    const tauntActive = enemy.board.some((card) => card.taunt);
    return !tauntActive || target.card.taunt ? target : null;
  }

  getAttackTargetAt(x, y) {
    const state = this.engine.getState();
    const enemy = state.players[ENEMY_INDEX];
    const tauntActive = enemy.board.some((card) => card.taunt);
    const creatureTarget = this.getEnemyCreatureTargetAt(x, y);

    if (creatureTarget) {
      return !tauntActive || creatureTarget.card.taunt ? creatureTarget : null;
    }

    const heroX =
      this.logicalWidth - HUD_FRAME_WIDTH - ENEMY_HUD_FRAME_RIGHT_MARGIN;
    const heroY = ENEMY_HUD_FRAME_TOP_MARGIN;
    const heroBounds = new Phaser.Geom.Rectangle(
      heroX,
      heroY,
      HUD_FRAME_WIDTH,
      HUD_FRAME_HEIGHT,
    );

    if (!tauntActive && Phaser.Geom.Rectangle.Contains(heroBounds, x, y)) {
      return {
        type: "hero",
        playerIndex: ENEMY_INDEX,
        x: heroX + HUD_FRAME_WIDTH / 2,
        y: heroY + HUD_FRAME_HEIGHT / 2,
        bounds: heroBounds,
      };
    }

    return null;
  }

  beginAttackDrag(card, boardIndex, pose, pointer) {
    this.clearAttackDrag();
    this.selectedBoardCardId = card.instanceId;
    this.selectedBoardCardIndex = boardIndex;
    this.attackDragSource = {
      card,
      boardIndex,
      x: pose.x,
      y: pose.y,
      pointerId: pointer.id,
    };
    this.attackDragGraphics = this.add.graphics();
    this.attackDragGraphics.setDepth(15000);
    this.updateAttackDrag(pointer);
  }

  prepareAttackDrag(pointer, onStart, onClick) {
    const position = this.getAttackPointerPosition(pointer);
    this.pendingAttackDrag = {
      pointerId: pointer.id,
      startX: position.x,
      startY: position.y,
      onStart,
      onClick,
    };
  }

  updateAttackDrag(pointer) {
    if (
      !this.attackDragGraphics ||
      !this.attackDragSource ||
      pointer.id !== this.attackDragSource.pointerId
    ) {
      return;
    }

    const position = this.getAttackPointerPosition(pointer);
    const hoveredTarget = this.getAttackTargetAt(position.x, position.y);
    const graphics = this.attackDragGraphics;
    const arrowEnd = hoveredTarget
      ? { x: hoveredTarget.x, y: hoveredTarget.y }
      : position;
    const deltaX = arrowEnd.x - this.attackDragSource.x;
    const deltaY = arrowEnd.y - this.attackDragSource.y;
    const length = Math.hypot(deltaX, deltaY);

    graphics.clear();
    if (length < 1) {
      return;
    }

    const color = hoveredTarget ? 0xfacc15 : 0xf87171;
    const unitX = deltaX / length;
    const unitY = deltaY / length;
    const perpendicularX = -unitY;
    const perpendicularY = unitX;
    const headLength = Math.min(16, Math.max(10, length * 0.22));
    const headHalfWidth = 7;
    const headBaseX = arrowEnd.x - unitX * headLength;
    const headBaseY = arrowEnd.y - unitY * headLength;

    graphics.lineStyle(7, color, 0.16);
    graphics.lineBetween(
      this.attackDragSource.x,
      this.attackDragSource.y,
      headBaseX,
      headBaseY,
    );
    graphics.lineStyle(2.5, color, 0.96);
    graphics.lineBetween(
      this.attackDragSource.x,
      this.attackDragSource.y,
      headBaseX,
      headBaseY,
    );
    graphics.fillStyle(color, 0.98);
    graphics.fillTriangle(
      arrowEnd.x,
      arrowEnd.y,
      headBaseX + perpendicularX * headHalfWidth,
      headBaseY + perpendicularY * headHalfWidth,
      headBaseX - perpendicularX * headHalfWidth,
      headBaseY - perpendicularY * headHalfWidth,
    );
  }

  finishAttackDrag(pointer) {
    if (
      !this.attackDragSource ||
      pointer.id !== this.attackDragSource.pointerId
    ) {
      this.clearAttackDrag();
      return;
    }

    const source = this.attackDragSource;
    const position = this.getAttackPointerPosition(pointer);
    const target = this.getAttackTargetAt(position.x, position.y);
    this.clearAttackDrag();

    if (!target) {
      this.selectedBoardCardId = null;
      this.selectedBoardCardIndex = null;
      this.renderState(this.engine.getState());
      return;
    }

    this.animateBoardAttack(source, target, () => {
      this.selectedBoardCardId = null;
      this.selectedBoardCardIndex = null;
      this.inspectedBoardCardId = null;
      this.inspectedBoardOwnerId = null;

      if (target.type === "creature") {
        this.engine.attackCreature(source.boardIndex, target.index);
      } else {
        this.engine.attackFace(source.boardIndex);
      }
    });
  }

  animateLethalHeroBreak(target, onComplete) {
    const state = this.engine.getState();
    const defeatedPlayer = state.players[target.playerIndex];

    if (!defeatedPlayer) {
      onComplete();
      return;
    }

    gameAudio.play(SOUND_KEYS.finalAttack);

    const effect = this.add.container(target.x, target.y).setDepth(19600);
    const screenShade = this.add.graphics().setDepth(19500);
    screenShade.fillStyle(0x02040a, 0.64);
    screenShade.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    screenShade.setAlpha(0);
    const impactFlash = this.add.graphics().setDepth(19700);
    impactFlash.fillStyle(0xfff7ed, 1);
    impactFlash.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    impactFlash.setAlpha(0);

    const victimCard = this.add.container(0, 0);
    const frame = this.textures.exists("hud-frame")
      ? this.add.image(0, 0, "hud-frame")
      : null;
    if (frame) {
      frame.setDisplaySize(HUD_FRAME_WIDTH, HUD_FRAME_HEIGHT);
    }
    const avatarKey = defeatedPlayer.avatarKey ?? "avatar1";
    const avatar = this.textures.exists(avatarKey)
      ? this.add.image(0, -12, avatarKey)
      : centerText(this, 0, -12, "Avatar", 12, "#ffffff", "800");
    if (this.textures.exists(avatarKey)) {
      const avatarSize = getTextureFrameSize(this, avatarKey);
      const avatarDisplaySize = fitSizePreservingAspect(
        avatarSize.width,
        avatarSize.height,
        HUD_AVATAR_MAX_WIDTH,
        HUD_AVATAR_MAX_HEIGHT,
      );
      avatar.setDisplaySize(avatarDisplaySize.width, avatarDisplaySize.height);
    }
    const victimName = centerText(
      this,
      0,
      62,
      defeatedPlayer.name,
      12,
      "#fee2e2",
      "900",
    );
    victimCard.add([...(frame ? [frame] : []), avatar, victimName]);

    const cracks = this.add.graphics();
    cracks.lineStyle(2.2, 0xfff7ed, 0.98);
    for (let index = 0; index < 13; index += 1) {
      const angle = (Math.PI * 2 * index) / 13 + (index % 2) * 0.13;
      const innerX = Math.cos(angle) * 8;
      const innerY = Math.sin(angle) * 8;
      const middleX = Math.cos(angle + 0.12) * (28 + (index % 3) * 5);
      const middleY = Math.sin(angle + 0.12) * (34 + (index % 4) * 5);
      const outerX = Math.cos(angle - 0.08) * (58 + (index % 3) * 8);
      const outerY = Math.sin(angle - 0.08) * (70 + (index % 2) * 9);
      cracks.lineBetween(innerX, innerY, middleX, middleY);
      cracks.lineBetween(middleX, middleY, outerX, outerY);
    }
    cracks.setAlpha(0);

    const shockwave = this.add.graphics();
    shockwave.lineStyle(4, 0xef4444, 0.9);
    shockwave.strokeCircle(0, 0, 34);
    shockwave.setScale(0.3);
    shockwave.setAlpha(0);

    const shards = Array.from({ length: 26 }, (_item, index) => {
      const angle = (Math.PI * 2 * index) / 26 + (index % 3) * 0.08;
      const distance = 90 + (index % 5) * 18;
      const shard = this.add.triangle(
        0,
        0,
        -4 - (index % 3),
        -3,
        5 + (index % 4),
        -2,
        -1,
        7 + (index % 3),
        index % 4 === 0 ? 0xfff7ed : index % 2 === 0 ? 0xef4444 : 0x7f1d1d,
        1,
      );
      shard.setAlpha(0);
      shard.setData("targetX", Math.cos(angle) * distance);
      shard.setData("targetY", Math.sin(angle) * distance);
      return shard;
    });
    const fatalText = centerText(
      this,
      this.logicalWidth / 2 - target.x,
      this.logicalHeight / 2 - target.y,
      "GOLPE FATAL",
      34,
      "#fff7ed",
      "900",
    );
    fatalText.setStroke("#7f1d1d", 6);
    fatalText.setAlpha(0);
    fatalText.setScale(1.55);

    effect.add([
      victimCard,
      cracks,
      shockwave,
      ...shards,
      fatalText,
    ]);
    this.cameras.main.shake(760, 0.012);
    this.tweens.add({
      targets: screenShade,
      alpha: 1,
      duration: 180,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: impactFlash,
      alpha: { from: 0, to: 0.92 },
      duration: 85,
      yoyo: true,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: victimCard,
      angle: { from: -3, to: 3 },
      scaleX: { from: 1, to: 1.08 },
      scaleY: { from: 1, to: 1.08 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        frame?.setTint(0xef4444);
        if (typeof avatar.setTint === "function") {
          avatar.setTint(0xef4444);
        }
        cracks.setAlpha(1);
        shockwave.setAlpha(1);
        shards.forEach((shard, index) => {
          shard.setAlpha(1);
          this.tweens.add({
            targets: shard,
            x: shard.getData("targetX"),
            y: shard.getData("targetY"),
            angle: 180 + index * 37,
            alpha: 0,
            delay: index * 8,
            duration: 620 + (index % 4) * 80,
            ease: "Cubic.easeOut",
          });
        });
        this.tweens.add({
          targets: victimCard,
          scaleX: 1.22,
          scaleY: 1.22,
          alpha: 0,
          duration: 260,
          ease: "Cubic.easeIn",
        });
        this.tweens.add({
          targets: shockwave,
          scaleX: 3.2,
          scaleY: 3.2,
          alpha: 0,
          duration: 620,
          ease: "Cubic.easeOut",
        });
        this.tweens.add({
          targets: fatalText,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 230,
          ease: "Back.easeOut",
        });
      },
    });

    this.time.delayedCall(850, () => {
      this.tweens.add({
        targets: fatalText,
        alpha: 0,
        scaleX: 1.16,
        scaleY: 1.16,
        duration: 220,
      });
    });
    this.time.delayedCall(1120, () => {
      effect.destroy(true);
      screenShade.destroy();
      impactFlash.destroy();
      onComplete();
    });
  }

  animateBoardAttack(source, target, onComplete) {
    const attackerContainer = this.boardCardContainers.get(
      source.card.instanceId,
    );

    if (!attackerContainer) {
      onComplete();
      return;
    }

    this.isCardPlayAnimating = true;
    const targetPlayer =
      target.type === "hero" ? this.engine.getState().players[target.playerIndex] : null;
    const isLethalHeroAttack = Boolean(
      targetPlayer &&
        Math.max(0, source.card.attack ?? 0) >= Math.max(0, targetPlayer.health),
    );
    const finishCombat = () => {
      this.isCardPlayAnimating = false;
      onComplete();
    };
    const finishHeroAttack = () => {
      if (isLethalHeroAttack) {
        this.animateLethalHeroBreak(target, finishCombat);
      } else {
        finishCombat();
      }
    };

    this.animateCardStrike(
      attackerContainer,
      target,
      source.card.attack,
      () => {
        if (target.type !== "creature") {
          finishHeroAttack();
          return;
        }

        const defenderContainer = this.boardCardContainers.get(
          target.card?.instanceId,
        );

        if (!defenderContainer) {
          finishCombat();
          return;
        }

        this.animateCardStrike(
          defenderContainer,
          { x: source.x, y: source.y },
          target.card.attack,
          finishCombat,
        );
      },
    );
  }

  animateCardStrike(cardContainer, target, damage, onComplete) {
    const originalX = cardContainer.x;
    const originalY = cardContainer.y;
    const originalDepth = cardContainer.depth;
    const attackX = originalX + (target.x - originalX) * 0.62;
    const attackY = originalY + (target.y - originalY) * 0.62;
    gameAudio.play(
      damage >= 5 ? SOUND_KEYS.fightMedium : SOUND_KEYS.fightSmall,
      { gain: 0.78 },
    );
    cardContainer.setDepth(14500);

    this.tweens.add({
      targets: cardContainer,
      x: attackX,
      y: attackY,
      duration: 150,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.showDamageNumber(target.x, target.y, damage);
        this.cameras.main.shake(75, 0.0025);

        this.tweens.add({
          targets: cardContainer,
          x: originalX,
          y: originalY,
          delay: 90,
          duration: 145,
          ease: "Cubic.easeOut",
          onComplete: () => {
            cardContainer.setDepth(originalDepth);
            onComplete();
          },
        });
      },
    });
  }

  showDamageNumber(x, y, damage) {
    const badge = this.add.container(x, y - 8);
    const background = this.add.graphics();
    background.fillStyle(0x450a0a, 0.94);
    background.fillRoundedRect(-29, -16, 58, 32, 9);
    background.lineStyle(2, 0xfca5a5, 1);
    background.strokeRoundedRect(-29, -16, 58, 32, 9);
    const text = this.add
      .text(0, 0, `-${Math.max(0, damage ?? 0)}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#7f1d1d",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    badge.add([background, text]);
    badge.setDepth(16000);
    badge.setScale(0.7);

    this.tweens.add({
      targets: badge,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 170,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: badge,
          y: y - 40,
          alpha: 0,
          delay: 720,
          duration: 620,
          ease: "Cubic.easeIn",
          onComplete: () => badge.destroy(true),
        });
      },
    });
  }

  handleAttackPointerMove(pointer) {
    if (this.handleHandCardPointerMove(pointer)) {
      return;
    }

    if (this.dismissSelectedHandCardOutsideHand(pointer)) {
      return;
    }

    if (this.pendingAttackDrag) {
      if (
        pointer.id !== this.pendingAttackDrag.pointerId ||
        !pointer.isDown
      ) {
        return;
      }

      const position = this.getAttackPointerPosition(pointer);
      const distance = Math.hypot(
        position.x - this.pendingAttackDrag.startX,
        position.y - this.pendingAttackDrag.startY,
      );

      if (distance < ATTACK_DRAG_THRESHOLD) {
        return;
      }

      const onStart = this.pendingAttackDrag.onStart;
      this.pendingAttackDrag = null;
      onStart(pointer);
      return;
    }

    if (!this.attackDragSource) {
      return;
    }

    if (!pointer.isDown) {
      this.clearAttackDrag();
      return;
    }

    this.updateAttackDrag(pointer);
  }

  handleAttackPointerUp(pointer) {
    if (this.handCardDrag) {
      this.finishHandCardDrag(pointer);
      return;
    }

    if (
      this.pendingHandCardDrag &&
      pointer.id === this.pendingHandCardDrag.pointerId
    ) {
      const card = this.pendingHandCardDrag.card;
      this.pendingHandCardDrag = null;
      this.handlePlayerHandCardClick(card);
      return;
    }

    if (this.attackDragSource) {
      this.finishAttackDrag(pointer);
      return;
    }

    if (
      this.pendingAttackDrag &&
      pointer.id === this.pendingAttackDrag.pointerId
    ) {
      const onClick = this.pendingAttackDrag.onClick;
      this.pendingAttackDrag = null;
      onClick();
    }
  }

  clearAttackDrag() {
    if (this.attackDragGraphics) {
      this.attackDragGraphics.destroy();
      this.attackDragGraphics = null;
    }

    this.attackDragSource = null;
    this.pendingAttackDrag = null;
  }

  handleBoardCardClick(card, boardIndex, ownerId) {
    if (this.isCardPlayAnimating || this.isCardDrawAnimating) {
      return;
    }

    this.selectedPlayerCardId = null;

    if (
      this.inspectedBoardCardId === card.instanceId &&
      this.inspectedBoardOwnerId === ownerId
    ) {
      this.inspectedBoardCardId = null;
      this.inspectedBoardOwnerId = null;
      this.selectedBoardCardId = null;
      this.selectedBoardCardIndex = null;
      this.boardCardSelectionTweenId = null;
      this.renderState(this.engine.getState());
      return;
    }

    this.inspectedBoardCardId = card.instanceId;
    this.inspectedBoardOwnerId = ownerId;

    if (ownerId === "p1") {
      this.selectedBoardCardId = card.instanceId;
      this.selectedBoardCardIndex = boardIndex;
      this.boardCardSelectionTweenId = card.instanceId;
    } else {
      this.selectedBoardCardId = null;
      this.selectedBoardCardIndex = null;
      this.boardCardSelectionTweenId = null;
    }

    this.renderState(this.engine.getState());
    this.boardCardSelectionTweenId = null;
  }

  handlePlayerHandCardClick(card) {
    if (
      !card ||
      this.isCardPlayAnimating ||
      this.isCardDrawAnimating ||
      this.isTurnTransitionAnimating ||
      this.isGamePaused
    ) {
      return;
    }

    this.selectedBoardCardId = null;
    this.selectedBoardCardIndex = null;
    this.inspectedBoardCardId = null;
    this.inspectedBoardOwnerId = null;

    if (this.selectedPlayerCardId === card.instanceId) {
      this.selectedPlayerCardId = null;
      this.renderState(this.engine.getState());
      return;
    }

    this.selectedPlayerCardId = card.instanceId;
    this.renderState(this.engine.getState());
  }

  renderState(state) {
    this.clearHandCardHover();
    this.clearAttackDrag();
    this.clearHandCardDrag();
    this.boardCardContainers.clear();
    if (!this.optionsMenuOpen && this.optionsOverlayRoot?.active) {
      this.optionsOverlayRoot.destroy(true);
    }
    if (!this.optionsOverlayRoot?.active) {
      this.optionsOverlayRoot = null;
    }
    this.renderRoot.removeAll(true);
    this.renderRoot.add(this.drawBoardBackground());

    if (!state?.players) {
      return;
    }

    const player = state.players[PLAYER_INDEX];
    const enemy = state.players[ENEMY_INDEX];
    const isPlayerActive = state.activePlayerIndex === PLAYER_INDEX;
    this.syncTurnTimer(state);

    if (state.phase === "mulligan") {
      this.clearNpcTurnTimers();
      this.clearNpcChoicePreview();
      this.drawDeckPile(enemy, ENEMY_DECK_PILE_X, ENEMY_DECK_PILE_Y);
      this.drawDiscardPile(
        enemy,
        ENEMY_DECK_PILE_X + DISCARD_PILE_OFFSET_X,
        ENEMY_DECK_PILE_Y,
      );
      const playerDeckPosition = this.getPlayerDeckPosition();
      this.drawDeckPile(player, playerDeckPosition.x, playerDeckPosition.y);
      this.drawDiscardPile(
        player,
        playerDeckPosition.x - DISCARD_PILE_OFFSET_X,
        playerDeckPosition.y,
      );
      this.drawHudPanel(
        player,
        PLAYER_HUD_FRAME_LEFT_MARGIN,
        this.logicalHeight - HUD_FRAME_HEIGHT - PLAYER_HUD_FRAME_BOTTOM_MARGIN,
      );
      this.drawHudPanel(
        enemy,
        this.logicalWidth - HUD_FRAME_WIDTH - ENEMY_HUD_FRAME_RIGHT_MARGIN,
        ENEMY_HUD_FRAME_TOP_MARGIN,
      );
      this.drawMulliganOverlay(state);
      return;
    }

    if (isPlayerActive) {
      this.clearNpcTurnTimers();
      this.clearNpcChoicePreview();
      this.npcTurnInProgressForTurn = null;
      this.selectedNpcCardId = null;
      this.animatingNpcCardId = null;
    }

    if (
      this.selectedPlayerCardId &&
      !player.hand.some((card) => card.instanceId === this.selectedPlayerCardId)
    ) {
      this.selectedPlayerCardId = null;
    }

    const selectedBoardCard = player.board.find(
      (card) => card.instanceId === this.selectedBoardCardId,
    );

    if (this.selectedBoardCardId && !selectedBoardCard) {
      this.selectedBoardCardId = null;
      this.selectedBoardCardIndex = null;
      this.boardCardSelectionTweenId = null;
    }

    if (this.inspectedBoardCardId && !this.getInspectedBoardCard(state)) {
      this.inspectedBoardCardId = null;
      this.inspectedBoardOwnerId = null;
    }

    this.drawBoardCards(enemy, ENEMY_BOARD_SLOTS);
    this.drawBoardCards(player, ALLY_BOARD_SLOTS);
    const playerDeckPosition = this.getPlayerDeckPosition();

    this.drawDeckPile(enemy, ENEMY_DECK_PILE_X, ENEMY_DECK_PILE_Y);
    this.drawDiscardPile(
      enemy,
      ENEMY_DECK_PILE_X + DISCARD_PILE_OFFSET_X,
      ENEMY_DECK_PILE_Y,
    );
    this.drawDeckPile(player, playerDeckPosition.x, playerDeckPosition.y);
    this.drawDiscardPile(
      player,
      playerDeckPosition.x - DISCARD_PILE_OFFSET_X,
      playerDeckPosition.y,
    );

    const handRenderRoot = this.add.container(0, 0);
    this.renderRoot.add(handRenderRoot);

    renderAllHands(
      this,
      handRenderRoot,
      this.logicalWidth,
      this.logicalHeight,
      player.hand.map((card) =>
        card.instanceId === this.animatingPlayerCardId ||
        card.instanceId === this.animatingPlayerDrawCardId ||
        this.initialDealHiddenCardIds.has(card.instanceId)
          ? { ...card, hidden: true }
          : card,
      ),
      enemy.hand.map((card) =>
        card.instanceId === this.animatingNpcCardId ||
        card.instanceId === this.animatingNpcDrawCardId ||
        card.instanceId === this.npcChoicePreviewCardId ||
        this.initialDealHiddenCardIds.has(card.instanceId)
          ? { ...card, hidden: true }
          : card,
      ),
      {
        selectedPlayerCardId: this.selectedPlayerCardId,
        selectedNpcCardId: this.selectedNpcCardId,
        onPlayerCardClick: (_handIndex, card) => {
          this.handlePlayerHandCardClick(card);
        },
        onPlayerCardPointerDown: (handIndex, card, pointer, visual) => {
          this.prepareHandCardDrag(pointer, handIndex, card, visual);
        },
      },
    );

    this.drawHudPanel(
      player,
      PLAYER_HUD_FRAME_LEFT_MARGIN,
      this.logicalHeight - HUD_FRAME_HEIGHT - PLAYER_HUD_FRAME_BOTTOM_MARGIN,
    );
    this.drawHudPanel(
      enemy,
      this.logicalWidth - HUD_FRAME_WIDTH - ENEMY_HUD_FRAME_RIGHT_MARGIN,
      ENEMY_HUD_FRAME_TOP_MARGIN,
    );
    this.drawTurnBadge(state);
    this.drawBoardInspectPanel(state);
    this.drawEndTurnButton(state);
    this.drawWinnerPresentation(state);

    if (this.isGamePaused && !state.winner) {
      this.drawPauseOverlay(state);
    }

    this.drawOptionsButton();
    this.drawChatButton();
    if (!this.engine.isMultiplayer) {
      this.startNpcTurn(state);
    }
  }
}
