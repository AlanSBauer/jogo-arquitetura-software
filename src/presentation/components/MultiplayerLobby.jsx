import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getDeckDefinitionForAvatar } from "../../game/domain/entities/decks";
import { isDeckUnlocked } from "../../game/application/progress/ProgressService";

export function MultiplayerLobby({
  avatars,
  playerName,
  selectedAvatarKey,
  createClient,
  progress,
  onBack,
  onGameStart,
}) {
  const clientRef = useRef(null);
  const handedOffRef = useRef(false);
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [joinPasswords, setJoinPasswords] = useState({});
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = createClient();
    clientRef.current = client;
    const unsubscribers = [
      client.on("connection:ready", ({ rooms: nextRooms }) => {
        setRooms(nextRooms ?? []);
        setStatus("lobby");
      }),
      client.on("room:list", ({ rooms: nextRooms }) => setRooms(nextRooms ?? [])),
      client.on("room:joined", ({ room }) => {
        setCurrentRoom(room);
        setStatus("waiting");
        setError("");
      }),
      client.on("game:started", (payload) => {
        handedOffRef.current = true;
        onGameStart(client, payload);
      }),
      client.on("error", ({ message }) => {
        setError(message || "Erro no modo multijogador.");
        setStatus((currentStatus) =>
          currentStatus === "connecting" ? "offline" : currentStatus,
        );
      }),
      client.on("connection:closed", () => setStatus("offline")),
    ];

    client.connect().catch((connectionError) => {
      setStatus("offline");
      setError(connectionError.message);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      if (!handedOffRef.current) client.disconnect();
    };
  }, [createClient, onGameStart]);

  const profileReady = Boolean(playerName.trim());
  const selectedAvatar =
    avatars.find((avatar) => avatar.key === selectedAvatarKey) ?? avatars[0];
  const selectedDeck = getDeckDefinitionForAvatar(selectedAvatarKey);
  const selectedDeckUnlocked = isDeckUnlocked(progress, selectedDeck.id);

  const createRoom = (event) => {
    event.preventDefault();
    if (!selectedDeckUnlocked) {
      setError("Este deck ainda não foi liberado na campanha.");
      return;
    }
    if (!profileReady || !roomName.trim()) return;
    setError("");
    clientRef.current?.createRoom({
      roomName: roomName.trim(),
      password,
      playerName: playerName.trim(),
      avatarKey: selectedAvatarKey,
    });
  };

  const joinRoom = (room) => {
    if (!selectedDeckUnlocked) {
      setError("Este deck ainda não foi liberado na campanha.");
      return;
    }
    if (!profileReady) {
      setError("Informe seu nome antes de entrar em uma sala.");
      return;
    }
    setError("");
    clientRef.current?.joinRoom({
      roomId: room.id,
      password: joinPasswords[room.id] ?? "",
      playerName: playerName.trim(),
      avatarKey: selectedAvatarKey,
    });
  };

  const leaveLobby = () => {
    clientRef.current?.leaveRoom();
    clientRef.current?.disconnect();
    onBack();
  };

  return (
    <section className="multiplayer-lobby" aria-label="Salas multijogador">
      <header className="multiplayer-lobby__header">
        <div>
          <span>Blood Arena em rede</span>
          <h2>Salas multijogador</h2>
        </div>
        <button type="button" className="lobby-back" onClick={leaveLobby}>
          Voltar
        </button>
      </header>

      {status === "waiting" ? (
        <div className="waiting-room">
          <span className="waiting-room__pulse" />
          <strong>{currentRoom?.name}</strong>
          <p>Aguardando o segundo jogador entrar na sala.</p>
          <button type="button" className="menu-button" onClick={leaveLobby}>
            Cancelar sala
          </button>
        </div>
      ) : (
        <>
          <div className="multiplayer-profile">
            <div className="player-name-field">
              <span>Seu nome</span>
              <strong className="player-name-display">{playerName}</strong>
            </div>
            <div className="multiplayer-selected-deck">
              <img src={selectedAvatar.src} alt={selectedAvatar.label} />
              <div>
                <span>Baralho selecionado</span>
                <strong>{selectedDeck.name}</strong>
                <small>{selectedDeck.style}</small>
                <b
                  className={
                    selectedDeckUnlocked
                      ? "multiplayer-selected-deck__status multiplayer-selected-deck__status--unlocked"
                      : "multiplayer-selected-deck__status multiplayer-selected-deck__status--locked"
                  }
                >
                  {selectedDeckUnlocked ? "Liberado" : "Bloqueado"}
                </b>
              </div>
            </div>
          </div>

          <div className="multiplayer-columns">
            <form className="create-room" onSubmit={createRoom}>
              <h3>Criar sala</h3>
              <label>
                <span>Nome da sala</span>
                <input
                  value={roomName}
                  maxLength={24}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Ex.: Arena Sombria"
                />
              </label>
              <label>
                <span>Senha</span>
                <input
                  value={password}
                  maxLength={24}
                  type="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              <button
                type="submit"
                className="menu-button menu-button--primary"
                disabled={!profileReady || !roomName.trim() || status !== "lobby"}
              >
                Criar e aguardar
              </button>
            </form>

            <div className="room-browser">
              <div className="room-browser__title">
                <h3>Salas abertas</h3>
                <button type="button" onClick={() => clientRef.current?.listRooms()}>
                  Atualizar
                </button>
              </div>
              {status === "connecting" ? (
                <p className="room-browser__empty">Conectando ao servidor...</p>
              ) : rooms.length === 0 ? (
                <p className="room-browser__empty">Nenhuma sala aguardando.</p>
              ) : (
                <div className="room-list">
                  {rooms.map((room) => (
                    <article className="room-item" key={room.id}>
                      <div>
                        <strong>{room.name}</strong>
                        <span>Criada por {room.creatorName}</span>
                      </div>
                      {room.hasPassword && (
                        <input
                          type="password"
                          placeholder="Senha"
                          value={joinPasswords[room.id] ?? ""}
                          onChange={(event) =>
                            setJoinPasswords((current) => ({
                              ...current,
                              [room.id]: event.target.value,
                            }))
                          }
                        />
                      )}
                      <button type="button" onClick={() => joinRoom(room)}>
                        Entrar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {error && <div className="multiplayer-error">{error}</div>}
    </section>
  );
}

MultiplayerLobby.propTypes = {
  avatars: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      src: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  playerName: PropTypes.string.isRequired,
  selectedAvatarKey: PropTypes.string.isRequired,
  createClient: PropTypes.func.isRequired,
  progress: PropTypes.shape({
    campaign: PropTypes.object.isRequired,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  onGameStart: PropTypes.func.isRequired,
};
