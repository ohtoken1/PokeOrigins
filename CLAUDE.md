# Jogo Claude — MMO de Pokémon no navegador

O dono do projeto não é programador: explique decisões em português simples e teste no navegador antes de dizer que algo funciona.
Respostas **curtas** (o dono pediu para economizar limite). Prioridade atual: **lapidar o jogo local**; servidor/contas/anti-trapaça só depois, quando o dono pedir.

## Visão do jogo
- **MMO de Pokémon** para navegador (PC primeiro; celular via Capacitor e app de PC via Electron/Tauri depois).
- Todas as regiões e todos os Pokémon, incluindo shiny. Dados e sprites vêm da **PokéAPI** (o dono assume a questão de direitos).
- Cada região é dividida em **biomas** (grama, subaquático, vulcão, torre…), escolhidos por menus/botões.
- O jogador escolhe um **inicial da região** e anda pelo bioma num **mapa 2D visto de cima** (estilo Pokémon clássico).
- Ao andar no mato, um sorteio por probabilidade (por bioma) gera um Pokémon selvagem num **pop-up** com opções Lutar / Fugir.
- **Foco principal: torneios online simultâneos**, cada jogador com seu time (regras e ranqueamento a definir com o dono).
- Também: XP/níveis, captura, montagem de time, itens, insígnias.

## Estado atual (etapas 1 e 2 — protótipo local)
Regiões liberadas: **todas, de Kanto a Paldea (1–1025)** (`shared/data/pokemon-<regiao>.json`, `dados.ts`, `disponivel` em `shared/regioes.ts`); as abas do menu da região trocam `save.regiao` (o time vai junto). Pokédex e Database mostram todas as regiões carregadas (filtro por região). `montarTabela(..., todos)` usa todas as regiões para as faixas de evolução (Golbat → Crobat); bebês de gerações novas (Pichu, Cleffa…) não contam como forma anterior.
Funciona: escolha do inicial de Kanto → menu da região com 5 biomas (Campos Verdes, Mar Profundo, Vulcão, Caverna Rochosa, Torre Assombrada) → mapa do bioma → **todo passo (em qualquer chão)** gera um encontro num cartão no canto do mapa que **não trava o jogo** (andar = fugir, Enter/botão = lutar) → batalha por turnos fiel ao original → captura, XP, EVs, nível, golpes novos, evolução por nível. Lendários/míticos aparecem raramente nos biomas dos seus tipos (peso fixo `PESO_LENDARIO`, nível 50).
Menus: **Bolsa** (`ui/bolsa.ts`, itens em `shared/itens.ts`: bolas e remédios, usáveis fora e dentro da batalha), **PC** (`ui/pc.ts`: 20 boxes de 30 — `box` em cada Pokémon de `save.caixa`, `guardarNoPC`/`pokemonsDaBox` em `estado.ts`; arrastar entre time/box/abas de box com `ui/arrastar.ts`; mover de box; janela de confirmação para soltar), **ficha** do Pokémon ao clicar nele (`ui/detalhes.ts`: base, IV, EV, valor final, natureza, habilidade, golpes).
Mapa: `client/src/jogo/mapa.ts` gera e desenha com tilesets em `client/public/tiles/` (créditos obrigatórios em `CREDITOS.md` e no rodapé da região): Buch (grama/mato/flores/areia) e Tuxemon core_outdoor_nature (árvores 2×3, rochas 2×2, pedrinhas) e core_outdoor_water (textura 6×6 em (9,0) e moldura 3×3 de margem em (6,1)). Lagos são retangulares e não tocam caminhos (a moldura só encaixa assim). `paletas.ts` define por bioma quais tiles e filtros CSS de cor (chão, objetos, líquido). 96×72 tiles de 16px; **um único Phaser.Game reaproveitado** (`jogo/jogoUnico.ts`: a cena `bioma` reinicia com `init(opcoes)`, mapas e texturas ficam em cache — nunca criar um Game por bioma, isso travava o navegador) (quantidades de lagos/bosques/mato escalam com a área), janela 960×640, câmera com zoom 2×. Caixas (usina) e lápides (torre) ainda são desenhadas por código. Mar Profundo é **subaquático** (`submerso` na paleta): areia, algas no lugar do mato, conchas/estrelas, corais desenhados por código, fossas escuras, tom azul e, na cena, feixes de luz e bolhas. Estilo de referência do dono: tileset estilo Pokémon GBA/DS (grama clara, mato alto, árvores redondas, água com margem, caminhos de areia).
Sprites de Pokémon: **mesma escala para todos** (pedido do dono: Mew pequeno, Mewtwo grande, como no Showdown); `spritePokemon({ palco: true })` centraliza pela parte desenhada; `escala` só fator inteiro (fator quebrado deixa o pixel art irregular).
**Idioma (regra do dono):** todo texto visível ao jogador em **português** — inclusive descrições de itens, golpes e habilidades vindas do Showdown/PokéAPI (traduzir, nunca mostrar em inglês). Ficam em inglês: **nomes** de golpes, itens, atributos (Attack, Sp. Atk…), habilidades (rótulo "Ability/Abilities") e **tipos** (Fire, Fighting… — `nomeTipo`/`seloTipo`).
Pokédex só mostra nome, imagem e dados de quem foi **visto** (`save.vistos`/`capturados`); os outros aparecem como silhueta "???" (admin: "Revelar todos"). Barra no topo (`ui/barraTopo.ts`): Jogar e **Pokédex** (`telas/pokedex.ts` + `estilo-pokedex.css`: lista com busca/filtro por tipo, ficha com sprite normal/shiny/costas, dados, atributos, habilidades, dano por tipo, evolução, golpes por nível, TMs/TRs, onde encontrar); **Database** (`telas/database.ts`: tabelas com busca/ordenação de Pokémon, itens da loja, habilidades e golpes; clicar num Pokémon abre a Pokédex nele; filtros por tipo, tier e categoria de golpe). Tiers em `shared/tiers.ts`: PROVISÓRIO = tier do Smogon/Showdown (gen9, senão National Dex) até o dono preencher `TIERS_DO_JOGO`.
Batalha sempre em pixel art (o teste de sprites 3D foi encerrado; `sprites3d.ts` ficou desligado).
Painel de administrador (`client/src/ui/admin.ts`, aba "⚙ Admin" fixa na esquerda, sem login por enquanto): chance de shiny, multiplicador de lendários / só lendários, chance de encontro por passo, Pokémon e nível forçados. Ajustes em `localStorage` (`jogo-claude:admin`), aplicados por `ajustarTabela`/`encontroForcado`/`sortearEncontro` em `shared/encontros.ts`.
Temporário: save no `localStorage`, botão "Curar time" no bioma (facilidade de teste).

