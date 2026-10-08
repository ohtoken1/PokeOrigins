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
- Cada Pokémon da roleta tem um fundo da cor do seu tipo (Fire vermelho, Water azul, Grass verde).

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
- **Fundo de batalha:** sorteado a cada luta entre os cenários do bioma (imagens dos jogos oficiais).
- **Estágios de atributo** (+1 Attack, −2 Speed…) aparecem como etiquetas junto da caixa de HP de cada Pokémon e somem quando ele sai de campo.
- **Clima e terreno** aparecem na arena: chuva caindo, sol forte, tempestade de areia, neve; terreno elétrico, de grama, de névoa ou psíquico no chão.
- **Duração:** no canto esquerdo de cima, embaixo da caixa do selvagem, aparece o clima e o terreno em campo com os **turnos que faltam** (5 turnos normalmente; 8 com Damp Rock, Heat Rock etc. ou Terrain Extender; os climas Primal não acabam sozinhos).
- **Terastal:** uma vez por batalha, o botão **Terastalizar (tipo)** no menu de golpes faz o Pokémon virar o **Tera Type** dele antes de atacar (troca o Tera Type com Tera Shards). Ao terastalizar, aparece uma **aba TERA** com o tipo ao lado direito do Pokémon e ele ganha um brilho de cristal; some quando ele sai de campo.
- **Informações:** passar o mouse num golpe mostra poder, precisão, PP, categoria, prioridade e descrição. Passar o mouse no selvagem mostra o resumo dele; a habilidade só aparece depois de ser revelada na luta.
- **Registro e turnos:** à direita da janela de batalha fica o **Registro da batalha**, com tudo o que aconteceu em cada turno (ex.: "Deoxys usou Zen Headbutt e causou 150 de dano (53,4% da vida)"); à esquerda, o **contador de turnos**. Em telas estreitas o registro vai para baixo da janela.
- **Dano:** depois de cada golpe, a mensagem da batalha diz quanto HP o alvo perdeu e quanto isso é da vida máxima.
- **Ficha do seu Pokémon:** passar o mouse no seu Pokémon (ou na caixa de HP dele) mostra HP máximo, Attack, Defense, Sp. Atk, Sp. Def, Speed, Nature, Ability, item, amizade, Tera Type e golpes.
- **Itens segurados (held items):** o item que o Pokémon segura funciona na batalha como nos jogos (Leftovers, Focus Sash, Choice Scarf, frutas…), e a batalha avisa quando ele age. Itens gastos voltam no fim da batalha; **frutas comidas somem**.
- **Z-Moves:** quem segura um **Z-Crystal** ganha o botão **Z-Move** no menu de golpes. Ligado, os golpes viram Z-Moves (ex.: Thunder Shock → Gigavolt Havoc, poder 100). **Uma vez por batalha.**
- **Formas por item:** Giratina com Griseous Core entra na Origin Forme; Dialga/Palkia com Adamant Crystal/Lustrous Globe também; Arceus muda de tipo com Plates ou Z-Crystals de tipo; Silvally com Memories; Genesect com Drives; Ogerpon com as máscaras. Kyogre e Groudon fazem a **Primal Reversion** com Blue/Red Orb, e Zacian/Zamazenta viram Crowned com Rusted Sword/Shield. A imagem na batalha muda junto.

---

### 6.1 Duelos com treinadores (Jogar → Duelos com treinadores)
- Um treinador é **sorteado entre 50 personagens** dos jogos e do anime (sem líderes de ginásio): rivais (Silver, Wally, Barry, Hop…), Elite Four (Lorelei, Bruno, Agatha, Will, Koga, Karen…), chefes de equipes vilãs (Maxie, Archie, Cyrus, Lysandre, N, Ghetsis…), campeões (Lance, Blue, Red, Steven, Wallace, Cynthia, Leon…) e Ash. Os times seguem os dos jogos/anime. O botão **Sortear outro** troca o treinador; embaixo há a lista de todos.
- **Nível:** a **média dos níveis do seu time**. As formas voltam para a evolução certa daquele nível (ex.: Garchomp no Nv. 20 vira Gible).
- **Tamanho do time dele:** o mesmo número de Pokémon do seu time (+1 nos muito difíceis e lendários), usando os mais fortes do time dele.
- **Sem EVs.** IVs baixos e iguais em todos os atributos, pela força do treinador:

