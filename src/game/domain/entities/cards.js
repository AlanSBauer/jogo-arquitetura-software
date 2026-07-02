function creature(name, manaCost, attack, baseHealth, text = "", effects = {}) {
  return {
    name,
    type: "creature",
    manaCost,
    attack,
    baseHealth,
    text,
    ...effects,
  };
}

function spell(name, manaCost, text, effects) {
  return {
    name,
    type: "spell",
    manaCost,
    text,
    ...effects,
  };
}

const GENERATED_DECK_CARD_DATA = [
  creature(
    "Aprendiz da Chama",
    1,
    1,
    2,
    "Ao entrar em campo, cura 1 de Vida ao seu Heroi.",
    { onPlayHeal: 1 },
  ),
  spell("Faisca Cruel", 1, "Cause 2 de dano ao heroi inimigo.", {
    damage: 2,
    damageEffect: "arcane",
  }),
  spell("Oferta de Sangue", 1, "Recupere 1 de Vida do seu heroi.", {
    onPlayHeal: 1,
  }),
  spell("Gota de Eter", 1, "Restaura 3 de Mana.", { onPlayMana: 3 }),
  creature(
    "Escudeiro da Nevoa",
    2,
    2,
    3,
    "Ao entrar em campo, cura 2 de Vida ao seu Heroi.",
    { onPlayHeal: 2 },
  ),
  creature(
    "Servo Cristalino",
    2,
    3,
    2,
    "Ao entrar em campo, restaura 1 de Mana.",
    { onPlayMana: 1 },
  ),
  spell("Arremesso Sombrio", 2, "Cause 3 de dano ao seu oponente.", {
    damage: 3,
    damageEffect: "shadow",
  }),
  spell("Bencao Invertida", 2, "Recupere 3 de Vida do seu heroi.", {
    onPlayHeal: 3,
  }),
  spell("Toque de Vitalidade", 4, "Recupere 4 de Vida do seu heroi.", {
    onPlayHeal: 4,
  }),
  creature(
    "Acolito do Poco Azul",
    3,
    3,
    4,
    "Ao entrar em campo, restaura 2 de Mana.",
    { onPlayMana: 2 },
  ),
  creature(
    "Soldado da Piedade Torta",
    3,
    4,
    3,
    "Ao entrar em campo, cura 3 de Vida do seu heroi.",
    { onPlayHeal: 3 },
  ),
  creature(
    "Sorvedor de Essencia",
    3,
    3,
    3,
    "Ao entrar em campo, restaura 3 de Mana.",
    { onPlayMana: 3 },
  ),
  spell("Explosao de Cinzas", 3, "Cause 4 de dano ao heroi inimigo.", {
    damage: 4,
    damageEffect: "ash",
  }),
  spell("Ritual de Reabastecimento", 3, "Restaura 5 de Mana.", {
    onPlayMana: 5,
  }),
  creature(
    "Guardiao da Fonte Vazia",
    4,
    4,
    5,
    "Ao entrar em campo, restaura 2 de Mana.",
    { onPlayMana: 2 },
  ),
  creature(
    "Vampiro de Caridade",
    4,
    5,
    4,
    "Ao entrar em campo, cura 4 de Vida ao seu heroi.",
    { onPlayHeal: 4 },
  ),
  creature(
    "Mistico do Veu Partido",
    4,
    3,
    6,
    "Ao entrar em campo, restaura 3 de Mana.",
    { onPlayMana: 3 },
  ),
  spell(
    "Fonte Proibida",
    4,
    "Restaura 4 de Mana e recupere 3 de Vida do seu heroi.",
    { onPlayMana: 4, onPlayHeal: 3 },
  ),
  creature(
    "Vigia das Runas",
    5,
    6,
    4,
    "Ao entrar em campo, restaura 3 de Mana.",
    { onPlayMana: 3 },
  ),
  creature(
    "Beemoto do Nucleo Vermelho",
    5,
    4,
    7,
    "Ao entrar em campo, restaura 4 de Mana.",
    { onPlayMana: 4 },
  ),
  spell("Tempestade de Brasas", 5, "Cause 6 de dano ao heroi inimigo.", {
    damage: 6,
    damageEffect: "fire",
  }),
  spell("Milagre Corrompido", 5, "Recupere 6 de Vida do seu heroi.", {
    onPlayHeal: 6,
  }),
  creature(
    "Colosso da Reserva Arcana",
    6,
    6,
    8,
    "Ao entrar em campo, restaura 4 de Mana.",
    { onPlayMana: 4 },
  ),
  creature(
    "Arauto da Compaixao Sombria",
    6,
    4,
    5,
    "Ao entrar em campo, cura 7 de Vida do seu heroi.",
    { onPlayHeal: 7 },
  ),
  creature(
    "Devorador de Fontes",
    6,
    5,
    8,
    "Ao entrar em campo, restaura 5 de Mana.",
    { onPlayMana: 5 },
  ),
  spell("Impacto Vulcanico", 6, "Cause 7 de dano ao heroi inimigo.", {
    damage: 7,
    damageEffect: "volcanic",
  }),
  spell("Convergencia Arcana", 6, "Restaura 5 de Mana e compre 1 carta.", {
    onPlayMana: 5,
    onPlayDraw: 1,
  }),
  creature(
    "Tita da Misericordia Rancorosa",
    7,
    7,
    8,
    "Ao entrar em campo, cura 7 de Vida e descarta 1 carta da sua mao.",
    { onPlayHeal: 7, onPlayDiscard: 1 },
  ),
  creature(
    "Arquiduida do Fluxo",
    7,
    6,
    9,
    "Ao entrar em campo, restaura 5 de Mana.",
    { onPlayMana: 5 },
  ),
  creature(
    "Executor do Veu Astral",
    7,
    8,
    7,
    "Ao entrar em campo, restaura 4 de Mana e compre 1 carta.",
    { onPlayMana: 4, onPlayDraw: 1 },
  ),
  spell("Cataclismo Rubro", 7, "Cause 8 de dano ao heroi inimigo.", {
    damage: 8,
    damageEffect: "bloodfire",
  }),
  spell("Oferta aos Ceus", 7, "Recupere 8 de Vida e compre 1 carta.", {
    onPlayHeal: 8,
    onPlayDraw: 1,
  }),
  creature(
    "Leviata da Fonte Antiga",
    8,
    8,
    9,
    "Ao entrar em campo, restaura 5 de Mana.",
    { onPlayMana: 5 },
  ),
  creature("Senhor da Clemencia Macabra", 8, 9, 8),
  spell("Chuva de Meteoros", 8, "Cause 9 de dano ao heroi inimigo.", {
    damage: 9,
    damageEffect: "meteor",
  }),
  creature(
    "Deus do Fluxo Final",
    10,
    10,
    12,
    "Ao entrar em campo, restaura 8 de Mana.",
    { onPlayMana: 8 },
  ),
  creature("Servo da Cripta", 1, 2, 1),
  creature("Morcego Escarlate", 1, 1, 3),
  creature("Acolito Noturno", 1, 2, 2),
  creature("Filhote Vampirico", 1, 3, 1),
  creature("Vampiro Aristocrata", 2, 3, 2),
  creature("Guerreiro Carmesim", 2, 2, 4),
  creature("Cacador de Sangue", 2, 4, 2),
  creature(
    "Saraiva - The God",
    6,
    1,
    1,
    "Ao entrar em campo, causa 10 de dano ao seu oponente.",
    { onPlayDamage: 10 },
  ),
  creature("Cacador Noturno", 2, 3, 2, "Furia.", { fury: true }),
  creature("General Vampirico", 5, 6, 4, "Furia.", { fury: true }),
  creature("Senhor da Guerra", 7, 8, 6, "Furia.", { fury: true }),
  creature("Assassino Escarlate", 3, 4, 2, "Furia.", { fury: true }),
  creature("Sentinela do Castelo", 5, 4, 7, "Provocar.", { taunt: true }),
  creature("Colosso das Sombras", 7, 6, 10, "Provocar.", { taunt: true }),
  creature("Guardiao da Cripta", 2, 1, 4, "Provocar.", { taunt: true }),
  creature("Guerreiro Carmesim", 3, 2, 5, "Provocar.", { taunt: true }),
  creature(
    "Rei Amaldicoado",
    7,
    6,
    8,
    "Sempre que atacar o heroi inimigo, ele perde 1 de Mana no proximo turno.",
    { onHeroAttackManaPenalty: 1 },
  ),
  creature(
    "Bruxo da Lua Negra",
    3,
    2,
    4,
    "Sempre que atacar o heroi inimigo, ele perde 1 de Mana no proximo turno.",
    { onHeroAttackManaPenalty: 1 },
  ),
  creature(
    "Sacerdote Profano",
    4,
    3,
    5,
    "Sempre que atacar o heroi inimigo, ele perde 1 de Mana no proximo turno.",
    { onHeroAttackManaPenalty: 1 },
  ),
  creature(
    "Senhor da Maldicao",
    5,
    4,
    6,
    "Sempre que atacar o heroi inimigo, ele perde 1 de Mana no proximo turno.",
    { onHeroAttackManaPenalty: 1 },
  ),
  spell(
    "Chuva de Sangue",
    3,
    "Cause 1 de dano em todas as criaturas inimigas.",
    { enemyBoardDamage: 1, damageEffect: "bloodfire" },
  ),
  spell(
    "Apocalipse Carmesim",
    7,
    "Cause 3 de dano em todas as criaturas inimigas.",
    { enemyBoardDamage: 3, damageEffect: "bloodfire" },
  ),
  spell(
    "Tempestade Escarlate",
    5,
    "Cause 2 de dano em todas as criaturas inimigas.",
    { enemyBoardDamage: 2, damageEffect: "bloodfire" },
  ),
  spell(
    "Nevoa Sangrenta",
    2,
    "Cause 1 de dano em todas as criaturas inimigas.",
    { enemyBoardDamage: 1, damageEffect: "shadow" },
  ),
  spell(
    "Golpe Sombrio",
    5,
    "Cause 6 de dano a uma criatura inimiga.",
    {
      targetType: "enemyCreature",
      targetCreatureDamage: 6,
      damageEffect: "shadow",
    },
  ),
  spell("Corrupcao", 2, "Cause 3 de dano a uma criatura inimiga.", {
    targetType: "enemyCreature",
    targetCreatureDamage: 3,
    damageEffect: "shadow",
  }),
  spell("Execucao Carmesim", 7, "Destrua uma criatura inimiga.", {
    targetType: "enemyCreature",
    destroyTargetCreature: true,
    damageEffect: "bloodfire",
  }),
  spell("Chamas Negras", 3, "Cause 4 de dano a uma criatura inimiga.", {
    targetType: "enemyCreature",
    targetCreatureDamage: 4,
    damageEffect: "shadow",
  }),
];

