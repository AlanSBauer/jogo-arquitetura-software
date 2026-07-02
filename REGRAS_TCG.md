# Regras do Jogo TCG

---

# Construção do Deck

Cada jogador deve montar um deck contendo exatamente:

* **30 cartas**

Não é permitido iniciar a partida com mais ou menos cartas.

Ao iniciar a partida:

* 4 cartas são compradas para a mão inicial.
* As outras 26 permanecem no deck para serem compradas durante a partida.

O jogo possui quatro baralhos predefinidos e equilibrados, um para cada avatar.

* Escolher um avatar também seleciona automaticamente o baralho associado.
* Cada baralho contém cura, recuperação de Mana, dano direto e criaturas de diferentes custos.
* Cada baralho possui uma carta com Fúria, uma com Provocar, uma magia de dano em área e uma magia com alvo em criatura.
* A ordem das 30 cartas é embaralhada novamente no começo de cada partida.
* No modo de um jogador, a IA escolhe outro avatar e o baralho correspondente.
* No modo multijogador, cada participante usa o baralho associado ao avatar escolhido no saguão.

---

# Vida dos Jogadores

Cada jogador começa a partida com:

* **50 pontos de Vida**

A Vida não pode ultrapassar 50, exceto se uma carta disser explicitamente o contrário.

---

# Mão Inicial

Cada jogador começa a partida com:

* **4 cartas na mão**

Não existe quantidade mínima de cartas na mão durante a partida.

Um jogador pode ficar com:

* 6 cartas
* 5 cartas
* 4 cartas
* 3 cartas
* 2 cartas
* 1 carta
* **0 cartas**

Ficar sem cartas na mão não causa derrota.

---

# Limite de Cartas na Mão

Cada jogador pode possuir no máximo:

* **6 cartas na mão**

Caso o jogador compre uma carta estando com a mão cheia:

* A carta comprada vai diretamente para a pilha de descarte.

---

# Tipos de Carta

Existem atualmente quatro tipos principais de cartas.

---

## Criatura

São colocadas no tabuleiro e permanecem em jogo até serem destruídas.

Possuem:

* Ataque
* Vida
* Custo de Mana

Criaturas podem atacar somente quando estiverem aptas a atacar.
Quando a carta é colocada em campo na arena, ela só pode atacar depois que passar 1 turno.

Exceção: criaturas com **Fúria** entram prontas e podem atacar no mesmo turno em que forem jogadas.

---

## Magia

Cartas de magia não permanecem no tabuleiro.

Ao serem utilizadas:

1. O custo de mana é pago.
2. O efeito é executado imediatamente.
3. A carta é enviada para a pilha de descarte.

As magias podem:

* causar dano ao jogador inimigo
* recuperar vida
* conceder mana
* comprar cartas
* possuir qualquer outro efeito descrito na carta

---

## Magias de Cura

Recuperam pontos de vida imediatamente.

Podem curar:

* O jogador

Após resolver o efeito, são descartadas.

A cura não pode ultrapassar o limite máximo de vida do alvo, ou seja se a vida do jogador estiver em 48/50 e a carta recuperar 3, vai recuperar somente o que falta para o 50, que nesse caso é 2.

---

## Magias de Mana

Concedem mana temporária ou aumentam a mana máxima, conforme descrito na carta.

Após resolver o efeito, são descartadas.

Caso a carta aumente a mana máxima, esse aumento permanece, respeitando o limite máximo definido pelo jogo que é 10.

---

# Habilidades e Efeitos Especiais

## Provocar

Enquanto um jogador controlar uma ou mais criaturas com **Provocar**:

* as criaturas adversárias só podem atacar criaturas com Provocar;
* o herói protegido não pode ser atacado por criaturas;
* outras criaturas sem Provocar não podem ser atacadas por criaturas;
* caso existam várias criaturas com Provocar, o atacante pode escolher qualquer uma delas.

Provocar restringe ataques de criaturas e também magias que escolhem uma criatura inimiga específica como alvo. Enquanto existir uma criatura com Provocar, essas magias devem escolhê-la.

Magias que causam dano diretamente ao herói e magias de dano em área continuam funcionando normalmente, pois não escolhem uma criatura específica.

## Fúria

Uma criatura com **Fúria** não sofre o impedimento do primeiro turno. Ela entra no tabuleiro pronta e pode atacar imediatamente, desde que nenhuma outra regra impeça o ataque.

## Bruxos e Redução de Mana

Sempre que uma criatura com o efeito de Bruxo atacar o herói inimigo:

* o adversário recebe uma penalidade de 1 de Mana para o próximo turno;
* a Mana máxima não é reduzida;
* no início do turno afetado, a Mana máxima aumenta normalmente e a Mana disponível recebe a penalidade;
* penalidades causadas por vários ataques são acumuladas;
* a Mana disponível nunca pode ficar abaixo de 0;
* a penalidade é consumida após ser aplicada naquele turno.

Exemplo: um jogador que passaria a ter 6 de Mana máxima e recebeu duas penalidades começa o turno com 4/6 de Mana.