## Batalha (`shared/batalha/`)
- `motor.ts` — `BatalhaSelvagem` envolve o simulador do **Pokémon Showdown** (`@pkmn/sim`, formato `gen9customgame`, regras da 9ª geração). O log do Showdown vira eventos em português para a interface animar.
  - Pokémon do jogador entram como `P<posição no time>` e o selvagem como `S0`; os nomes exibidos vêm dos nossos dados.
  - Showdown não tem batalha selvagem: captura (fórmula 3ª/4ª gen, bônus de status da 5ª+) e fuga (fórmula 3ª/4ª gen) são nossas. Quando o jogador perde a vez (bola falhou / fuga falhou), usamos o volátil `mustrecharge` para o selvagem agir sozinho e escondemos a mensagem de "recarga".
  - O selvagem escolhe um golpe aleatório válido (IA simples).
- `pokemon.ts` — indivíduo (IVs, natureza, habilidade, gênero, golpes com PP, HP, status), golpes por nível do learnset do Showdown (geração mais recente da espécie), atributos, curvas de XP, fórmula de XP da 7ª gen+; XP e EVs só para quem entrou em campo na batalha (sem Exp. Share, pedido do dono), evolução só por nível.
- `progresso.ts` — XP → níveis → golpes novos (com 4 golpes o jogador escolhe qual esquecer) → evolução.
- PP: sem PP Ups (máximo = PP base). HP/status/PP persistem entre batalhas; Centro Pokémon cura. Derrota = cura e volta ao menu da região.
- Interface e animações: `client/src/batalha/` (físico = avanço, especial = projétil da cor do tipo, status = anel; Pokébola com tremidas; evolução piscando).

## Próximas etapas (ordem combinada)
1. ~~Base: dados, biomas, encontros~~
2. ~~Batalha por turnos contra selvagens, captura, XP, evolução~~
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
- Bioma = lista de tipos; cada Pokémon mora em UM bioma só: o do seu tipo principal (ex.: Gastly Fantasma/Veneno → Torre). Pedido do dono. Exceções por linha evolutiva em `BIOMA_FIXO` (`shared/encontros.ts`): Porygon → Torre, Zubat → Caverna, Grimer e Koffing → Vulcão, Dratini → Mar Profundo. Lendários/míticos e iniciais não aparecem soltos.
- `CHANCE_ENCONTRO_POR_PASSO = 1` (pedido do dono: todo passo tem Pokémon, não precisa ser no mato).
- Peso no sorteio = taxa de captura oficial (mais fácil de capturar = mais comum). Evoluções aparecem com +10 níveis por estágio.
- Windows/PowerShell: depois de instalar algo, o PATH pode precisar ser recarregado no shell.

