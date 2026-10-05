# Jogo Claude — MMO de Pokémon no navegador

O dono do projeto não é programador: explique decisões em português simples e teste no navegador antes de dizer que algo funciona.

## Visão do jogo
- **MMO de Pokémon** para navegador (PC primeiro; celular via Capacitor e app de PC via Electron/Tauri depois).
- Todas as regiões e todos os Pokémon, incluindo shiny. Dados e sprites vêm da **PokéAPI** (o dono assume a questão de direitos).
- Cada região é dividida em **biomas** (grama, subaquático, vulcão, torre…), escolhidos por menus/botões.
- O jogador escolhe um **inicial da região** e anda pelo bioma num **mapa 2D visto de cima** (estilo Pokémon clássico).
- Ao andar no mato, um sorteio por probabilidade (por bioma) gera um Pokémon selvagem num **pop-up** com opções Lutar / Fugir.
- **Foco principal: torneios online simultâneos**, cada jogador com seu time (regras e ranqueamento a definir com o dono).
- Também: XP/níveis, captura, montagem de time, itens, insígnias.

## Estado atual (etapa 1 — protótipo local)
Funciona: escolha do inicial de Kanto → menu da região com 9 biomas → mapa do bioma → encontros com pop-up (GIF animado, nível, shiny) → "Capturar (teste)" adiciona ao time.
Temporário: save no `localStorage` (vai para o servidor), botão "Capturar (teste)" (vai virar batalha + Pokébola), mapas gerados por código (vão virar mapas do Tiled com arte).

## Próximas etapas (ordem combinada)
1. ~~Base: dados, biomas, encontros~~
2. Batalha por turnos contra selvagens — usar o motor do Pokémon Showdown (`@pkmn/sim`, licença MIT) em vez de escrever as regras do zero; captura com Pokébola; XP e level up.
3. Servidor: Node + Colyseus (tempo real) + PostgreSQL; contas, save no servidor, sorteios e batalhas **no servidor** (anti-trapaça).
4. Torneios online.
5. Demais regiões, itens, insígnias, loja.

## Estrutura
- `client/` — jogo (Vite + TypeScript + Phaser 3). Telas de menu em HTML/CSS (`src/telas`, `src/ui`), mapa em Phaser (`src/jogo`).
- `shared/` — código e dados usados pelo cliente e, no futuro, pelo servidor: `biomas.ts`, `encontros.ts` (sorteio), `regioes.ts`, `tipos.ts`, `data/pokemon-<regiao>.json`.
- `scripts/baixar-pokeapi.mjs` — baixa os dados da PokéAPI para `shared/data/`. As imagens são carregadas pelas URLs do GitHub da PokéAPI.

## Comandos
- `npm run dev` — servidor local em http://localhost:5173
- `npm run build` — checa tipos e gera `client/dist`
- `npm run dados -- kanto` (ou `johto`, …, `todas`) — baixa dados da PokéAPI

## Convenções
- Código, nomes e comentários em **português** (sem acentos em identificadores).
- Regras de jogo (probabilidades, níveis, chance de shiny) ficam em `shared/` como constantes fáceis de ajustar.
- Bioma = lista de tipos; um Pokémon entra em todos os biomas de qualquer um dos seus tipos. Lendários/míticos e iniciais não aparecem soltos.
- Peso no sorteio = taxa de captura oficial (mais fácil de capturar = mais comum). Evoluções aparecem com +10 níveis por estágio.
- Windows/PowerShell: depois de instalar algo, o PATH pode precisar ser recarregado no shell.