## Magias de Dano em Área

Magias de dano em área causam o valor descrito a todas as criaturas no tabuleiro inimigo ao mesmo tempo. Criaturas que chegarem a 0 ou menos de Vida são destruídas e enviadas ao descarte.

Essas magias não causam dano ao herói, salvo quando a própria carta disser explicitamente o contrário.

## Magias com Alvo em Criatura

Magias que causam dano ou destroem uma criatura específica exigem a escolha de uma criatura inimiga válida antes de serem utilizadas.

* Elas não podem escolher heróis.
* Elas não podem ser usadas sem uma criatura inimiga no tabuleiro.
* Apenas a criatura escolhida recebe o efeito.
* Se existir uma criatura com Provocar, ela deve ser escolhida como alvo.
* Após a resolução, a magia vai para o descarte.

---

# Pilha de Descarte

Sempre que uma carta deixa de existir em jogo ela vai para o descarte.

Isso inclui:

* Magias utilizadas
* Criaturas destruídas
* Cartas descartadas por excesso na mão
* Cartas descartadas por efeitos
* Cartas compradas com a mão cheia

Cartas no descarte não retornam ao jogo.

---

# Ordem do Turno

Todo turno segue esta sequência obrigatória.

---

## 1. Início do Turno

No início do turno:

1. A mana máxima aumenta em +1, até o limite de 10.
2. Toda a mana é restaurada.
3. Penalidades de Mana pendentes são aplicadas somente à Mana disponível, sem reduzir a Mana máxima.
4. O jogador compra 1 carta obrigatoriamente.

A compra no início do turno é obrigatória.

Exceção: no primeiro turno da partida, o jogador sorteado para começar não compra uma carta. Ele começa apenas com as 4 cartas da mão inicial e volta a comprar normalmente em seu próximo turno.

O jogador não pode escolher não comprar. O jogo da a carta no inicio do turno automaticamente.

---

## 2. Fase Principal

O jogador pode realizar qualquer quantidade das ações abaixo enquanto possuir mana, cartas válidas e tempo disponível:

* jogar criaturas
* utilizar magias
* atacar com criaturas aptas
* utilizar habilidades das cartas
* encerrar o turno

O jogador não é obrigado a gastar toda a mana.
O jogador pode terminar o turno com mana sobrando.

---

## 3. Encerramento

O turno termina quando:

* o jogador clica para finalizar o turno;
* ou o tempo de 1 minuto e 30 segundos acaba.

Quando o turno termina, o turno passa imediatamente ao adversário.

---

# Tempo de Turno

Cada turno dura no máximo:

* **1 minuto e 30 segundos (90 segundos)**

Quando o tempo acabar:

* o jogador perde o direito de realizar novas ações;
* o turno passa automaticamente para o adversário.

---

# Como Jogar uma Carta no tabuleiro

Uma carta só pode ser utilizada quando:

* houver mana suficiente;
* existir espaço disponível na mesa, caso seja criatura;
* todos os requisitos da carta forem atendidos;
* existir alvo válido, caso a carta precise de alvo.

Após ser utilizada:

## Criatura

Vai para o tabuleiro.

## Magia

Resolve seu efeito imediatamente e é descartada.

---

# Espaço no Tabuleiro

Cada jogador pode controlar no máximo:

* **5 criaturas**

Caso a mesa esteja cheia:

* novas criaturas não podem ser invocadas;
* efeitos que invocariam criaturas não invocam acima do limite;
* magias ainda podem ser usadas normalmente;
* habilidades das criaturas em campo ainda podem ser usadas normalmente.

O limite é de 5 criaturas na mesa, não de 5 cartas jogadas no turno.

---

# Ataques

Somente criaturas podem atacar.

O jogador, também chamado de herói, não possui ataque próprio.

Cada criatura pode atacar conforme as regras de prontidão da carta.

Uma criatura pode atacar:

* criaturas inimigas;
* ou o jogador inimigo, caso não exista nenhuma regra impedindo.

---

# Dano entre Criaturas

Quando uma criatura ataca outra criatura:

* a criatura atacante causa dano igual ao seu ataque;
* a criatura defensora causa dano de volta igual ao seu ataque;
* ambos os danos são aplicados.

Se a vida de uma criatura chegar a 0 ou menos:

* ela é destruída;
* ela vai para a pilha de descarte.

---

# Dano ao Jogador

Quando uma criatura ou magia causa dano ao jogador:

* o dano é reduzido diretamente da vida do jogador.

Se a vida do jogador chegar a 0 ou menos:

* ele perde a partida imediatamente.

---

# Resolução dos Efeitos

Quando uma carta é utilizada:

1. O custo de mana é pago para jogar a carta no tabuleiro.
2. O alvo é escolhido, quando necessário.
3. O efeito acontece.
4. Caso seja uma magia, ela é descartada.
5. Caso seja uma criatura, permanece no tabuleiro.

Caso uma carta tente executar um efeito impossível, o efeito impossível é ignorado.

Exemplo:

