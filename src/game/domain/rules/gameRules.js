/**
 * As regras trabalham com clones para evitar mutar o estado antigo.
 * Isso deixa a tela mais previsivel: cada acao gera um novo snapshot.
 */
function cloneState(state) {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      deck: [...player.deck],
      hand: [...player.hand],
      board: player.board.map((card) => ({ ...card })),
      graveyard: [...player.graveyard],
    })),
    logs: [...state.logs],
  };
}

/**
 * Retorna quem esta agindo e quem esta recebendo o efeito.
 */
function getPlayers(state, actingPlayerIndex) {
  return {
    current: state.players[actingPlayerIndex],
    opponent: state.players[actingPlayerIndex === 0 ? 1 : 0],
  };
}

/**
 * Guarda somente os ultimos eventos relevantes da partida.
 */
function log(state, message) {
  state.logs.unshift(message);
  if (state.logs.length > 12) {
    state.logs = state.logs.slice(0, 12);
  }
}

function shuffle(list) {
  const clone = [...list];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temporary = clone[index];
    clone[index] = clone[randomIndex];
    clone[randomIndex] = temporary;
  }

  return clone;
}

function rerollMulliganHand(player) {
  if (player.mulliganUsed || player.hand.length === 0) {
    return 0;
  }

  const returnedCards = player.hand;
  const replacementCards = player.deck.splice(0, returnedCards.length);
  player.hand = replacementCards;
  player.deck = shuffle([...player.deck, ...returnedCards]);
  player.mulliganUsed = true;

  return returnedCards.length;
}

function shouldNpcRerollMulligan(player) {
  const hasEarlyPlay = player.hand.some((card) => card.manaCost <= 2);
  const expensiveCards = player.hand.filter((card) => card.manaCost >= 6);

  return !hasEarlyPlay || expensiveCards.length >= 2;
}

function damagePlayer(player, amount) {
  player.health = Math.max(0, player.health - Math.max(0, amount));
}

function drawCard(state, player) {
  if (player.deck.length === 0) {
    player.fatigueDamage += 1;
    damagePlayer(player, player.fatigueDamage);
    log(
      state,
      `${player.name} sofreu ${player.fatigueDamage} de dano por fadiga.`,
    );
    return;
  }

  const drawnCard = player.deck.shift();

  if (player.hand.length >= state.config.maxHandSize) {
    player.graveyard.push(drawnCard);
    log(
      state,
      `${player.name} comprou ${drawnCard.name}, mas descartou por mao cheia.`,
    );
    return;
  }

  player.hand.push(drawnCard);
  log(state, `${player.name} comprou ${drawnCard.name}.`);
}

export function drawCardAction(state) {
  if (state.winner || state.phase !== "playing") {
    return state;
  }

  const nextState = cloneState(state);
  const current = nextState.players[nextState.activePlayerIndex];

  if (current.hasDrawnThisTurn) {
    log(nextState, `${current.name} ja comprou carta neste turno.`);
    return nextState;
  }

  drawCard(nextState, current);
  current.hasDrawnThisTurn = true;
  checkWinner(nextState);
  return nextState;
}

function checkWinner(state) {
  const deadPlayer = state.players.find((player) => player.health <= 0);

  if (!deadPlayer) {
    return;
  }

  const winner = state.players.find((player) => player.id !== deadPlayer.id);
  state.winner = winner.name;
  state.winnerId = winner.id;
  log(state, `${winner.name} venceu a partida.`);
}

function discardCardsFromHand(state, player, amount) {
  for (let index = 0; index < amount; index += 1) {
    const discardedCard = player.hand.pop();

    if (!discardedCard) {
      return;
    }

    player.graveyard.push(discardedCard);
    log(state, `${player.name} descartou ${discardedCard.name}.`);
  }
}

export function cardRequiresCreatureTarget(card) {
  return card?.targetType === "enemyCreature";
}