## Nível de treinador (`shared/treinador.ts`)
- Níveis 1–50, separado do nível dos Pokémon. Ganha o MESMO XP que o Pokémon em campo ganha ao derrotar/capturar (pedido do dono). Derrota/fuga não dá XP.
- Curva: subir do nível n pede `242 × n^2,6` XP (começo rápido, final pesado; simulação ≈ 50 mil vitórias até o 50 ≈ 350 h a ~25 s por batalha).
- Selvagens (igual em todos os biomas): teto = 2× o nível de treinador (máx. 100); faixa = teto − 10 até o teto (treinador 20 → 30–40).
- Controle no canto do mapa (qualquer nível) escolhe um teto MENOR para os encontros (nunca maior); `save.nivelEncontro` (null = máximo).

## Faixas de nível das formas (`shared/encontros.ts`)
- Cada forma só aparece na sua faixa (Charmander 1–15, Charmeleon 16–35, Charizard 36–100): nível de evolução do Showdown. Formas que evoluem por pedra/troca/amizade (Raichu, Alakazam, Gengar, Eeveelutions…) NÃO aparecem nos mapas (pedido do dono); a forma anterior vai até o 100. Lendários/míticos podem aparecer desde o treinador nível 1 (raros, peso `PESO_LENDARIO`), sempre no nível 50 ou mais.
- O sorteio escolhe primeiro o nível (dentro da faixa) e depois um Pokémon cuja forma existe nesse nível.

## Loja e itens (`shared/loja.ts`, `shared/usoItens.ts`, `client/src/ui/loja.ts`, `ui/bolsa.ts`)
- Moeda: **silver** (`save.silver`). Provisório: todo item custa 1 (`PRECO_PADRAO`, ajustes em `PRECOS`), começa com 1000 e ganha 10 por vitória — o dono vai definir a economia.
- Catálogo: bolas/remédios nossos + Evolução (pedras, Linking Cord e itens "Evolves…": maçãs, bules, armaduras, Dragon Scale…; usar = evoluir) + itens de batalha padrão da 9ª gen do Showdown SEM frutas, plates/memories, itens de lendários/míticos, itens sem uso em batalha e de EV/IV (regras em `classificarItem`) + TMs (Scarlet/Violet) e TRs (Sword/Shield) de `shared/data/maquinas.json` (`npm run maquinas`, GraphQL da PokéAPI).
- Bolsa: remédios (usar), pedras/Linking Cord (evoluir; troca com item exige o item equipado e o consome), itens de batalha/frutas (equipar; o anterior volta à bolsa), TMs/TRs (ensinar se o learnset do Showdown tiver fonte "M" em qualquer geração; são gastos). PC tem "Tirar item".
- Item equipado vai para a batalha do Showdown (`PokemonIndividual.item`); frutas comidas somem no fim.

## Traduções (`shared/traducao.ts` + `shared/data/traducoes.json`)
- Mapa "descrição em inglês do Showdown → português" (itens, golpes, habilidades; ~1.026 textos). Use sempre `traduzir()` ao mostrar `shortDesc`/`desc`; `nomeTipo()`/`nomeCategoria()` para tipo e categoria.
- Ao adicionar conteúdo novo (outra região, itens novos), gerar a lista dos textos sem tradução, traduzir e acrescentar no JSON — nunca exibir a descrição em inglês.
- Pokébolas: 25 (todas as obtíveis), efeitos de captura em `shared/bolas.ts` (Master garante; Quick 1º turno; Timer por turno; Dusk em Caverna/Torre; Dive/Lure no Mar Profundo; Net Água/Inseto; Nest nível baixo; Level/Love/Moon/Heavy/Fast/Repeat/Dream como nos jogos; Heal cura o capturado).
- Remédios (`shared/itens.ts`, `aplicarRemedio`): HP (Potion…Max Potion, bebidas, Energy), Full Restore, Revive/Max Revive/Revival Herb, Sacred Ash (time todo, só fora da batalha), curas de status específicas e gerais, Ether/Max Ether (golpe que mais gastou PP) e Elixir/Max Elixir. Só itens com imagem oficial na PokéAPI.