const GENERATED_DECK_CARD_IDS = GENERATED_DECK_CARD_DATA.map(
  (_card, index) => `carta${index + 1}`,
);

const GENERATED_DECK_CARDS = Object.fromEntries(
  GENERATED_DECK_CARD_DATA.map((card, index) => {
    const id = `carta${index + 1}`;

    return [
      id,
      {
        id,
        ...card,
        artKey: id,
      },
    ];
  }),
);

export { GENERATED_DECK_CARD_IDS };

/**
 * Biblioteca base das cartas.
 *
 * Estes objetos sao os "modelos" das cartas. Durante a partida, cada carta
 * ganha um instanceId proprio para que duas copias da mesma carta possam ser
 * tratadas como cartas diferentes na mao, no campo e no cemiterio.
 */
export const CARD_LIBRARY = {
  ...GENERATED_DECK_CARDS,
  apprentice: {
    id: "apprentice",
    name: "Aprendiz Arcano",
    type: "creature",
    manaCost: 1,
    attack: 1,
    baseHealth: 2,
    text: "Uma unidade simples para segurar a linha de frente.",
    artKey: "card_apprentice",
  },
  vanguard: {
    id: "vanguard",
    name: "Vanguarda de Ferro",
    type: "creature",
    manaCost: 2,
    attack: 2,
    baseHealth: 3,
    text: "Pressao confiavel na linha de frente.",
    artKey: "card_vanguard",
  },
  striker: {
    id: "striker",
    name: "Atacante Veloz",
    type: "creature",
    manaCost: 3,
    attack: 4,
    baseHealth: 2,
    text: "Ataque alto, baixa resistencia.",
    artKey: "card_striker",
  },
  golem: {
    id: "golem",
    name: "Golem Ancestral",
    type: "creature",
    manaCost: 4,
    attack: 4,
    baseHealth: 5,
    text: "Uma criatura pesada para o fim da partida.",
    artKey: "card_golem",
  },
  stoneGolem: {
    id: "stoneGolem",
    name: "Golem de Pedra",
    type: "creature",
    manaCost: 3,
    attack: 3,
    baseHealth: 4,
    onPlayHeal: 4,
    text: "Ao entrar em campo, cura 4 de vida do seu heroi.",
    artKey: "card_1",
  },
  celestialGuardian: {
    id: "celestialGuardian",
    name: "Guardiao Celestial",
    type: "creature",
    manaCost: 6,
    attack: 8,
    baseHealth: 8,
    onPlayHeal: 8,
    text: "Ao entrar em campo, cura 8 de vida do seu heroi.",
    artKey: "card_2",
  },
  lightAngel: {
    id: "lightAngel",
    name: "Anjo da Luz",
    type: "creature",
    manaCost: 6,
    attack: 5,
    baseHealth: 5,
    onPlayHeal: 5,
    text: "Ao entrar em campo, cura 5 de vida do seu heroi.",
    artKey: "card_3",
  },
  spark: {
    id: "spark",
    name: "Raio de Fagulha",
    type: "spell",
    manaCost: 2,
    damage: 3,
    damageEffect: "arcane",
    text: "Causa 3 de dano ao heroi inimigo.",
    artKey: "card_spark",
  },
  meteor: {
    id: "meteor",
    name: "Explosao Meteoro",
    type: "spell",
    manaCost: 4,
    damage: 5,
    damageEffect: "meteor",
    text: "Causa 5 de dano ao heroi inimigo.",
    artKey: "card_meteor",
  },
};

/**
 * Cria uma carta concreta a partir de uma carta da biblioteca.
 */
export function buildCardInstance(baseId, instanceId) {
  const baseCard = CARD_LIBRARY[baseId];

  if (!baseCard) {
    throw new Error(`Carta desconhecida: ${baseId}`);
  }

  const instance = {
    ...baseCard,
    instanceId,
  };

  if (instance.type === "creature") {
    instance.currentHealth = instance.baseHealth;
  }

  return instance;
}