function hasTauntCreature(player) {
  return player?.board?.some((card) => card.taunt) ?? false;
}

export function isLegalCreatureSpellTarget(player, targetIndex) {
  const target = player?.board?.[targetIndex];
  if (!target) return false;
  return !hasTauntCreature(player) || Boolean(target.taunt);
}

function resolveCardEffects(state, current, opponent, card, targetIndex = null) {
  if (card.onPlayHeal) {
    const previousHealth = current.health;
    current.health = Math.min(
      current.maxHealth,
      current.health + card.onPlayHeal,
    );
    const healedAmount = current.health - previousHealth;
    log(state, `${current.name} recuperou ${healedAmount} de vida.`);
  }

  if (card.onPlayMana) {
    const previousMana = current.mana;
    current.mana = Math.min(current.maxMana, current.mana + card.onPlayMana);
    const restoredMana = current.mana - previousMana;
    log(state, `${current.name} restaurou ${restoredMana} de mana.`);
  }

  const directDamage = card.onPlayDamage ?? card.damage ?? 0;

  if (directDamage > 0) {
    damagePlayer(opponent, directDamage);
    log(
      state,
      `${card.name} causou ${directDamage} de dano ao heroi inimigo.`,
    );
  }

  if ((card.enemyBoardDamage ?? 0) > 0) {
    opponent.board.forEach((target) => {
      target.currentHealth -= card.enemyBoardDamage;
    });
    log(
      state,
      `${card.name} causou ${card.enemyBoardDamage} de dano a todas as criaturas inimigas.`,
    );
  }

  if (cardRequiresCreatureTarget(card)) {
    const target = opponent.board[targetIndex];

    if (card.destroyTargetCreature) {
      target.currentHealth = 0;
      log(state, `${card.name} destruiu ${target.name}.`);
    } else {
      const targetDamage = Math.max(0, card.targetCreatureDamage ?? 0);
      target.currentHealth -= targetDamage;
      log(state, `${card.name} causou ${targetDamage} de dano a ${target.name}.`);
    }
  }

  for (let index = 0; index < (card.onPlayDraw ?? 0); index += 1) {
    drawCard(state, current);
  }

  discardCardsFromHand(state, current, card.onPlayDiscard ?? 0);
}

function playCreature(state, current, opponent, card) {
  if (current.board.length >= state.config.maxBoardSize) {
    return { ok: false, message: "O campo esta cheio." };
  }

  // Furia e a unica excecao para atacar no turno em que a criatura entra.
  current.board.push({
    ...card,
    currentHealth: card.currentHealth ?? card.baseHealth,
    summoningSick: !card.fury,
    exhausted: !card.fury,
  });

  log(state, `${current.name} invocou ${card.name}.`);
  resolveCardEffects(state, current, opponent, card);

  return { ok: true };
}

function removeDeadCreatures(player) {
  const survivors = [];

  player.board.forEach((card) => {
    if (card.currentHealth <= 0) {
      player.graveyard.push(card);
      return;
    }

    survivors.push(card);
  });

  player.board = survivors;
}

function removeAllDeadCreatures(state) {
  state.players.forEach(removeDeadCreatures);
}

function playSpell(state, current, opponent, card, targetIndex = null) {
  resolveCardEffects(state, current, opponent, card, targetIndex);
  current.graveyard.push(card);
  log(state, `${current.name} usou ${card.name}.`);
  return { ok: true };
}

/**
 * Tenta jogar a carta da mao do jogador ativo.
 */
