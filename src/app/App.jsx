import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { TcgEngine } from "../game/application/engines/TcgEngine";
import { MultiplayerEngine } from "../game/infrastructure/multiplayer/MultiplayerEngine";
import { MultiplayerClient } from "../game/infrastructure/multiplayer/MultiplayerClient";
import { gameAudio, SOUND_KEYS } from "../game/infrastructure/audio/gameAudio";
import { connectAudioEvents } from "../game/infrastructure/audio/connectAudioEvents";
import { DeckSelection } from "../presentation/components/DeckSelection";
import { MultiplayerChat } from "../presentation/components/MultiplayerChat";
import { MultiplayerLobby } from "../presentation/components/MultiplayerLobby";
import { PlayerProfile } from "../presentation/components/PlayerProfile";
import {
  getDeckDefinition,
  getDeckDefinitionForAvatar,
  getDeckIdForAvatar,
} from "../game/domain/entities/decks";
import {
  isDeckUnlocked,
  isDifficultyUnlocked,
  createProgressService,
} from "../game/application/progress/ProgressService";
import { localStorageProgressRepository } from "../game/infrastructure/storage/localStorageProgressRepository";
import { createPlayerIdentityService } from "../game/application/profile/PlayerIdentityService";
import { localStoragePlayerIdentityRepository } from "../game/infrastructure/storage/localStoragePlayerIdentityRepository";
import { PLAYER_NAME_MAX_LENGTH } from "../game/domain/entities/playerIdentity";
import "../presentation/styles/App.css";

const AVATARS = [
  { key: "avatar1", src: "/arts/avatares/avatar1.png", label: "Avatar 1" },
  { key: "avatar2", src: "/arts/avatares/avatar2.png", label: "Avatar 2" },
  { key: "avatar3", src: "/arts/avatares/avatar3.png", label: "Avatar 3" },
  { key: "avatar4", src: "/arts/avatares/avatar4.png", label: "Avatar 4" },
];
const progressService = createProgressService(localStorageProgressRepository);
const playerIdentityService = createPlayerIdentityService(
  localStoragePlayerIdentityRepository,
);
const INITIAL_PLAYER_IDENTITY = playerIdentityService.load();
const createMultiplayerClient = () => new MultiplayerClient();
const AI_DIFFICULTIES = [
  { id: "easy", label: "Fácil", detail: "Decente e mais tranquila" },
  { id: "medium", label: "Médio", detail: "Decisões equilibradas" },
  { id: "hard", label: "Difícil", detail: "Antecipa respostas e busca letal" },
];
const UI_ART = {
  logo: {
    src: "/arts/ui/nome_jogo.png",
    bounds: [241, 272, 1460, 550],
  },
  play: {
    src: "/arts/ui/buttons/4.png",
    bounds: [764, 492, 391, 100],
  },
  options: {
    src: "/arts/ui/buttons/5.png",
    bounds: [767, 481, 386, 101],
  },
  deck: {
    src: "/arts/ui/buttons/buttonDeck.png",
    bounds: [750, 482, 429, 111],
  },
  profile: {
    src: "/arts/ui/buttons/buttonPerfil.png",
    bounds: [675, 457, 576, 151],
  },
  singleplayer: {
    src: "/arts/ui/buttons/2.png",
    bounds: [767, 493, 391, 98],
  },
  multiplayer: {
    src: "/arts/ui/buttons/3.png",
    bounds: [754, 485, 396, 99],
  },
};
const GAME_ASSET_URLS = [
  "/arts/ui/arena_1.png",
  "/arts/ui/moldura.png",
  "/arts/ui/card_back.png",
  "/arts/ui/vida.png",
  "/arts/ui/mana.png",
  "/arts/ui/infos_turno.png",
  "/arts/ui/menu_de_opcoes.png",
  "/arts/ui/nome_jogo.png",
  "/arts/ui/buttons/botaoOpcoes.png",
  "/arts/ui/buttons/chatIcon.png",
  "/arts/ui/buttons/buttonDeck.png",
  "/arts/ui/buttons/buttonPerfil.png",
  "/arts/ui/passarTurnoButton.png",
  ...Array.from({ length: 11 }, (_item, index) =>
    `/arts/ui/buttons/${index + 2}.png`,
  ),
  ...AVATARS.map((avatar) => avatar.src),
  ...Array.from(
    { length: 64 },
    (_item, index) => `/arts/cartas/${index + 1}.png`,
  ),
];