| Dificuldade | Estrelas | IVs | Recompensa (provisória) |
|---|---|---|---|
| Fácil | ★ | 5 | 100 silver |
| Normal | ★★ | 6 | 200 silver |
| Difícil | ★★★ | 8 | 400 silver |
| Muito difícil (Elite Four, chefes) | ★★★★ | 9 | 700 silver |
| Lendário (campeões, Ghetsis, Ash) | ★★★★★ | 10 | 1.000 silver |

- **Regras do duelo:** não dá para fugir nem jogar Pokébola. O treinador manda o próximo Pokémon quando um desmaia. Na maioria das vezes ele escolhe o golpe que mais machuca (tipo, STAB e poder).
- **Vitória:** silver da dificuldade (com bônus de VIP e da administração), XP e EVs de **todos** os Pokémon dele para quem lutou, XP de treinador e amizade +5. **Derrota:** o time é curado, sem recompensa.

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
  - por nível: acontece no fim da batalha, e você pode **deixar evoluir** ou **parar a evolução** (ela é oferecida de novo no próximo nível);
  - por **amizade**: ao subir de nível com amizade **160 ou mais** (Golbat → Crobat, Pichu → Pikachu…). Os que dependem da hora usam o relógio do computador: Eevee vira **Espeon de dia (6h–18h)** e **Umbreon à noite**;
  - por pedra, troca etc.: usa o item na Bolsa. A **Linking Cord** substitui a troca; se a troca exige um item, o Pokémon precisa estar segurando esse item.

### 8.1 Amizade
- Vai de **0 a 255**. Todo Pokémon começa com **50**.
- Sobe **+5 a cada batalha** em que o Pokémon entra em campo (contra selvagens e, quando existirem, treinadores NPC), seja qual for o resultado.
- A ficha mostra uma barrinha e uma frase: "Ainda desconfiado" (0–49), "Está se acostumando com você" (50–99), "Gosta de você" (100–149), "Gosta muito de você" (150–199), "Muito apegado a você" (200–254), "Melhores amigos!" (255).
- Golpes como Return e Frustration usam a amizade.

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
Todo Pokémon ganha um **tier** pela **soma dos 6 IVs** (de 0 a 186). O tier só aparece **depois da avaliação** (silver ou gold), na ficha e no resumo ao passar o mouse:

| Tier | Soma dos IVs |
|---|---|
| **S+** | 171 a 186 |
| **S** | 145 a 170 |
| **A** | 120 a 144 |
| **B** | 95 a 119 |
| **C** | 94 ou menos |

O inicial (IV 20 em tudo, soma 120) é sempre **A**.

---

## 10. Time, PC e o Pokémon que te segue

### 10.1 Time
- **Tamanho:** até **6 Pokémon**.
- **Ordem:** arraste para mudar. O **primeiro** entra na batalha e anda atrás de você.
- **Informações:** clicar abre a **ficha completa** (atributos, IVs, EVs, natureza, habilidade, item, amizade, Tera Type e golpes). Passar o mouse mostra um resumo.
- **Item segurado:** aparece como um ícone pequeno no canto do cartão do Pokémon. Para dar um item, use **Equipar** na Bolsa; para tirar, use o PC.

### 10.2 PC
- **Espaço:** **20 boxes de 30 Pokémon** (600 vagas).
- **Arrastar:** entre o time, as boxes e as abas das boxes.
- **Soltar** um Pokémon pede confirmação, porque não tem volta.
- **Soltar vários:** segure o clique num Pokémon para marcá-lo; depois, cada clique marca ou desmarca outros. O botão "Soltar N" solta todos juntos (com confirmação). O time precisa ficar com pelo menos 1.
- **Tirar item** devolve o item equipado para a bolsa.

### 10.3 O Pokémon que te segue
- O primeiro do time anda atrás de você no mapa, com **sombra** e **animação de andar em 8 direções**.
- **Shiny:** se o seu Pokémon é shiny, quem te segue também aparece shiny.
- **Pokémon grandes** ficam 2 passos atrás, para não "entrar" no treinador.
- 961 das 1025 espécies têm animação. As que não têm aparecem com a imagem de batalha, balançando.

### 10.4 Professores de golpes (aba Golpes)
Na barra do topo, a aba **Golpes** tem dois professores. Escolha o Pokémon do time e o golpe; se ele já souber 4, você escolhe qual esquecer.