export function playCardAction(state, handIndex, targetIndex = null) {
  if (state.winner || state.phase !== "playing") {
    return state;
  }

  const nextState = cloneState(state);
  const { current, opponent } = getPlayers(
    nextState,
    nextState.activePlayerIndex,
  );
  const card = current.hand[handIndex];

  if (!card) {
    return state;
  }

  if (card.manaCost > current.mana) {
    log(
      nextState,
      `${current.name} nao tem mana suficiente para ${card.name}.`,
    );
    return nextState;
  }

  if (cardRequiresCreatureTarget(card)) {
    if (!opponent.board[targetIndex]) {
      log(nextState, `${card.name} precisa de uma criatura inimiga como alvo.`);
      return nextState;
    }
    if (!isLegalCreatureSpellTarget(opponent, targetIndex)) {
      log(nextState, "Uma criatura com Provocar deve ser escolhida como alvo.");
      return nextState;
    }
  }

  current.mana -= card.manaCost;
  current.hand.splice(handIndex, 1);

  let result;
  if (card.type === "creature") {
    result = playCreature(nextState, current, opponent, card);
    if (!result.ok) {
      current.mana += card.manaCost;
      current.hand.splice(handIndex, 0, card);
      log(nextState, result.message);
      return nextState;
    }
  } else {
    result = playSpell(nextState, current, opponent, card, targetIndex);
  }

  checkWinner(nextState);
  removeAllDeadCreatures(nextState);
  return nextState;
}

/**
 * Faz uma criatura pronta atacar diretamente o heroi inimigo.
 */
export function attackFaceAction(state, boardIndex) {
  if (state.winner || state.phase !== "playing") {
    return state;
  }

  const nextState = cloneState(state);
  const { current, opponent } = getPlayers(
    nextState,
    nextState.activePlayerIndex,
  );
  const attacker = current.board[boardIndex];

  if (!attacker) {
    return state;
  }

  if (attacker.summoningSick || attacker.exhausted) {
    log(nextState, `${attacker.name} ainda nao pode atacar.`);
    return nextState;
  }

  if (hasTauntCreature(opponent)) {
    log(nextState, "Uma criatura com Provocar protege o heroi inimigo.");
    return nextState;
  }

  attacker.exhausted = true;
  damagePlayer(opponent, attacker.attack);
  const manaPenalty = Math.max(0, attacker.onHeroAttackManaPenalty ?? 0);
  if (manaPenalty > 0) {
    opponent.pendingManaPenalty =
      (opponent.pendingManaPenalty ?? 0) + manaPenalty;
    log(
      nextState,
      `${attacker.name} reduziu em ${manaPenalty} a Mana do proximo turno de ${opponent.name}.`,
    );
  }
  log(
    nextState,
    `${current.name} atacou com ${attacker.name} e causou ${attacker.attack} de dano.`,
  );

  checkWinner(nextState);
  removeAllDeadCreatures(nextState);
  return nextState;
}

/**
 * Resolve combate entre duas criaturas com dano simultaneo.
 */
export function attackCreatureAction(state, attackerIndex, targetIndex) {
  if (state.winner || state.phase !== "playing") {
    return state;
  }

  const nextState = cloneState(state);
  const { current, opponent } = getPlayers(
    nextState,
    nextState.activePlayerIndex,
  );
  const attacker = current.board[attackerIndex];
  const target = opponent.board[targetIndex];

  if (!attacker || !target) {
    return state;
  }

  if (attacker.summoningSick || attacker.exhausted) {
    log(nextState, `${attacker.name} ainda nao pode atacar.`);
    return nextState;
  }

  if (hasTauntCreature(opponent) && !target.taunt) {
    log(nextState, "Primeiro ataque uma criatura inimiga com Provocar.");
    return nextState;
  }

  attacker.exhausted = true;
  target.currentHealth -= attacker.attack;
  attacker.currentHealth -= target.attack;
  log(
    nextState,
    `${attacker.name} atacou ${target.name}. Ambos causaram dano.`,
  );

  removeAllDeadCreatures(nextState);
  checkWinner(nextState);
  return nextState;
}

/**
 * No inicio do turno, as criaturas do jogador ativo ficam prontas.
 */
function readyBoardForTurn(board) {
  return board.map((card) => ({
    ...card,
    summoningSick: false,
    exhausted: false,
  }));
}

