import { buildCardInstance } from "./cards.js";

export const DECK_SIZE = 30;

export const DECK_DEFINITIONS = {
  deck1: {
    id: "deck1",
    avatarKey: "avatar1",
    name: "Legião Escarlate",
    style: "Pressão e dano direto",
    description:
      "Criaturas rápidas, dano direto e recursos para manter a ofensiva.",
    cardIds: [
      "carta1", "carta2", "carta4", "carta5", "carta6",
      "carta7", "carta10", "carta11", "carta13", "carta15",
      "carta16", "carta31", "carta19", "carta21", "carta22",
      "carta23", "carta26", "carta28", "carta30", "carta37",
      "carta38", "carta40", "carta41", "carta42", "carta44",
      "carta45", "carta49", "carta53", "carta57", "carta61",
    ],
  },
  deck2: {
    id: "deck2",
    avatarKey: "avatar2",
    name: "Fortaleza da Cripta",
    style: "Defesa e resistência",
    description:
      "Cura, criaturas resistentes e remoções para controlar o tabuleiro.",
    cardIds: [
      "carta1", "carta2", "carta5", "carta6", "carta7",
      "carta8", "carta10", "carta11", "carta12", "carta9",
      "carta15", "carta16", "carta18", "carta20", "carta22",
      "carta23", "carta24", "carta26", "carta29", "carta32",
      "carta34", "carta38", "carta39", "carta41", "carta43",
      "carta46", "carta50", "carta54", "carta58", "carta62",
    ],
  },
  deck3: {
    id: "deck3",
    avatarKey: "avatar3",
    name: "Conclave Arcano",
    style: "Mana e magias",
    description:
      "Acelera a mana e combina magias para ganhar valor ao longo da partida.",
    cardIds: [
      "carta2", "carta4", "carta5", "carta6", "carta10",
      "carta11", "carta12", "carta13", "carta14", "carta15",
      "carta16", "carta17", "carta18", "carta19", "carta21",
      "carta36", "carta24", "carta25", "carta27", "carta30",
      "carta33", "carta35", "carta37", "carta39", "carta42",
      "carta47", "carta51", "carta55", "carta59", "carta63",
    ],
  },
  deck4: {
    id: "deck4",
    avatarKey: "avatar4",
    name: "Pacto Carmesim",
    style: "Equilíbrio e adaptação",
    description:
      "Mistura criaturas, cura e dano para responder a diferentes confrontos.",
    cardIds: [
      "carta1", "carta3", "carta4", "carta5", "carta6",
      "carta7", "carta10", "carta11", "carta12", "carta13",
      "carta16", "carta18", "carta20", "carta21", "carta22",
      "carta23", "carta24", "carta25", "carta26", "carta28",
      "carta34", "carta38", "carta40", "carta41", "carta42",
      "carta48", "carta52", "carta56", "carta60", "carta64",
    ],
  },
};

const AVATAR_DECK_IDS = Object.fromEntries(
  Object.values(DECK_DEFINITIONS).map((deck) => [deck.avatarKey, deck.id]),
);

function shuffle(list, rng = Math.random) {
  const clone = [...list];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1));
    const temp = clone[index];
    clone[index] = clone[randomIndex];
    clone[randomIndex] = temp;
  }

  return clone;
}

export function getDeckIdForAvatar(avatarKey = "avatar1") {
  return AVATAR_DECK_IDS[avatarKey] ?? "deck1";
}

export function getDeckDefinition(deckId = "deck1") {
  return DECK_DEFINITIONS[deckId] ?? DECK_DEFINITIONS.deck1;
}

export function getDeckDefinitionForAvatar(avatarKey = "avatar1") {
  return getDeckDefinition(getDeckIdForAvatar(avatarKey));
}

export function createStarterDeck(ownerId, deckId = "deck1", rng = Math.random) {
  const definition = getDeckDefinition(deckId);
  const cards = definition.cardIds.map((cardId, index) =>
    buildCardInstance(cardId, `${ownerId}_${definition.id}_${cardId}_${index}`),
  );

  return shuffle(cards, rng);
}
