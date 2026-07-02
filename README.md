# Blood Arena

TCG (Trading Card Game) de vampiros para navegador, construído com React, Phaser e Vite. Possui campanha local com progressão, IA em três dificuldades e multiplayer autoritativo por WebSocket.

## Executar

```bash
npm install
npm run dev
```

Por padrão, o Vite usa a porta `5173` e o servidor multiplayer usa a porta `8080`.

Também é possível iniciar os processos separadamente:

```bash
npm run dev:web
npm run server
```

Para executar toda a verificacao de entrega (lint, testes e build):

```bash
npm run check
```

## Documentação

- [DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md): visão completa do projeto.
- [REGRAS_TCG.md](./REGRAS_TCG.md): regras de gameplay.