/**
 * Prepara mana/criaturas e faz a compra obrigatoria do inicio do turno.
 */
function startTurn(
  state,
  player,
  { increaseMana = true, drawAtStart = true } = {},
) {
  if (increaseMana) {
    player.maxMana = Math.min(state.config.maxMana, player.maxMana + 1);
  }

  const manaPenalty = Math.min(
    player.maxMana,
    Math.max(0, player.pendingManaPenalty ?? 0),
  );
  player.mana = Math.max(0, player.maxMana - manaPenalty);
  player.lastManaPenaltyApplied = manaPenalty;
  player.pendingManaPenalty = 0;
  player.board = readyBoardForTurn(player.board);
  player.hasDrawnThisTurn = true;

  log(state, `${player.name} iniciou o turno ${state.turn}.`);

  if (manaPenalty > 0) {
    log(
      state,
      `${player.name} iniciou o turno com ${manaPenalty} de Mana a menos.`,
    );
  }

  if (drawAtStart) {
    drawCard(state, player);
  }

  checkWinner(state);
}

export function rerollMulliganAction(state, playerIndex = 0) {
  if (state.winner || state.phase !== "mulligan") {
    return state;
  }

  const nextState = cloneState(state);
  const player = nextState.players[playerIndex];
  if (!player) {
    return state;
  }
  const changedCards = rerollMulliganHand(player);

  if (changedCards > 0) {
    log(nextState, `${player.name} trocou as cartas iniciais.`);
  }

  return nextState;
}

export function confirmMulliganAction(state) {
  if (state.winner || state.phase !== "mulligan") {
    return state;
  }

  const nextState = cloneState(state);
  const npc = nextState.players[1];
  const npcChanged = shouldNpcRerollMulligan(npc)
    ? rerollMulliganHand(npc)
    : 0;
  const startingPlayer = nextState.players[nextState.activePlayerIndex];

  nextState.phase = "playing";
  log(nextState, `${npc.name} trocou ${npcChanged} carta(s) iniciais.`);
  log(nextState, "A partida comecou.");
  startTurn(nextState, startingPlayer, {
    increaseMana: false,
    drawAtStart: false,
  });

  return nextState;
}

function startMultiplayerAfterMulligan(state) {
  if (!state.players.every((player) => player.mulliganConfirmed)) {
    return;
  }

  const startingPlayer = state.players[state.activePlayerIndex];
  state.phase = "playing";
  log(state, "Os dois jogadores confirmaram as cartas iniciais.");
  log(state, "A partida comecou.");
  startTurn(state, startingPlayer, {
    increaseMana: false,
    drawAtStart: false,
  });
}

export function confirmMultiplayerMulliganAction(
  state,
  playerIndex,
  { forceAll = false } = {},
) {
  if (state.winner || state.phase !== "mulligan") {
    return state;
  }

  const nextState = cloneState(state);

  if (forceAll) {
    nextState.players.forEach((player) => {
      player.mulliganConfirmed = true;
    });
  } else {
    const player = nextState.players[playerIndex];
    if (!player || player.mulliganConfirmed) {
      return state;
    }
    player.mulliganConfirmed = true;
    log(nextState, `${player.name} confirmou as cartas iniciais.`);
  }

  startMultiplayerAfterMulligan(nextState);
  return nextState;
}

/**
 * Passa o turno e prepara o proximo jogador para a fase principal.
 */
export function endTurnAction(state) {
  if (state.winner || state.phase !== "playing") {
    return state;
  }

  const nextState = cloneState(state);
  const previousActiveIndex = nextState.activePlayerIndex;
  const nextActiveIndex = previousActiveIndex === 0 ? 1 : 0;

  nextState.activePlayerIndex = nextActiveIndex;
  nextState.turn += 1;

  const nextPlayer = nextState.players[nextActiveIndex];
  startTurn(nextState, nextPlayer);

  return nextState;
}
