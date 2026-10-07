# 📖 Livro de Regras — Jogo Claude

> Como o **nosso** jogo funciona. Não explica Pokémon em geral (tipos, golpes, natureza…). Isso qualquer um encontra por aí. Aqui ficam só as regras e os sistemas **deste** jogo.
>
> É um documento vivo: atualizamos juntos a cada mudança. Cada seção pode virar um post no Discord.
>
> **Versão atual:** 0.1 — protótipo local (outubro de 2026)

---

## Índice
1. [Começando](#1-começando)
2. [Regiões e biomas](#2-regiões-e-biomas)
3. [Encontros selvagens](#3-encontros-selvagens)
4. [Raridade e chances](#4-raridade-e-chances)
5. [Nível de treinador](#5-nível-de-treinador)
6. [Batalha](#6-batalha)
7. [Captura](#7-captura)
8. [Experiência, níveis e evolução](#8-experiência-níveis-e-evolução)
9. [IVs ocultos](#9-ivs-ocultos)
10. [Time, PC e o Pokémon que te segue](#10-time-pc-e-o-pokémon-que-te-segue)
11. [Moedas: Silver e Gold](#11-moedas-silver-e-gold)
12. [Loja e Bolsa](#12-loja-e-bolsa)
13. [Tickets](#13-tickets)
14. [Pokédex e Database](#14-pokédex-e-database)
15. [Comunidade](#15-comunidade)
16. [Créditos](#16-créditos)
17. [Histórico de versões](#17-histórico-de-versões)
18. [Ideias para o futuro](#18-ideias-para-o-futuro)

---

## 1. Começando

### 1.1 Criação do treinador
O primeiro passo é montar o seu personagem:

- **Nome de treinador:** de 3 a 16 letras, obrigatório. Aparece em cima do personagem no mapa.
- **Corpo:** masculino ou feminino.
- **Tom de pele:** 7 opções.
- **Cabelo:** 8 cortes e 13 cores.
- **Roupas:** cor da camiseta, da calça e do tênis.
- **Estilo Pokémon:** estampa na camiseta (Pokébola, raio, gota, chama ou lisa) e Pokébolas no cinto.

Dá para mudar o visual e o nome depois, pelo botão **✏️ Personagem** no menu da região.

### 1.2 A roleta do inicial
Cada jogador **não escolhe** o inicial. Ele é sorteado numa roleta:

- Entram os **27 iniciais de todas as regiões**, de Bulbasaur a Quaxly.
- **Todos têm a mesma chance** (1 em 27).
- O resultado fica guardado: recarregar a página não sorteia de novo.

### 1.3 O inicial é especial
- **IVs 20 em todos os atributos.** É um Pokémon sólido, mas nunca perfeito.
- **🔒 NT (inegociável):** não pode ser trocado com outros jogadores quando as trocas existirem. O selo NT aparece no cartão, no resumo e na ficha.
- Os IVs dele já vêm revelados (veja a [seção 9](#9-ivs-ocultos)).

### 1.4 Região inicial
Depois da roleta, você escolhe onde começar. **Todas as 9 regiões** estão liberadas: Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar e Paldea. Dá para trocar de região quando quiser pelas abas do menu, e o time vai junto.

---

## 2. Regiões e biomas

Cada região tem **5 biomas**:

| Bioma | Tipos que moram nele |
|---|---|
| 🌿 **Campos Verdes** | Grass, Bug, Normal, Electric, Poison |
| 🌊 **Mar Profundo** (subaquático) | Water, Ice |
| 🌋 **Vulcão** | Fire |
| ⛰️ **Caverna Rochosa** | Rock, Ground, Fighting, Dragon, Fairy, Steel |
| 👻 **Torre Assombrada** | Ghost, Psychic, Dark |

### Cada Pokémon mora em UM bioma só
O bioma é o do **tipo principal** do Pokémon. Exemplo: Gastly é Ghost/Poison, então mora na Torre. Se o tipo principal não tiver bioma, vale o segundo tipo.

**Exceções:** quando uma linha evolutiva tem exceção, ela vai inteira junto:

| Linha | Bioma |
|---|---|
| Porygon → Porygon2 → Porygon-Z | Torre Assombrada |
| Zubat → Golbat → Crobat | Caverna Rochosa |
| Grimer → Muk | Vulcão |
| Koffing → Weezing | Vulcão |
| Dratini → Dragonair → Dragonite | Mar Profundo |

### Mapas
- Cada bioma tem um mapa próprio, visto de cima, no estilo dos jogos de GBA/DS.
- No canto do mapa há **atalhos** para pular direto para os outros biomas.
- O Mar Profundo é **subaquático**: algas, corais, feixes de luz e bolhas.

> ℹ️ A lista de tipos por bioma acima é a configuração atual e pode mudar.

---

## 3. Encontros selvagens

### 3.1 Todo passo tem um Pokémon
- **Cada passo, em qualquer chão**, gera um encontro. Não precisa estar no mato.
- O encontro aparece num **cartão no canto do mapa**, e o jogo não para.
- **Enter** (ou o botão **Lutar**) começa a batalha.
- **Continuar andando** foge do encontro, sem custo nenhum.

### 3.2 Nível dos selvagens
O nível depende do **seu nível de treinador** e é igual em todos os biomas:

- **Teto** = 5 × nível de treinador, no máximo 100.
- **Faixa** = do teto − 4 até o teto (5 níveis).
- Exemplos: treinador nível 1 → selvagens do nível 1 ao 5; nível 2 → 6 ao 10; nível 20 → 96 ao 100.

Na aba **Opções** (barra do topo) você escolhe um teto **menor** (nunca maior), para caçar Pokémon de nível baixo.

### 3.3 Cada forma tem a sua faixa de nível
A forma que aparece depende do nível:

- **Charmander:** nível 1–15
- **Charmeleon:** nível 16–35
- **Charizard:** nível 36–100

A faixa segue o nível de evolução oficial.

**Formas que evoluem por pedra, troca ou amizade não aparecem soltas** (Raichu, Alakazam, Gengar, Eeveelutions…). Para tê-las, é preciso evoluir. A forma anterior delas aparece até o nível 100.

---

## 4. Raridade e chances

### 4.1 O sorteio é por LINHA EVOLUTIVA
Um encontro é sorteado em 3 etapas:

1. Sai uma **linha evolutiva** (ex.: Caterpie → Metapod → Butterfree).
2. Sai um **nível**, dentro da faixa.
3. O nível decide **qual forma** aparece.

Ou seja, Caterpie, Metapod e Butterfree **dividem a mesma chance**.

### 4.2 Chances parecidas entre os comuns
Este é um jogo de **captura em massa**: cada Pokémon pode vir com IVs, natureza e habilidade diferentes. Por isso, a raridade original pesa pouco:

- **Peso da linha** = 100 + (taxa de captura da forma base × 0,3).
- Na prática, a linha mais comum sai, no máximo, cerca de **1,8 vez** mais que a mais rara.

### 4.3 Categorias raras: chance fixa por encontro
Algumas categorias ficam fora desse sorteio por peso. Cada uma tem uma **chance total fixa**. Se cair nela, o jogo sorteia qual Pokémon da categoria aparece, com chance igual entre os do bioma.

| Categoria | Chance total por encontro | Nível |
|---|---|---|
| **Iniciais** (e evoluções) | 1 em 10.000 | faixa normal |
| **Lendários** | 1 em 20.000 | 50 ou mais |
| **Míticos** | 1 em 20.000 | 50 ou mais |
| **Ultra Beasts** | 1 em 20.000 | 50 ou mais |

> Exemplo: no Mar Profundo de Hoenn moram Regice e Kyogre. A chance de "aparecer um lendário" é 1 em 20 mil. Se sair, é metade para cada um.

Lendários podem aparecer **desde o treinador nível 1**, mas sempre no nível 50 ou mais.

### 4.4 Shiny
- **Chance:** 1 em 1.500 por encontro.
- **IVs:** um shiny nasce com IVs de **15 a 31** em cada atributo. Os normais vão de 0 a 31.

### 4.5 Onde ver as chances
No mapa, o painel **"Pokémon deste bioma"** mostra cada morador como um botãozinho:

- **Porcentagem:** mostra a chance de aparecer agora, na sua faixa de nível.
- **Pokébola no canto:** você já capturou.
- **Botão apagado:** nunca foi visto. Cinza: aparece em outra faixa de nível.
- **Clicar:** mostra a ficha curta, se já foi visto ou capturado, e um atalho para a Pokédex.

---

## 5. Nível de treinador

- **Níveis:** de 1 a 20, separado do nível dos Pokémon.
- **Como ganha XP:** o treinador ganha o **mesmo XP** que o Pokémon em campo ganha ao **derrotar ou capturar**. Derrota e fuga não dão XP.
- **Curva:** subir do nível *n* custa 262 × *n*^3,8 XP. O começo é rápido e o final é bem pesado (o nível 20 é para quem joga muito).
- **Efeito:** o nível de treinador define o teto dos selvagens (veja a [seção 3.2](#32-nível-dos-selvagens)).

---

## 6. Batalha

- **Motor:** as batalhas rodam no **simulador do Pokémon Showdown**, com as regras da 9ª geração. Dano, habilidades, itens, clima e status funcionam como nos jogos oficiais.
- **Selvagem:** escolhe um golpe aleatório entre os disponíveis.
- **Fuga:** usa a fórmula da 3ª/4ª geração. Se falhar, o selvagem ataca.
- **PP:** sem PP Up. O máximo é o PP base do golpe.
- **HP, status e PP continuam entre batalhas.** Para recuperar, use o **Centro Pokémon** ou remédios.
- **Derrota:** o time inteiro é curado e você volta ao menu da região.
- **Informações:** passar o mouse num golpe mostra poder, precisão, PP, categoria, prioridade e descrição. Passar o mouse no selvagem mostra o resumo dele; a habilidade só aparece depois de ser revelada na luta.

---

## 7. Captura

### 7.1 Fórmula
- A chance de captura usa a **fórmula da 3ª/4ª geração**, a mesma do site Pokémon Database. Com Poké Ball e HP cheio, ela fica perto de *taxa de captura ÷ 3 ÷ 255*.
- **Bônus de status:** dormindo ou congelado ×2,5; paralisado, envenenado ou queimado ×1,5.
- Ao arremessar, o jogo mostra a **chance de captura** daquele arremesso.
- A Pokédex mostra a **captura base** de cada espécie (Poké Ball, HP cheio).

### 7.2 Pokébolas
São 25 Pokébolas, com os efeitos dos jogos:

| Bola | Efeito |
|---|---|
| Master Ball | captura garantida |
| Quick Ball | forte no 1º turno |
| Timer Ball | melhora a cada turno |
| Dusk Ball | forte na Caverna e na Torre |
| Dive Ball e Lure Ball | fortes no Mar Profundo |
| Net Ball | forte contra Water e Bug |
| Nest Ball | forte contra nível baixo |
| Heal Ball | cura o Pokémon capturado |

Level, Love, Moon, Heavy, Fast, Repeat e Dream Ball funcionam como nos jogos.

### 7.3 Depois da captura
- O Pokémon capturado vai para o **time** se houver vaga; senão, vai para o **PC**.
- **Capturar também dá XP e EVs** para quem lutou, igual a uma vitória.

---

## 8. Experiência, níveis e evolução

- **Sem Exp. Share:** XP e EVs vão **só para quem entrou em campo** naquela batalha.
- **Fórmula de XP:** da 7ª geração em diante.
- **Vários níveis de uma vez** aparecem como **uma mensagem só**, com o nível final.
- **Golpes novos:** com menos de 4 golpes, o Pokémon aprende sozinho. Com 4, você escolhe qual esquecer (ou desiste). O golpe novo aparece colorido, e passar o mouse mostra o que ele faz.
- **Evolução:**
  - por nível: acontece no fim da batalha;
  - por pedra, troca, amizade etc.: usa o item na Bolsa. A **Linking Cord** substitui a troca; se a troca exige um item, o Pokémon precisa estar segurando esse item.

---

## 9. IVs ocultos

Os IVs de um Pokémon capturado **começam escondidos** ("?" na ficha). Há dois jeitos de revelar:

| Pagamento | O que mostra | Preço (provisório) |
|---|---|---|
| **Silver** | a **faixa** de cada IV: 0–5, 6–10, 11–15, 16–20, 21–25 ou 26–31 | 100 silver |
| **Gold** | o **valor exato** de cada IV | 1 gold |

- Depois de pagar com silver, ainda dá para pagar com gold para ver o valor exato.
- A revelação é **permanente**: vale para aquele Pokémon para sempre.
- O inicial já vem com os IVs revelados (IV 20).

### Tier do Pokémon
Todo Pokémon capturado ganha um **tier** pela **soma dos 6 IVs** (de 0 a 186). Ele aparece na ficha, no resumo ao passar o mouse e na mensagem de captura, mesmo com os IVs ainda ocultos:

| Tier | Soma dos IVs |
|---|---|
| **S+** | 171 a 186 |
| **S** | 145 a 170 |
| **A** | 120 a 144 |
| **B** | 95 a 119 |
| **C** | 70 a 94 |
| **D** | 45 a 69 |
| **E** | 20 a 44 |
| **F** | 0 a 19 |

O inicial (IV 20 em tudo, soma 120) é sempre **A**.

---

## 10. Time, PC e o Pokémon que te segue

### 10.1 Time
- **Tamanho:** até **6 Pokémon**.
- **Ordem:** arraste para mudar. O **primeiro** entra na batalha e anda atrás de você.
- **Informações:** clicar abre a **ficha completa** (atributos, IVs, EVs, natureza, habilidade, item e golpes). Passar o mouse mostra um resumo.

### 10.2 PC
- **Espaço:** **20 boxes de 30 Pokémon** (600 vagas).
- **Arrastar:** entre o time, as boxes e as abas das boxes.
- **Soltar** um Pokémon pede confirmação, porque não tem volta.
- **Tirar item** devolve o item equipado para a bolsa.

### 10.3 O Pokémon que te segue
- O primeiro do time anda atrás de você no mapa, com **sombra** e **animação de andar em 8 direções**.
- **Shiny:** se o seu Pokémon é shiny, quem te segue também aparece shiny.
- **Pokémon grandes** ficam 2 passos atrás, para não "entrar" no treinador.
- 961 das 1025 espécies têm animação. As que não têm aparecem com a imagem de batalha, balançando.

---

## 11. Moedas: Silver e Gold

| Moeda | Como ganha | Para que serve |
|---|---|---|
| 🪙 **Silver** | começa com 1.000 · +10 por vitória (provisório) | loja, revelar faixas de IV |
| 🟡 **Gold** | moeda **paga** (no futuro); hoje só pelo Admin | revelar IVs exatos e, no futuro, mais coisas |

As duas aparecem **separadas na carteira**, acima do painel do treinador.

> ⚠️ A economia ainda é provisória. Hoje **todo item da loja custa 1 silver**, só para testes.

---

## 12. Loja e Bolsa

### 12.1 Loja
| Aba | O que tem |
|---|---|
| **Pokébolas** | as 25 bolas |
| **Remédios** | Potions, Revives, curas de status, Ethers/Elixirs, Sacred Ash… |
| **Evolução** | pedras, Linking Cord, maçãs, armaduras, Dragon Scale e outros itens de evoluir |
| **Itens de batalha** | itens padrão da 9ª geração (sem frutas, plates, memories, itens exclusivos de lendários, itens de EV/IV e itens sem uso em batalha) |
| **TMs** | as de Scarlet/Violet |
| **TRs** | as de Sword/Shield |

### 12.2 Bolsa
| Tipo de item | O que fazer |
|---|---|
| **Remédios** | usar (dentro ou fora da batalha; Sacred Ash só fora) |
| **Evolução** | usar e evoluir |
| **Itens de batalha** | equipar (o item anterior volta para a bolsa); frutas comidas somem no fim da batalha |
| **TMs/TRs** | ensinar, se o Pokémon puder aprender; são gastas ao usar |
| **Especiais** | itens de forma que **não são vendidos** (ex.: Blue Orb); equipar |
| **Tickets** | abrir (veja a [seção 13](#13-tickets)) |

---

## 13. Tickets

Itens **raros**, para que certos prêmios não sejam algo que todo mundo tem.

### Como funciona
1. **Abrir:** abra o ticket na Bolsa.
2. **Raridade:** uma roleta passa pelos prêmios e para na raridade sorteada:

| Raridade | Cor na roleta | Chance |
|---|---|---|
| Comum | ⚪ branco | 70% |
| Raro | 🔵 azul | 22% |
| Épico | 🟣 roxo | 7% |
| Lendário | 🟠 laranja | 1% |

3. **Prêmio:** dentro da raridade, sai um **pacote**, com chance igual entre os pacotes. Um pacote pode trazer vários itens juntos.

### Como conseguir
- **1 chance em 1.000** a cada vitória ou captura.
- Também pelo painel Admin, durante os testes.

### Tickets existentes
**🎟️ Ticket de Kyogre**
- **Lendário:** Kyogre nível 50, com **5% de chance de vir shiny**, junto com a **Blue Orb**, que transforma o Kyogre em **Primal Kyogre** na batalha.
- **Outras raridades:** rascunho para testes (bolas, remédios, silver, Master Ball…).

---

## 14. Pokédex e Database

### Pokédex
- **Visto e não visto:** você só vê nome, imagem e dados de quem **já viu**. Os outros aparecem como silhueta "???".
- **Capturados:** ganham uma Pokébola na lista.
- **Ficha da espécie:**
  - imagem normal, shiny e de costas;
  - atributos e habilidades;
  - dano recebido por tipo;
  - evolução, golpes por nível, TMs/TRs e Egg Moves;
  - **onde encontrar** (região, bioma, faixa de nível ou como evolui) e **captura base**.
- **Filtros:** região, tipo e categoria (Comum, Incomum, Raro, Inicial, Bebê, Lendário, Mítico, Ultra Beast, Paradoxo).

### Database
- **Tabelas:** Pokémon, itens, habilidades e golpes, com busca, ordenação e filtros.
- **Tiers:** **provisoriamente**, são os do Smogon/Showdown, até definirmos os nossos.

---

## 15. Comunidade

A aba **Comunidade**, na barra do topo, já existe com **Amigos** e **Clã**. As duas ficam **"em breve"**, porque dependem de contas e do servidor online.

---

## 16. Créditos

O jogo usa trabalho de muita gente. Os créditos completos estão em `CREDITOS.md`:

| O que | De onde | Licença |
|---|---|---|
| Dados e imagens de Pokémon | PokéAPI | — |
| Motor de batalha | Pokémon Showdown (`@pkmn/sim`) | MIT |
| Tilesets do mapa | Tuxemon (Buch e outros) | CC-BY-SA |
| Personagem | Universal LPC Spritesheet Character Generator | CC-BY-SA / GPL / OGA-BY |
| Pokémon que te segue | PMD SpriteCollab | **CC BY-NC**, uso não comercial |

Wallpapers, boné, estampas e Pokébolas do cinto são desenho próprio. Pokémon é marca da Nintendo, Game Freak e The Pokémon Company; este é um projeto de fãs.

---

## 17. Histórico de versões

### v0.1 — Protótipo local (5 e 6 de outubro de 2026)

**Base do jogo**
- Todas as 9 regiões (Pokémon 1 a 1025) e os 5 biomas por região, com mapas gerados.
- Encontro a cada passo, num cartão que não trava o jogo.
- Batalhas pelo simulador do Showdown, com captura, fuga, XP, EVs, golpes novos e evolução.
- Nível de treinador (1–20) controlando o nível dos selvagens (5 níveis de selvagens por nível de treinador).

**Início do jogo**
- Criação de personagem (LPC) com nome de treinador e detalhes Pokémon.
- Roleta com os 27 iniciais; o inicial vem com IV 20 e selo NT.

**Encontros e raridade**
- Sorteio por linha evolutiva, com chances parecidas entre os comuns.
- Categorias raras com chance fixa: iniciais 1/10 mil; lendários, míticos e Ultra Beasts 1/20 mil cada.
- Shiny 1/1500, com IVs de 15 a 31.
- Captura pela fórmula da 3ª/4ª geração, com a chance mostrada a cada arremesso.

**Pokémon e economia**
- IVs ocultos: faixa com silver, valor exato com gold. Tier do Pokémon (S+ a F) pela soma dos IVs.
- Moedas silver e gold, separadas na carteira.
- Loja completa (bolas, remédios, evolução, itens de batalha, TMs, TRs) e bolsa com usar, equipar e ensinar.
- Sistema de Tickets com roleta de raridades; primeiro ticket: Kyogre.
- Time com arrastar, PC com 20 boxes e ficha completa do Pokémon.
- Pokémon que te segue animado em 8 direções, com sombra.

**Telas e visual**
- Pokédex com descoberta (só mostra quem foi visto) e Database com tabelas e filtros.
- Wallpapers calmos no menu e um diferente para cada bioma.
- Janelas semitransparentes.
- Cartão de informações dos golpes ao passar o mouse.
- Aba Comunidade (Amigos e Clã em breve) e aba Opções (nome de treinador, nome real, nome no mapa, teto dos encontros).
- Câmera do mapa com zoom fixo.
- Painel Admin para testes: chances, Pokémon forçado, moedas, tickets e Pokédex revelada.

---

## 18. Ideias para o futuro

> Ideias que já conversamos. Nada aqui é promessa de data; é o nosso mapa.

### 🌐 Online
- **Contas e login** antes da criação do personagem.
- **Save na nuvem.**
- **Servidor:** sorteios e batalhas rodando no servidor, para ninguém trapacear.
- **Lista de amigos:** ver quem está online e em qual bioma, convidar para batalhas e trocas.
- **Clãs:** nome, emblema, cargos, chat e ranking entre clãs.
- **Trocas entre jogadores**, respeitando o selo **NT** (o inicial nunca pode ser trocado).

### 🏆 Torneios — o foco principal
- Torneios online simultâneos, cada jogador com o seu time.
- Regras, formatos e ranqueamento ainda a definir.
- **Tiers próprios do jogo**, no lugar dos tiers provisórios do Smogon.

### 🎟️ Tickets
- Tickets para outros lendários com item de forma: **Groudon** (Red Orb → Primal), **Rayquaza**, **Giratina** (Griseous Orb/Core → Origin) e mais.
- Definir os prêmios de comum, raro e épico de cada ticket.
- Mostrar o **desenho da forma Primal/Origin** na batalha (hoje a forma muda nos atributos, mas não na imagem).

### 🧢 Personagem
- **Boné de treinador** com logo de Pokébola (guardado para refazer com mais capricho).
- Mais roupas e acessórios Pokémon: mochila, luvas, estampas de outros Pokémon.
- Itens de visual exclusivos (eventos, tickets, gold).

### ⚖️ Economia
- Definir os preços reais da loja e quanto silver cada vitória dá.
- Definir o que o **gold** compra (além de revelar IVs).
- Rever as licenças antes de qualquer cobrança: os sprites do Pokémon que te segue são **não comerciais**.

### 🎮 Jogabilidade
- **Exp. Share**, como item ou opção.
- Insígnias e desafios.
- Sprites que faltam para o Pokémon que te segue (64 espécies), quando o SpriteCollab lançar.
- Ajustes finos de bioma, chances e níveis conforme os testes.

### 📱 Plataformas e comunidade
- **Discord oficial** do jogo, com canais de anúncios, regras, sugestões, bugs e torneios. Este livro vira os posts fixos de lá.
- **Bot do Discord** que avisa quando sai atualização (usando o Histórico de versões acima).
- **App de celular** (Capacitor) e **app de PC** (Electron/Tauri).

---

*Mantido por nós dois: a cada mudança no jogo, este livro é atualizado junto.* ✨