| Professor | O que ensina | Preço (provisório) |
|---|---|---|
| **Move Reminder** | qualquer golpe que a espécie aprende **por nível** até o nível atual, inclusive os esquecidos | 50 silver |
| **Move Tutor** | só os golpes de **tutor**, de **qualquer geração** dos jogos (inclusive os das formas anteriores); TMs e Egg Moves não entram | 100 silver |

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
| **Itens de batalha** | itens de batalha de todas as gerações (incensos, Thick Club, Leek…), sem os que ficam fora da loja |
| **TMs** | as de Scarlet/Violet |
| **TRs** | as de Sword/Shield |

**Fora da loja** (por enquanto só pelo Admin e por tickets): **Berries**, **Gems**, **Plates**, **Memories**, **Z-Crystals**, **Itens de lendários** (orbes, Griseous Core, Adamant Crystal, Lustrous Globe, Rusted Sword/Shield, Drives, máscaras da Ogerpon, Soul Dew…) e **Tera Shards**. Ficam fora do jogo: Mega Stones (a Mega Evolução ainda não existe), fósseis, cartas, Bottle Caps e itens sem uso.

### 12.2 Bolsa
| Tipo de item | O que fazer |
|---|---|
| **Remédios** | usar (dentro ou fora da batalha; Sacred Ash só fora) |
| **Evolução** | usar e evoluir |
| **Itens de batalha** | equipar (o item anterior volta para a bolsa); frutas comidas somem no fim da batalha |
| **TMs/TRs** | ensinar, se o Pokémon puder aprender; são gastas ao usar |
| **Berries, Gems, Plates, Memories, Z-Crystals, Itens de lendários** | equipar |
| **Tera Shards** | junte **50 do mesmo tipo** e use num Pokémon para trocar o **Tera Type** dele (como em Scarlet/Violet) |
| **Tickets** | abrir (veja a [seção 13](#13-tickets)) |

---

## 13. Tickets

Itens **raros**, para que certos prêmios não sejam algo que todo mundo tem.

### Como funciona
1. **Abrir:** abra o ticket na Bolsa. Uma roleta passa pelos prêmios e para no sorteado.
2. **Cada prêmio tem a sua chance** (do total). A cor na roleta mostra a raridade.
3. **Abrir vários:** os botões **×3 e ×5** abrem vários de uma vez (vale também para chocar ovos). Aparece **uma roleta por tentativa**, uma em cima da outra, e cada uma para no seu prêmio; embaixo aparecem todos os prêmios.
4. **Na janela do ticket:** "Chances" mostra o total de cada raridade, e "Prêmios possíveis" mostra cada prêmio com a sua porcentagem.

| Raridade | Cor na roleta | Chance total |
|---|---|---|
| Comum | ⚪ branco | 70% |
| Raro | 🔵 azul | 24% |
| Épico | 🟣 roxo | 5% |
| Lendário | 🟠 laranja | 1% |

### Como conseguir
- **1 chance em 1.000** a cada vitória ou captura (o ticket é sorteado entre todos).
- Também pelo painel Admin, durante os testes.

### Prêmios iguais em quase todos os tickets
| Raridade | Prêmio | Chance |
|---|---|---|
| Comum | 4× Tera Shard (tipo aleatório) | 70% |
| Raro | 30 gold | 6% |
| Raro | 1 dia de VIP | 6% |
| Raro | 50× Pokébola aleatória (qualquer uma, menos Master Ball) | 6% |
| Raro | 500.000 silver | 6% |
| Épico | 100 gold | 1% |
| Épico | 7 dias de VIP | 1% |
| Épico | 1× Master Ball | 1% |
| Épico | 1.000.000 silver | 1% |
| Épico | 1× Ovo Misterioso A | 1% |

### Lendário de cada ticket (1% no total, dividido por igual)
Os Pokémon vêm no **nível 50**, com **5% de chance de shiny** e **cada IV de 15 a 31** (Arceus: de 10 a 31).

| Ticket | Prêmios lendários |
|---|---|
| **Ticket de Kyogre** | Kyogre, Blue Orb, Skin Kyogre, Skin Kyogre Shiny (0,25% cada) |
| **Ticket de Groudon** | Groudon, Red Orb, Skin Groudon, Skin Groudon Shiny (0,25% cada) |
| **Ticket de Giratina** | Giratina, Griseous Core, Skin Giratina, Skin Giratina Shiny (0,25% cada) |
| **Ticket de Hoopa** | Hoopa, Prison Bottle, Skin Hoopa, Skin Hoopa Shiny (0,25% cada) |
| **Ticket de Dialga** | Dialga, Adamant Crystal, Skin Dialga, Skin Dialga Shiny (0,25% cada) |
| **Ticket de Palkia** | Palkia, Lustrous Globe, Skin Palkia, Skin Palkia Shiny (0,25% cada) |
| **Ticket de Arceus** | Arceus com IVs 10+ (1%). **Épico diferente:** uma Plate aleatória (5%); sem os outros épicos |
| **Ticket Therian** | Landorus, Thundurus, Tornadus, Enamorus e Reveal Glass (0,2% cada) |
| **Ticket de Kyurem** | Kyurem, DNA Splicers, Skin Kyurem, Skin Kyurem Shiny (0,25% cada) |
| **Ticket de Zacian** | Zacian, Rusted Sword, Skin Zacian, Skin Zacian Shiny (0,25% cada) |
| **Ticket de Zamazenta** | Zamazenta, Rusted Shield, Skin Zamazenta, Skin Zamazenta Shiny (0,25% cada) |
| **Ticket de Ogerpon** | Ogerpon, Teal Mask, Hearthflame Mask, Wellspring Mask, Cornerstone Mask (0,2% cada) |

**Skins** e os itens **Prison Bottle, DNA Splicers, Reveal Glass e Teal Mask** são itens nossos: por enquanto só existem na Bolsa (abas Skins e Itens-chave). A utilidade deles vem depois. As formas Therian, Unbound e Black/White Kyurem ainda não existem no jogo.

### VIP
- Um **bônus na sua conta por um tempo** (1 dia, 7 dias…). Ganhar mais VIP com ele ativo **soma** ao tempo que falta.
- Enquanto está ativo, aparece um selo **VIP** com o tempo restante embaixo da carteira.
- **Os bônus ainda vão ser definidos** (hoje o VIP não muda nada). Já está preparado para dar mais silver por vitória e mais XP de treinador.
- Quando existirem contas, o VIP fica guardado na conta.

### Ovos
Itens raros da aba **Ovos** da Bolsa. Ao **chocar**, uma roleta passa pelos Pokémon possíveis e para no sorteado:

| Ovo | Quem nasce | O que garante |
|---|---|---|
| **Ovo Misterioso S** | qualquer Pokémon | IVs de tier **S ou superior** (soma 145+) |
| **Ovo Misterioso A** | qualquer Pokémon | IVs de tier **A ou superior** (soma 120+) |
| **Ovo Lendário** | um lendário, mítico ou Ultra Beast, **só a primeira forma da linha** (Cosmog e não Lunala; Type: Null e não Silvally; Meltan e não Melmetal) | IVs normais |
| **Ovo Inicial** | um dos 27 iniciais | IVs normais |

- **Chance igual** para todos do grupo do ovo (nos Misteriosos: comum, lendário, mítico, Ultra Beast…).
- **5% de chance de shiny.**
- O Pokémon nasce no **nível 1** e vai para o time (ou para o PC, se o time estiver cheio).
- Os IVs continuam ocultos até a avaliação, mas o tier mínimo é garantido.
- Saem dos tickets (Ovo Misterioso A no épico) e do painel Admin (testes; Ovo Lendário e Ovo Inicial por enquanto só pelo Admin). Na roleta do **Ovo Inicial**, cada Pokémon tem o fundo da cor do seu tipo. Nas outras roletas de ovos, o fundo mostra a categoria: **lendário laranja, mítico roxo, Ultra Beast vermelho**, os outros branco.

---

## 14. Pokédex e Database

### Pokédex
- **Visto e não visto:** você só vê nome, imagem e dados de quem **já viu**. Os outros aparecem como silhueta "???".
- **Capturados:** ganham uma Pokébola na lista.
- **Ficha da espécie:**
  - imagem normal, shiny e de costas;
  - atributos e habilidades;
  - dano recebido por tipo;
  - evolução, golpes por nível, TMs/TRs, Egg Moves e golpes do **Move Tutor**;
  - **onde encontrar** (região, bioma, faixa de nível ou como evolui) e **captura base**;
  - **chance de aparição** por encontro (ou **chance do lendário**, nos lendários, míticos e Ultra Beasts) e **chance de shiny**, em porcentagem e em "1 em N" (ex.: 0,005% = 1 em 20.000). Valem para o seu nível de treinador atual e já contam os bônus ativos.
- **Filtros:** região, tipo e categoria (Comum, Incomum, Raro, Inicial, Bebê, Lendário, Mítico, Ultra Beast, Paradoxo).

### Database
- **Tabelas:** Pokémon, itens, habilidades e golpes, com busca, ordenação e filtros.
- **Itens:** mostra **todos os itens do jogo**, inclusive os de fora da loja. Filtros por categoria (Pokébolas, Remédios, Evolução, Itens de batalha, Berries, Gems, Plates, Memories, Z-Crystals, Itens de lendários, Tera Shards…) e por "vendidos na loja" ou "fora da loja".
- **Tiers:** **provisoriamente**, são os do Smogon/Showdown, até definirmos os nossos.

---

## 15. Comunidade

A barra do topo tem:
- **Início**: a primeira tela ao abrir o jogo, com o seu **time lado a lado** (com nível, tipos, HP e item; clique para ver a ficha) e, embaixo, o **Passe de batalha** (Temporada 1, 30 níveis com trilha grátis e premium; cada nível pede **100 XP do passe** (barra 0 / 100 XP); botão **Missões** com as missões diárias, semanais e da temporada que vão dar XP do passe; mecânica, missões e recompensas **em breve**);
- **Jogar**: Mapas (regiões e biomas), **Duelos com treinadores**, **Cidade**, **Continentes** e **Ginásios** (os três últimos "em breve");
- **Golpes**: Move Reminder e Move Tutor;
- **Informações**: Ranking e Database;
- **Minha conta**: **Meu perfil** (nível, Pokédex, capturas e time; botão para editar o personagem), **Achievements** (10 conquistas com progresso: capturas, shiny, lendário, Pokédex, time completo, nível de treinador, silver; recompensas em breve), **Minhas skins** (as skins que você ganha vão para cá, não para a Bolsa) e **Opções**;
- **Comunidade**: **Buscar jogadores** (digite o nome de um treinador para ver o perfil: nível, Pokédex, capturas e time; sem servidor, só encontra você mesmo), **Amigos** e **Clã** (os dois **"em breve"**, porque dependem de contas e do servidor online);
- **Administração** (só para contas de administrador; enquanto não há contas, aparece para todos): **Bonificação** e, em breve, **Log** (tudo o que entra e sai no jogo, para achar abuso de bug), Jogadores, Eventos e Anúncios.

### Cabeçalho fixo
Embaixo da barra do topo fica um **cabeçalho** que acompanha todas as telas, inclusive o mapa do bioma (só some na criação do personagem e na roleta do inicial): o **ícone da Pokédex** (atalho) com quanto você já capturou da Pokédex da região (ex.: 1/151 · 0,7%), nome do treinador, **VIP** ou não, nível e barra de XP de treinador, **região** atual, **insígnias** (0/8 até os ginásios existirem), os **selos dos bônus ativos** (ex.: "Silver 1,5x", "XP 2x", "Shiny 2x"; só informam), **silver** e **gold**, e, logo abaixo dele à direita, os atalhos em **botões redondos estilo Pokébola** (pretos, com borda e faixa brancas e o desenho do destino no centro; o nome aparece ao passar o mouse) : **Centro Pokémon** (cura o time), **Pokémarket**, **Bolsa**, **PC** e **Mapas**.

### Bonificação
A administração pode multiplicar, para todos os jogadores, de **1x até 3x** (1x, 1,5x, 2x, 2,5x, 3x):

| Bônus | O que muda |
|---|---|
| **Silver** | silver ganho por vitória |
| **XP** | experiência dos Pokémon e do treinador |
| **Aparição de shiny** | chance de um selvagem ser shiny (ex.: 3x → 1 em 500) |
| **Aparição de lendário** | chance de lendários, míticos e Ultra Beasts |

Com algum bônus ligado, aparecem **selos** no cabeçalho (ex.: "Shiny 2x", "XP 2x"), em todas as telas e mapas. Ele soma com o VIP (multiplica junto). Por enquanto fica guardado só no navegador; com o servidor, vale para todo mundo.

### Ranking
A aba **Ranking**, na barra do topo, tem 8 rankings. **Por enquanto só você aparece**: a lista com todos os jogadores precisa do servidor online.

| Ranking | O que conta |
|---|---|
| **Geral** | pontos (provisório): 1 por captura, 25 por shiny, 50 por lendário, 100 por nível de treinador, 200 por medalha de torneio. Silver e gold não contam |
| **Capturas** | Pokémon capturados em batalha (ovos e tickets não contam) |
| **Capturas shiny** | shiny capturados em batalha |
| **Lendários** | lendários, míticos e Ultra Beasts capturados em batalha |
| **Nível** | nível de treinador (empate: quem tem mais XP) |
| **Medalhas de torneio** | em breve, junto com os torneios |
| **Silver** | silver na carteira |
| **Gold** | gold na carteira |

Em saves antigos, a contagem começou pelos Pokémon que você já tinha (menos o inicial).

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
- IVs ocultos: faixa com silver, valor exato com gold. Tier do Pokémon (S+ a C) pela soma dos IVs, visível depois da avaliação.
- Moedas silver e gold, separadas na carteira.
- Loja completa (bolas, remédios, evolução, itens de batalha, TMs, TRs) e bolsa com usar, equipar e ensinar.
- Sistema de Tickets com roleta de raridades; primeiro ticket: Kyogre.
- Ovos Misteriosos S e A: qualquer Pokémon com IVs garantidos e 5% de shiny.
- Ícone da Pokédex no cabeçalho, ao lado do nome, com o progresso da Pokédex; barra do passe com 0 / 100 XP por nível.
- Duelos com treinadores: 50 treinadores dos jogos e do anime, nível da média do seu time, recompensa em silver por dificuldade; registro da batalha com os avisos no fim da frase do golpe.
- Aba Minha conta (Meu perfil, Achievements, Minhas skins, Opções); chances de aparição, de lendário e de shiny na Pokédex.
- Cabeçalho maior com selos dos bônus ativos e atalhos estilo Pokébola; passe de batalha com 30 níveis e botão Missões.
- Cabeçalho fixo com informações do treinador e atalhos; Passe de batalha (vitrine) na tela de Início; Log na Administração (em breve).
- Aba Administração com Bonificação (silver, XP, shiny e lendário de 1x a 3x); Buscar jogadores na Comunidade.
- Batalha: registro dos turnos com o dano de cada golpe, contador de turnos e ficha do seu Pokémon ao passar o mouse.
- Tela de Início com o time lado a lado (aba Início na barra do topo).
- Cartões dos biomas com o cenário de batalha do bioma em cima e a parte do texto transparente.
- Barra do topo reorganizada: ícone da Pokédex, Jogar (Mapas, Duelos, Ginásios), Informações (Opções, Ranking, Database).
- Roletas de ovos: Ultra Beast com fundo vermelho e mítico com fundo roxo.
- Tickets Lendário e Inicial removidos; roleta do Ovo Inicial com fundo da cor do tipo.
- Abrir tickets e chocar ovos de 1, 3 ou 5 de uma vez (uma roleta por tentativa, empilhadas); Ovo Lendário com míticos e Ultra Beasts (só a primeira forma da linha).
- Terastal na batalha, duração de clima e terreno no canto da arena, imagens das Tera Shards guardadas no jogo.
- Tickets da planilha do dono: 14 tickets (Kyogre, Groudon, Giratina, Hoopa, Dialga, Palkia, Arceus, Therian, Kyurem, Zacian, Zamazenta, Ogerpon, Lendário, Inicial) com a chance de cada prêmio; skins e itens-chave; Ovo Lendário e Ovo Inicial; pré-sistema de VIP.
- Time com arrastar, PC com 20 boxes e ficha completa do Pokémon.
- Pokémon que te segue animado em 8 direções, com sombra.

**Telas e visual**
- Pokédex com descoberta (só mostra quem foi visto) e Database com tabelas e filtros.
- Wallpapers calmos no menu e um diferente para cada bioma.
- Janelas semitransparentes.
- Cartão de informações dos golpes ao passar o mouse.
- Aba Golpes (Relembrador e Tutor), soltar vários Pokémon de uma vez no PC.
- Roleta do inicial com fundo da cor do tipo de cada Pokémon.
- Professores renomeados para Move Reminder e Move Tutor; o Move Tutor agora ensina só golpes de tutor (sem TMs nem Egg Moves).
- Pokédex mostra os golpes do Move Tutor; aba Ranking (geral, capturas, shiny, lendários, nível, medalhas, silver e gold).
- Todos os itens do jogo (Berries, Gems, Plates, Memories, Z-Crystals, itens de lendários, Tera Shards) na Database com filtros; Z-Moves; formas por item (Giratina-Origin, Arceus…); amizade (+5 por batalha) e evolução por amizade; Tera Type; ícone do item segurado no cartão.
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
- Utilidade das **skins** e dos itens Prison Bottle, DNA Splicers, Reveal Glass e Teal Mask (formas Unbound, Black/White Kyurem, Therian).
- Definir os **bônus do VIP**.

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