function CroppedArt({ art, className = "", alt = "" }) {
  const [x, y, width, height] = art.bounds;
  const style = {
    aspectRatio: `${width} / ${height}`,
    "--art-image-width": `${(1920 / width) * 100}%`,
    "--art-image-left": `${(-x / width) * 100}%`,
    "--art-image-top": `${(-y / height) * 100}%`,
  };

  return (
    <span className={`cropped-art ${className}`.trim()} style={style}>
      <img src={art.src} alt={alt} draggable="false" />
    </span>
  );
}

CroppedArt.propTypes = {
  art: PropTypes.shape({
    src: PropTypes.string.isRequired,
    bounds: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  className: PropTypes.string,
  alt: PropTypes.string,
};

function ArtButton({ art, label, className = "", ...buttonProps }) {
  return (
    <button
      {...buttonProps}
      className={`art-button ${className}`.trim()}
      aria-label={label}
    >
      <CroppedArt art={art} />
    </button>
  );
}

ArtButton.propTypes = {
  art: CroppedArt.propTypes.art,
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
};

function AudioSettingsPanel({ settings, onVolumeChange, onToggleMuted, onBack }) {
  const volumePercent = Math.round(settings.volume * 100);

  return (
    <section className="audio-settings-menu" aria-label="Opções de áudio">
      <div className="audio-settings-menu__header">
        <span>Configurações</span>
        <h2>Áudio</h2>
        <p>Ajuste o volume geral da arena.</p>
      </div>
      <div className="audio-control-card">
        <div className="audio-control-card__value">
          <strong>Volume geral</strong>
          <span>{settings.muted ? "Mudo" : `${volumePercent}%`}</span>
        </div>
        <input
          aria-label="Volume geral"
          type="range"
          min="0"
          max="100"
          value={volumePercent}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
        />
        <button
          className="audio-mute-button"
          type="button"
          aria-pressed={settings.muted}
          onClick={onToggleMuted}
        >
          {settings.muted ? "Ativar áudio" : "Silenciar áudio"}
        </button>
      </div>
      <button className="menu-button menu-button--secondary" type="button" onClick={onBack}>
        Voltar
      </button>
    </section>
  );
}

AudioSettingsPanel.propTypes = {
  settings: PropTypes.shape({
    volume: PropTypes.number.isRequired,
    muted: PropTypes.bool.isRequired,
  }).isRequired,
  onVolumeChange: PropTypes.func.isRequired,
  onToggleMuted: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

function App() {
  const phaserContainerRef = useRef(null);
  const phaserGameRef = useRef(null);
  const preloadedGameImagesRef = useRef([]);
  const chatOpenRef = useRef(false);
  const seenChatMessageIdsRef = useRef(new Set());
  const [screen, setScreen] = useState(() =>
    INITIAL_PLAYER_IDENTITY.name ? "home" : "identity",
  );
  const [playerName, setPlayerName] = useState(INITIAL_PLAYER_IDENTITY.name);
  const [selectedAvatarKey, setSelectedAvatarKey] = useState(AVATARS[0].key);
  const [enemyDifficulty, setEnemyDifficulty] = useState("easy");
  const [gameConfig, setGameConfig] = useState(null);
  const [audioSettings, setAudioSettings] = useState(gameAudio.getSettings());
  const [deckReturnScreen, setDeckReturnScreen] = useState("home");
  const [activeEngine, setActiveEngine] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [playerProgress, setPlayerProgress] = useState(progressService.load);
  const [startError, setStartError] = useState("");

  const selectedDeck = getDeckDefinitionForAvatar(selectedAvatarKey);
  const selectedDeckUnlocked = isDeckUnlocked(
    playerProgress,
    selectedDeck.id,
  );

  const returnToHome = useCallback(() => {
    setStartError("");
    setScreen("home");
  }, []);

  const savePlayerIdentity = useCallback(() => {
    const identity = playerIdentityService.saveName(playerName);
    if (!identity.name) return;
    setPlayerName(identity.name);
    setScreen("home");
  }, [playerName]);

  const updatePlayerName = useCallback((nextName) => {
    const identity = playerIdentityService.saveName(nextName);
    if (!identity.name) return null;
    setPlayerName(identity.name);
    return identity.name;
  }, []);

  const handleSelectAvatar = useCallback(
    (avatarKey) => {
      const deckId = getDeckIdForAvatar(avatarKey);
      const firstUnlockedDifficulty = AI_DIFFICULTIES.find((difficulty) =>
        isDifficultyUnlocked(playerProgress, deckId, difficulty.id),
      );
      setSelectedAvatarKey(avatarKey);
      setEnemyDifficulty(firstUnlockedDifficulty?.id ?? "easy");
      setStartError("");
    },
    [playerProgress],
  );

  const handleGameResult = useCallback(
    ({ won, deckId, difficulty }) => {
      const outcome = won
        ? progressService.registerVictory(deckId, difficulty)
        : progressService.registerDefeat(deckId, difficulty);
      setPlayerProgress(outcome.progress);
      return {
        ...outcome.result,
        deckName: getDeckDefinition(deckId).name,
        difficultyLabel:
          AI_DIFFICULTIES.find((item) => item.id === difficulty)?.label ??
          difficulty,
      };
    },
    [],
  );

  const preloadGameAssets = () => {
    if (preloadedGameImagesRef.current.length > 0) {
      return;
    }

    preloadedGameImagesRef.current = GAME_ASSET_URLS.map((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      return image;
    });
  };

  const getRandomEnemyAvatarKey = () => {
    const availableAvatars = AVATARS.filter(
      (avatar) => avatar.key !== selectedAvatarKey,
    );
    const randomIndex = Math.floor(Math.random() * availableAvatars.length);
    return availableAvatars[randomIndex]?.key ?? "avatar2";
  };

  const handleMultiplayerGameStart = useCallback((client, startPayload) => {
    setGameConfig({
      mode: "multiplayer",
      client,
      startPayload,
    });
  }, []);

  useEffect(() => {
    gameAudio.preload();
    return gameAudio.subscribe(setAudioSettings);
  }, []);

  useEffect(() => {
    const closeChat = () => setChatOpen(false);
    window.addEventListener("blood-arena:options-open", closeChat);
    return () =>
      window.removeEventListener("blood-arena:options-open", closeChat);
  }, []);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnreadChatCount(0);
  }, [chatOpen]);

  useEffect(() => {
    setUnreadChatCount(0);
    seenChatMessageIdsRef.current = new Set();
    if (!activeEngine?.isMultiplayer) return undefined;

    let initialized = false;
    return activeEngine.subscribeChat((messages) => {
      const unseenMessages = messages.filter(
        (message) => !seenChatMessageIdsRef.current.has(message.id),
      );
      messages.forEach((message) =>
        seenChatMessageIdsRef.current.add(message.id),
      );

      if (!initialized) {
        initialized = true;
        return;
      }

      const opponentMessages = unseenMessages.filter(
        (message) => message.slot !== activeEngine.localSlot,
      );
      if (!chatOpenRef.current && opponentMessages.length > 0) {
        setUnreadChatCount((count) =>
          Math.min(99, count + opponentMessages.length),
        );
      }
    });
  }, [activeEngine]);

  useEffect(() => {
    const scene = phaserGameRef.current?.scene?.getScene("tcg-scene");
    scene?.setChatUnreadCount?.(unreadChatCount);
  }, [unreadChatCount]);

  useEffect(() => {
    if (!gameConfig || !phaserContainerRef.current || phaserGameRef.current) {
      return;
    }

    const engine =
      gameConfig.mode === "multiplayer"
        ? new MultiplayerEngine(gameConfig.client, gameConfig.startPayload)
        : new TcgEngine(gameConfig);
    const disconnectAudioEvents = connectAudioEvents(engine.events);
    let disposed = false;
    setActiveEngine(engine);

    import("../game/infrastructure/phaser/createPhaserGame")
      .then(({ createPhaserGame }) => {
        if (disposed || !phaserContainerRef.current) return;

        phaserGameRef.current = createPhaserGame(
          phaserContainerRef.current,
          engine,
          {
            onExitToMenu: () => {
              setChatOpen(false);
              if (engine.isMultiplayer) {
                engine.leaveRoom();
                engine.client.disconnect();
              }
              returnToHome();
              setGameConfig(null);
            },
            onToggleChat: () => setChatOpen((open) => !open),
            onGameResult: handleGameResult,
          },
        );
      })
      .catch((error) => {
        console.error("Nao foi possivel carregar a arena do jogo.", error);
        if (disposed) return;

        if (engine.isMultiplayer) {
          engine.leaveRoom();
          engine.client.disconnect();
          returnToHome();
        } else {
          setScreen("avatar");
          setStartError("Nao foi possivel carregar a arena. Tente novamente.");
        }
        setGameConfig(null);
      });

    return () => {
      disposed = true;
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      disconnectAudioEvents();
      engine.destroy?.();
      setActiveEngine(null);
      setChatOpen(false);
    };
  }, [gameConfig, handleGameResult, returnToHome]);

  return (
    <>
      {gameConfig ? (
        <div className="game-shell">
          <div ref={phaserContainerRef} className="phaser-fullscreen" />
          {activeEngine?.isMultiplayer && chatOpen && (
            <MultiplayerChat
              engine={activeEngine}
              onClose={() => {
                gameAudio.play(SOUND_KEYS.uiButton);
                setChatOpen(false);
              }}
            />
          )}
        </div>
      ) : (
        <main
          className="start-screen"
          onClickCapture={(event) => {
            const button = event.target.closest("button");
            if (button && !button.disabled) {
              gameAudio.play(SOUND_KEYS.uiButton);
            }
          }}
        >
          <div className="start-screen__shade" />

          {screen === "identity" ? (
            <section
              className="avatar-select player-identity-setup"
              aria-label="Criar perfil do jogador"
            >
              <div className="avatar-select__header">Crie seu perfil</div>
              <p>
                Esse nome será usado no perfil e em todas as partidas neste
                navegador.
              </p>
              <label className="player-name-field">
                <span>Nome do jogador</span>
                <input
                  type="text"
                  value={playerName}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  autoFocus
                  placeholder="Digite seu nome"
                  onChange={(event) => setPlayerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && playerName.trim()) {
                      savePlayerIdentity();
                    }
                  }}
                />
              </label>
              <button
                className="menu-button menu-button--primary"
                type="button"
                disabled={!playerName.trim()}
                onClick={savePlayerIdentity}
              >
                Criar perfil
              </button>
            </section>
          ) : screen === "home" ? (
            <section className="start-menu" aria-label="Menu inicial">
              <h1 className="game-title">
                <CroppedArt art={UI_ART.logo} alt="Blood Arena" />
              </h1>
              <div className="start-menu__actions">
                <ArtButton
                  art={UI_ART.play}
                  label="Jogar"
                  type="button"
                  onClick={() => {
                    preloadGameAssets();
                    setScreen("play");
                  }}
                />
                <ArtButton
                  art={UI_ART.deck}
                  label="Deck"
                  type="button"
                  onClick={() => {
                    setDeckReturnScreen("home");
                    setScreen("deck");
                  }}
                />
                <ArtButton
                  art={UI_ART.profile}
                  label="Perfil"
                  type="button"
                  onClick={() => setScreen("profile")}
                />
                <ArtButton
                  art={UI_ART.options}
                  label="Opções"
                  type="button"
                  onClick={() => setScreen("audio")}
                />
              </div>
            </section>
          ) : screen === "deck" ? (
            <DeckSelection
              avatars={AVATARS}
              selectedAvatarKey={selectedAvatarKey}
              onSelectAvatar={handleSelectAvatar}
              progress={playerProgress}
              onPlay={() => {
                preloadGameAssets();
                setScreen("avatar");
              }}
              onBack={() => setScreen(deckReturnScreen)}
            />
          ) : screen === "profile" ? (
            <PlayerProfile
              progress={playerProgress}
              playerName={playerName}
              avatar={
                AVATARS.find((avatar) => avatar.key === selectedAvatarKey) ??
                AVATARS[0]
              }
              selectedDeck={selectedDeck}
              onPlayerNameChange={updatePlayerName}
              onBack={() => setScreen("home")}
            />
          ) : screen === "play" ? (
            <section className="mode-menu" aria-label="Escolha do modo de jogo">
              <h2>Escolha o modo</h2>
              <div className="start-menu__actions">
                <ArtButton
                  art={UI_ART.singleplayer}
                  label="Um jogador"
                  type="button"
                  onClick={() => {
                    preloadGameAssets();
                    setScreen("avatar");
                  }}
                />
                <ArtButton
                  art={UI_ART.multiplayer}
                  label="Multijogador"
                  type="button"
                  onClick={() => {
                    preloadGameAssets();
                    setScreen("multiplayer");
                  }}
                />
              </div>
              <button
                className="menu-button menu-button--secondary"
                type="button"
                onClick={returnToHome}
              >
                Voltar
              </button>
            </section>
          ) : screen === "audio" ? (
            <AudioSettingsPanel
              settings={audioSettings}
              onVolumeChange={(value) => {
                gameAudio.setVolume(value);
                if (value > 0 && audioSettings.muted) gameAudio.setMuted(false);
              }}
              onToggleMuted={() => {
                const willUnmute = audioSettings.muted;
                gameAudio.toggleMuted();
                if (willUnmute) gameAudio.play(SOUND_KEYS.uiButton);
              }}
              onBack={() => {
                returnToHome();
              }}
            />
          ) : screen === "avatar" ? (
            <section className="avatar-select" aria-label="Escolha de avatar">
              <div className="avatar-select__header">
                <span>Prepare seu jogador</span>
              </div>

              <div className="player-name-field">
                <span>Jogador</span>
                <strong className="player-name-display">{playerName}</strong>
              </div>

              <div className="selected-loadout">
                <img
                  src={
                    AVATARS.find((avatar) => avatar.key === selectedAvatarKey)
                      ?.src
                  }
                  alt="Avatar selecionado"
                />
                <div>
                  <span>Baralho selecionado</span>
                  <strong>
                    {getDeckDefinitionForAvatar(selectedAvatarKey).name}
                  </strong>
                  <small>
                    {getDeckDefinitionForAvatar(selectedAvatarKey).style}
                  </small>
                  <b
                    className={
                      selectedDeckUnlocked
                        ? "selected-loadout__status selected-loadout__status--unlocked"
                        : "selected-loadout__status selected-loadout__status--locked"
                    }
                  >
                    {selectedDeckUnlocked ? "Liberado" : "Bloqueado"}
                  </b>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeckReturnScreen("avatar");
                    setScreen("deck");
                  }}
                >
                  Alterar
                </button>
              </div>

              <fieldset className="difficulty-select">
                <legend>Dificuldade da IA</legend>
                <div className="difficulty-select__options">
                  {AI_DIFFICULTIES.map((difficulty) => (
                    <button
                      className={`${
                        difficulty.id === enemyDifficulty
                          ? "difficulty-option difficulty-option--selected"
                          : "difficulty-option"
                      }${
                        isDifficultyUnlocked(
                          playerProgress,
                          selectedDeck.id,
                          difficulty.id,
                        )
                          ? ""
                          : " difficulty-option--locked"
                      }`}
                      type="button"
                      key={difficulty.id}
                      onClick={() => {
                        if (
                          !isDifficultyUnlocked(
                            playerProgress,
                            selectedDeck.id,
                            difficulty.id,
                          )
                        ) {
                          setStartError(
                            "Vença a dificuldade anterior para liberar esta.",
                          );
                          return;
                        }
                        setStartError("");
                        setEnemyDifficulty(difficulty.id);
                      }}
                      aria-pressed={difficulty.id === enemyDifficulty}
                      aria-disabled={
                        !isDifficultyUnlocked(
                          playerProgress,
                          selectedDeck.id,
                          difficulty.id,
                        )
                      }
                    >
                      <strong>{difficulty.label}</strong>
                      <span>
                        {isDifficultyUnlocked(
                          playerProgress,
                          selectedDeck.id,
                          difficulty.id,
                        )
                          ? difficulty.detail
                          : "Bloqueada"}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {startError && (
                <p className="avatar-select__error" role="alert">
                  {startError}
                </p>
              )}

              <div className="avatar-select__actions">
                <button
                  className="menu-button menu-button--secondary"
                  type="button"
                  onClick={returnToHome}
                >
                  Voltar
                </button>
                <button
                  className="menu-button menu-button--primary"
                  type="button"
                  disabled={!playerName.trim()}
                  onClick={() => {
                    if (!selectedDeckUnlocked) {
                      setStartError(
                        "Este deck ainda não foi liberado na campanha.",
                      );
                      return;
                    }
                    if (
                      !isDifficultyUnlocked(
                        playerProgress,
                        selectedDeck.id,
                        enemyDifficulty,
                      )
                    ) {
                      setStartError(
                        "Vença a dificuldade anterior para liberar esta.",
                      );
                      return;
                    }
                    const enemyAvatarKey = getRandomEnemyAvatarKey();
                    setGameConfig({
                      playerName: playerName
                        .trim()
                        .slice(0, PLAYER_NAME_MAX_LENGTH),
                      playerAvatarKey: selectedAvatarKey,
                      playerDeckId: getDeckIdForAvatar(selectedAvatarKey),
                      enemyAvatarKey,
                      enemyDeckId: getDeckIdForAvatar(enemyAvatarKey),
                      enemyDifficulty,
                    });
                  }}
                >
                  {selectedDeckUnlocked ? "Iniciar partida" : "Deck bloqueado"}
                </button>
              </div>
            </section>
          ) : (
            <MultiplayerLobby
              avatars={AVATARS}
              playerName={playerName}
              selectedAvatarKey={selectedAvatarKey}
              createClient={createMultiplayerClient}
              progress={playerProgress}
              onBack={returnToHome}
              onGameStart={handleMultiplayerGameStart}
            />
          )}
        </main>
      )}
    </>
  );
}

export default App;
