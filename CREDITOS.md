# Créditos

## Tilesets
- **Tuxemon Tileset** — Buch — CC-BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)
  https://opengameart.org/content/tuxemon-tileset — `client/public/tiles/tuxemon-buch.png` (grama, mato, flores, areia)
- **Core Outdoor Nature / Core Outdoor Water / Core Outdoor** do projeto Tuxemon — rubberduck, George_, Buch, luke83, Past the Future, Midi, ZaPaper, ArMM1998, Isaiah658, Drummyfish — CC-BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
  https://github.com/Tuxemon/Tuxemon (ver ATTRIBUTIONS.md) — `client/public/tiles/core_outdoor*.png` (árvores, pedras, água)

- **Core Buildings** do projeto Tuxemon — baseado em "Fancy House" e "Buildings and Features"/"Doors" de Kelvin Shadewing (adaptado por Mircea Kitsune; hospital adaptado por Sanglorian) e "Superpowers Assets Ninja Tilesheet" (domínio público) — CC-BY-SA 4.0 / XYG Open Source License v1.1 / CC BY 3.0
  https://github.com/Tuxemon/Tuxemon (ver ATTRIBUTIONS.md) — `client/public/tiles/core_buildings.png` (prédios da cidade: Centro Pokémon, Pokémarket, banco, estação, arena, casas)
- **Core City and Country** do projeto Tuxemon — "Outdoor Tiles – City and Country" de ArMM1998 — CC-BY-SA 4.0
  https://github.com/Tuxemon/Tuxemon (ver ATTRIBUTIONS.md) — `client/public/tiles/core_city_and_country.png` (fonte, mural, barraca, placa, calçamento)
- Bancos, floreiras e máquinas de bebida da cidade: "Outdoor odds and ends" de Isaiah658, dentro do `core_outdoor.png` do Tuxemon (acima). Arbustos floridos da cidade: `core_outdoor.png`; caixotes de frutas das barracas e vitórias-régias dos lagos: `core_city_and_country.png`; árvores variadas (pinheiros, outono) e pedras grandes: `core_outdoor_nature.png` (todos do Tuxemon, acima). Fonte, arena, postes, trilhos, barracas de feira, cercas, cerca-viva, caixa de correio, bandeirolas, trem e o chão da cidade (grama, terra, calçada, paralelepípedos, lagos, hortas): desenho próprio (código em `client/src/jogo/cidadeDesenhos.ts`, `cidadePecas.ts`, `cidadeChao.ts` e `mapa.ts`); o Pokémarket é o prédio verde do Core Buildings recolorido de azul, com símbolo próprio. A estátua da fonte é o sprite do Mew (5ª geração, PokéAPI) transformado em pedra por código. Os Pokémon que passeiam pela cidade usam os sprites do PMD SpriteCollab (abaixo) e os moradores, as camadas do LPC (abaixo).

As cores dos tiles são alteradas por filtro em cada bioma. Versões modificadas desses tiles seguem as mesmas licenças.

## Personagem do jogador
- **Universal LPC Spritesheet Character Generator** (Liberated Pixel Cup) — vários artistas, lista por peça em `client/public/lpc/CREDITOS-LPC.csv` — CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0
  https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator — `client/public/lpc/` (corpo, cabeça, olhos, cabelos, camiseta, calça, tênis; cores trocadas pelas paletas do próprio LPC)
- Boné, estampas da camiseta e Pokébolas do cinto: desenho próprio (código em `client/src/personagem/lpc.ts`).

## Pokémon que segue o jogador (iniciais)
- **PMD SpriteCollab** — vários artistas (créditos por espécie em `client/public/seguidores/<número>/credits.txt` e nomes em `credit_names.txt`) — CC BY-NC 4.0 (uso não comercial; ver `LICENSE-SpriteCollab.md`)
  https://github.com/PMDCollab/SpriteCollab — `client/public/seguidores/` (andar e parado em 8 direções de 961 espécies; versão shiny de 918)

## Fundos de batalha
- Cenários de batalha dos jogos oficiais (Pokémon X/Y, Omega Ruby/Alpha Sapphire e Black/White — © Nintendo/Game Freak/The Pokémon Company), obtidos do Pokémon Showdown (play.pokemonshowdown.com) — `client/public/batalha/`.

## Dados e sprites de Pokémon
- PokéAPI — https://pokeapi.co
- Motor de batalha: Pokémon Showdown via `@pkmn/sim` (MIT)

## Imagens de itens
- Tera Shards e Teal Mask: imagens oficiais de Scarlet/Violet (© Nintendo/Game Freak/The Pokémon Company), obtidas do Serebii (serebii.net) — `client/public/itens/`.

## Animações dos golpes
- Imagens de efeito (bola de fogo, folhas, raio, pedras, mordida, soco…) do Pokémon Showdown (play.pokemonshowdown.com/fx), carregadas direto do site deles.

## Mega Evolução
- Símbolo da Mega Evolução (© Nintendo/Game Freak/The Pokémon Company), arquivo "Megaevolución icono.svg" do WikiDex (wikidex.net) — `client/public/batalha/mega-evolucao.svg`.
- Sprites das Megas: PokéAPI (github.com/PokeAPI/sprites); ícones das Mega Stones: folha de ícones do Pokémon Showdown.

## Imagens dos treinadores
- Sprites dos personagens (líderes de ginásio, Elite Four, campeões, rivais e outros) do Pokémon Showdown (play.pokemonshowdown.com/sprites/trainers; arte dos jogos oficiais © Nintendo/Game Freak/The Pokémon Company e artistas da comunidade do Showdown) — `client/public/treinadores/`.

## Imagens das insígnias
- Insígnias dos ginásios (© Nintendo/Game Freak/The Pokémon Company): PokéAPI sprites (github.com/PokeAPI/sprites, sprites/badges) e, as de Galar, WikiDex (wikidex.net) — `client/public/insignias/`.