* comprar carta com deck vazio causa fadiga;
* invocar criatura com mesa cheia não invoca;
* curar alvo com vida cheia não aumenta a vida acima do máximo, exceto se a carta permitir.

---

# Compra de Cartas

Sempre que um jogador comprar carta:

* se houver carta no deck, ela vai para a mão;
* se a mão estiver cheia, a carta vai direto para o descarte;
* se o deck estiver vazio, o jogador sofre fadiga.

---

# Fadiga

Se um jogador precisar comprar uma carta, mas o deck estiver vazio:

* ele não compra carta;
* ele sofre dano de fadiga.

O dano de fadiga começa em:

* **1 de dano**

A cada nova tentativa de compra com o deck vazio, o dano aumenta em +1.

Exemplo:

* 1ª compra sem deck: sofre 1 de dano
* 2ª compra sem deck: sofre 2 de dano
* 3ª compra sem deck: sofre 3 de dano
* 4ª compra sem deck: sofre 4 de dano

Cada jogador possui seu próprio contador de fadiga.

Se o jogador não sobreviver ao dano de fadiga, ele perde a partida.

---

# Condições de Vitória

Um jogador vence quando o adversário:

* fica com 0 ou menos de vida;
* não consegue sobreviver ao dano de fadiga;
* se rende.

Acabar o deck não causa derrota imediata.

A derrota só acontece se o jogador morrer por dano de fadiga ou por outro dano.

---

# Regras da IA / NPC

A IA deve seguir as mesmas regras do jogador.

A IA deve:

* comprar carta obrigatoriamente no início do turno;
* respeitar o limite de 6 cartas na mão;
* respeitar o limite de 5 criaturas na mesa;
* sofrer fadiga quando tentar comprar com o deck vazio;
* poder ficar com 0 cartas na mão;
* poder terminar o turno com mana sobrando;
* poder jogar uma ou várias cartas no mesmo turno;
* poder usar magias mesmo com a mesa cheia;
* poder usar habilidades das criaturas já posicionadas na mesa.
* respeitar Provocar ao gerar alvos de ataque;
* permitir que criaturas com Fúria ataquem no turno em que entram;
* aplicar e considerar penalidades de Mana causadas por Bruxos;
* escolher alvos válidos para magias direcionadas;
* calcular dano, mortes e valor de mesa de magias em área.

A IA não pode:

* jogar criatura se já possuir 5 criaturas na mesa;
* comprar carta depois de jogar, exceto se alguma carta causar compra;
* ignorar custo de mana;
* ultrapassar o tempo de 1 minuto e 30 segundos;
* jogar cartas sem cumprir os requisitos.

---

# Comportamento da IA

A IA deve agir de forma mais parecida com um jogador real.

Antes de cada ação, ela deve avaliar:

* vida própria;
* vida do jogador;
* mana disponível;
* cartas na mão;
* cartas restantes no deck;
* risco de fadiga;
* criaturas próprias no campo;
* criaturas inimigas no campo;
* possibilidade de dano letal;
* necessidade de defender;
* vantagem de mesa;
* melhor uso da mana;
* possibilidade de guardar recursos.

A IA não deve escolher cartas apenas pelo maior custo de mana.

Ela deve escolher a melhor jogada para a situação atual.

## Uso das Novas Habilidades por Dificuldade

### Fácil

* Respeita todas as restrições de Provocar e de alvo.
* Usa Fúria no turno em que a criatura entra, mas pode escolher entre jogadas seguras com alguma aleatoriedade.
* Evita desperdiçar remoções em alvos sem valor quando houver uma opção claramente melhor.

### Médio

* Prioriza remover criaturas perigosas e criaturas com Provocar que bloqueiem bons ataques.
* Avalia se magias direcionadas matam o alvo e se magias em área atingem criaturas suficientes.
* Considera a pressão futura gerada pela redução de Mana dos Bruxos.

### Difícil

* Simula sequências combinando remoção de Provocar, magias em área, Fúria e ataques ao herói.
* Procura dano letal depois de abrir caminho no tabuleiro.
* Escolhe o alvo de maior valor para dano direcionado ou destruição.
* Compara o valor de usar uma remoção agora com guardá-la para uma ameaça maior.
* Considera penalidades de Mana acumuladas no planejamento do turno seguinte.

A IA pode:

* clicar em uma carta e jogar;
* clicar em várias cartas antes de escolher;
* pensar antes de atacar;
* jogar várias cartas no turno;
* jogar apenas uma carta;
* não jogar nenhuma carta;
* guardar mana;
* guardar cartas para turnos futuros.

---

# Tempo de Decisão da IA

A IA não deve jogar instantaneamente.

Ela deve usar tempos aleatórios para parecer mais humana.

Sugestões:

* antes da primeira ação: 800ms a 2500ms;
* entre selecionar uma carta e jogar: 400ms a 1800ms;
* antes de atacar: 500ms a 2000ms;
* antes de encerrar o turno: 700ms a 2000ms.

Em jogadas mais complexas, a IA pode demorar mais.

Mesmo assim, ela nunca pode ultrapassar o limite total de 1 minuto e 30 segundos por turno.
