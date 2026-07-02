import { useState } from "react";
import PropTypes from "prop-types";
import { DECK_DEFINITIONS } from "../../game/domain/entities/decks";
import { PLAYER_NAME_MAX_LENGTH } from "../../game/domain/entities/playerIdentity";
import {
  calculateCurrentRank,
  calculateNextRank,
  calculatePointsToNextRank,
  CAMPAIGN_DECK_IDS,
  getMostUsedDeck,
  isDifficultyUnlocked,
} from "../../game/application/progress/ProgressService";

const DIFFICULTIES = [
  { id: "easy", label: "Fácil" },
  { id: "medium", label: "Médio" },
  { id: "hard", label: "Difícil" },
];

const CAMPAIGN_STATUS = {
  completed: { label: "Concluída", symbol: "✓" },
  available: { label: "Disponível", symbol: "•" },
  locked: { label: "Bloqueada", symbol: "×" },
};

function getCampaignStatus(progress, deckId, difficulty) {
  if (progress.campaign[deckId][difficulty]) return "completed";
  return isDifficultyUnlocked(progress, deckId, difficulty)
    ? "available"
    : "locked";
}

function countCompletedChallenges(progress) {
  return CAMPAIGN_DECK_IDS.reduce(
    (total, deckId) =>
      total +
      DIFFICULTIES.filter(
        (difficulty) => progress.campaign[deckId][difficulty.id],
      ).length,
    0,
  );
}

