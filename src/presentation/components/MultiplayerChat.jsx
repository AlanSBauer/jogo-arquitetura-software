import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

export function MultiplayerChat({ engine, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const messagesRef = useRef(null);

  useEffect(() => engine.subscribeChat(setMessages), [engine]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (engine.sendChat(text)) {
      setDraft("");
    }
  };

  return (
    <aside className="multiplayer-chat" aria-label="Chat da partida">
      <header>
        <div>
          <span>Multijogador</span>
          <strong>Chat da partida</strong>
        </div>
        <button type="button" aria-label="Fechar chat" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="multiplayer-chat__messages" ref={messagesRef}>
        {messages.length === 0 ? (
          <p className="multiplayer-chat__empty">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={
                message.slot === engine.localSlot
                  ? "multiplayer-chat__message multiplayer-chat__message--own"
                  : "multiplayer-chat__message"
              }
            >
              <strong>{message.name}</strong>
              <p>{message.text}</p>
            </article>
          ))
        )}
      </div>

      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={draft}
          maxLength={180}
          placeholder="Digite sua mensagem..."
          aria-label="Mensagem"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={!draft.trim()}>
          Enviar
        </button>
      </form>
    </aside>
  );
}

MultiplayerChat.propTypes = {
  engine: PropTypes.shape({
    localSlot: PropTypes.number.isRequired,
    subscribeChat: PropTypes.func.isRequired,
    sendChat: PropTypes.func.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
