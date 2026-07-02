import { useState } from "react";
import PropTypes from "prop-types";
import { CARD_LIBRARY } from "../../game/domain/entities/cards";
import { getDeckDefinitionForAvatar } from "../../game/domain/entities/decks";
import { isDeckUnlocked } from "../../game/application/progress/ProgressService";

function getCardArtUrl(cardId) {
  return `/arts/cartas/${cardId.replace("carta", "")}.png`;
}

export function DeckSelection({
  avatars,
  selectedAvatarKey,
  onSelectAvatar,
  progress,
  onPlay,
  onBack,
}) {
  const [cardsVisible, setCardsVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const selectedAvatar =
    avatars.find((avatar) => avatar.key === selectedAvatarKey) ?? avatars[0];
  const deck = getDeckDefinitionForAvatar(selectedAvatar.key);
  const deckUnlocked = isDeckUnlocked(progress, deck.id);

  return (
    <section className="deck-selection" aria-label="Escolha de baralho">
      <header className="deck-selection__title">
        <span>Arsenal</span>
        <h2>Escolha seu baralho</h2>
        <p>Cada avatar possui um baralho próprio com 30 cartas.</p>
      </header>

      <div className="deck-selection__avatars">
        {avatars.map((avatar) => {
          const avatarDeck = getDeckDefinitionForAvatar(avatar.key);
          const isSelected = avatar.key === selectedAvatar.key;
          const avatarDeckUnlocked = isDeckUnlocked(progress, avatarDeck.id);

          return (
            <button
              type="button"
              key={avatar.key}
              className={
                isSelected
                  ? "deck-avatar deck-avatar--selected"
                  : "deck-avatar"
              }
              aria-pressed={isSelected}
              onClick={() => {
                onSelectAvatar(avatar.key);
                setCardsVisible(false);
                setFeedback("");
              }}
            >
              <img src={avatar.src} alt={avatar.label} />
              <span>
                <strong>{avatarDeck.name}</strong>
                <small>{avatarDeck.style}</small>
                <b
                  className={
                    avatarDeckUnlocked
                      ? "deck-avatar__status deck-avatar__status--unlocked"
                      : "deck-avatar__status deck-avatar__status--locked"
                  }
                >
                  {avatarDeckUnlocked ? "Liberado" : "Bloqueado"}
                </b>
              </span>
            </button>
          );
        })}
      </div>

      <div className="deck-selection__summary">
        <img src={selectedAvatar.src} alt={selectedAvatar.label} />
        <div>
          <span>Baralho selecionado</span>
          <h3>{deck.name}</h3>
          <strong>{deck.style}</strong>
          <p>{deck.description}</p>
        </div>
        <b>{deck.cardIds.length}/30</b>
      </div>

      <div className="deck-selection__actions">
        <button
          className="deck-cards-toggle"
          type="button"
          aria-expanded={cardsVisible}
          onClick={() => setCardsVisible((visible) => !visible)}
        >
          {cardsVisible ? "Ocultar cartas" : "Ver cartas"}
        </button>
        <button
          className={
            deckUnlocked
              ? "deck-play-button"
              : "deck-play-button deck-play-button--locked"
          }
          type="button"
          onClick={() => {
            if (!deckUnlocked) {
              setFeedback("Este deck ainda não foi liberado na campanha.");
              return;
            }
            onPlay();
          }}
        >
          {deckUnlocked ? "Jogar" : "Bloqueado"}
        </button>
      </div>

      {feedback && <p className="deck-selection__feedback">{feedback}</p>}

      {cardsVisible && (
        <div className="deck-card-gallery">
          {deck.cardIds.map((cardId, index) => {
            const card = CARD_LIBRARY[cardId];

            return (
              <figure key={`${cardId}-${index}`}>
                <img
                  src={getCardArtUrl(cardId)}
                  alt={card?.name ?? cardId}
                  draggable="false"
                />
                <figcaption>{card?.name ?? cardId}</figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <button
        className="menu-button menu-button--secondary deck-selection__back"
        type="button"
        onClick={onBack}
      >
        Voltar
      </button>
    </section>
  );
}

DeckSelection.propTypes = {
  avatars: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      src: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  selectedAvatarKey: PropTypes.string.isRequired,
  onSelectAvatar: PropTypes.func.isRequired,
  progress: PropTypes.shape({
    campaign: PropTypes.object.isRequired,
  }).isRequired,
  onPlay: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