export function PlayerProfile({
  progress,
  playerName,
  avatar,
  selectedDeck,
  onPlayerNameChange,
  onBack,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);
  const currentRank = calculateCurrentRank(progress.points);
  const nextRank = calculateNextRank(progress.points);
  const pointsRemaining = calculatePointsToNextRank(progress.points);
  const favoriteDeckId = getMostUsedDeck(progress);
  const favoriteDeck = favoriteDeckId
    ? DECK_DEFINITIONS[favoriteDeckId]
    : null;
  const completedChallenges = countCompletedChallenges(progress);
  const totalChallenges = CAMPAIGN_DECK_IDS.length * DIFFICULTIES.length;
  const campaignPercent = Math.round(
    (completedChallenges / totalChallenges) * 100,
  );
  const unlockedDecks = CAMPAIGN_DECK_IDS.filter(
    (deckId) => progress.campaign[deckId].unlocked,
  ).length;
  const rankRange = nextRank
    ? nextRank.minPoints - currentRank.minPoints
    : 1;
  const rankProgress = nextRank
    ? Math.min(
        100,
        Math.round(
          ((progress.points - currentRank.minPoints) / rankRange) * 100,
        ),
      )
    : 100;

  const saveName = (event) => {
    event.preventDefault();
    const savedName = onPlayerNameChange(nameDraft);
    if (!savedName) return;
    setNameDraft(savedName);
    setIsEditingName(false);
  };

  return (
    <section className="player-profile" aria-label="Perfil do jogador">
      <header className="player-profile__hero">
        <div className="player-profile__identity">
          <img src={avatar.src} alt={avatar.label} />
          <div>
            <span>Progressão do jogador</span>
            {isEditingName ? (
              <form className="profile-name-editor" onSubmit={saveName}>
                <input
                  type="text"
                  value={nameDraft}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  autoFocus
                  aria-label="Novo nome do jogador"
                  onChange={(event) => setNameDraft(event.target.value)}
                />
                <button type="submit" disabled={!nameDraft.trim()}>
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(playerName);
                    setIsEditingName(false);
                  }}
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="profile-name-row">
                <h2>{playerName}</h2>
                <button
                  type="button"
                  className="profile-name-edit"
                  onClick={() => setIsEditingName(true)}
                >
                  Alterar
                </button>
              </div>
            )}
            <strong>{currentRank.name}</strong>
          </div>
        </div>

        <div className="rank-progress">
          <div className="rank-progress__labels">
            <span>{progress.points} pontos</span>
            <span>{nextRank?.name ?? "Rank máximo"}</span>
          </div>
          <div
            className="rank-progress__track"
            role="progressbar"
            aria-label="Progresso do rank"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={rankProgress}
          >
            <span style={{ width: `${rankProgress}%` }} />
          </div>
          <p>
            {nextRank
              ? `Faltam ${pointsRemaining} pontos para o próximo rank.`
              : "Você alcançou o maior rank disponível."}
          </p>
        </div>
      </header>

      <div className="profile-overview">
        <article className="profile-campaign-summary">
          <div>
            <span>Campanha concluída</span>
            <strong>
              {completedChallenges}/{totalChallenges} desafios
            </strong>
          </div>
          <b>{campaignPercent}%</b>
          <div className="profile-campaign-summary__track">
            <span style={{ width: `${campaignPercent}%` }} />
          </div>
          <small>
            {unlockedDecks}/4 decks liberados para jogar
          </small>
        </article>

        <div className="profile-stat-grid">
          <article><span>Vitórias</span><strong>{progress.wins}</strong></article>
          <article><span>Derrotas</span><strong>{progress.losses}</strong></article>
          <article><span>Sequência atual</span><strong>{progress.currentWinStreak}</strong></article>
          <article><span>Melhor sequência</span><strong>{progress.bestWinStreak}</strong></article>
          <article><span>Deck selecionado</span><strong>{selectedDeck.name}</strong></article>
          <article><span>Deck mais usado</span><strong>{favoriteDeck?.name ?? "Nenhum"}</strong></article>
        </div>
      </div>

      <section className="campaign-progress" aria-label="Progresso da campanha">
        <div className="campaign-progress__title">
          <div>
            <span>Campanha</span>
            <h3>Progresso por deck</h3>
          </div>
          <p>Vença Fácil e Médio para liberar o próximo desafio. A vitória no Difícil libera o deck seguinte.</p>
        </div>

        <div className="campaign-progress__decks">
          {CAMPAIGN_DECK_IDS.map((deckId, deckIndex) => {
            const deck = DECK_DEFINITIONS[deckId];
            const deckUnlocked = progress.campaign[deckId].unlocked;

            return (
              <article
                key={deckId}
                className={
                  deckUnlocked
                    ? "campaign-deck"
                    : "campaign-deck campaign-deck--locked"
                }
              >
                <header>
                  <img
                    src={`/arts/avatares/${deck.avatarKey}.png`}
                    alt=""
                  />
                  <div>
                    <small>Deck {deckIndex + 1}</small>
                    <strong>{deck.name}</strong>
                  </div>
                  <span
                    className={
                      deckUnlocked
                        ? "campaign-deck__status campaign-deck__status--unlocked"
                        : "campaign-deck__status campaign-deck__status--locked"
                    }
                  >
                    {deckUnlocked ? "Liberado" : "Bloqueado"}
                  </span>
                </header>

                <div className="campaign-deck__steps">
                  {DIFFICULTIES.map((difficulty) => {
                    const status = getCampaignStatus(
                      progress,
                      deckId,
                      difficulty.id,
                    );
                    const statusInfo = CAMPAIGN_STATUS[status];

                    return (
                      <div
                        className={`campaign-step campaign-step--${status}`}
                        key={difficulty.id}
                      >
                        <b aria-hidden="true">{statusInfo.symbol}</b>
                        <span>
                          <strong>{difficulty.label}</strong>
                          <small>{statusInfo.label}</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <button
        className="menu-button menu-button--secondary player-profile__back"
        type="button"
        onClick={onBack}
      >
        Voltar
      </button>
    </section>
  );
}

PlayerProfile.propTypes = {
  playerName: PropTypes.string.isRequired,
  progress: PropTypes.shape({
    wins: PropTypes.number.isRequired,
    losses: PropTypes.number.isRequired,
    points: PropTypes.number.isRequired,
    currentWinStreak: PropTypes.number.isRequired,
    bestWinStreak: PropTypes.number.isRequired,
    deckUsage: PropTypes.objectOf(PropTypes.number).isRequired,
    campaign: PropTypes.objectOf(
      PropTypes.shape({
        unlocked: PropTypes.bool.isRequired,
        easy: PropTypes.bool.isRequired,
        medium: PropTypes.bool.isRequired,
        hard: PropTypes.bool.isRequired,
      }),
    ).isRequired,
  }).isRequired,
  avatar: PropTypes.shape({
    src: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  selectedDeck: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  onPlayerNameChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
