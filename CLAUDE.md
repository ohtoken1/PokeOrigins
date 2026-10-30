# PokeOrigins — MMO de Pokémon no navegador

O dono do projeto não é programador: explique decisões em português simples e teste no navegador antes de dizer que algo funciona. Respostas **curtas**.

**Detalhe de cada sistema:** `docs/sistemas/*.md` (ler o arquivo do sistema ANTES de mexer nele; ao mudar algo importante, atualizar lá, não aqui). Este arquivo guarda só regras de trabalho, decisões do dono e armadilhas.

| Arquivo | O que tem |
|---|---|
| `jogo-base.md` | visão, mapas/biomas, encontros, cidade, níveis de treinador e de Pokémon, trancas, evoluções especiais, celular, estrutura, comandos |
| `servidor-e-online.md` | contas, save, `/ws`, amigos, banco/câmbio, trem, guildas, trocas, correio, letreiro, banimentos, admin (Dar Pokémon, Administradores, Ginásios 3 dificuldades, Biomas, Tiers, Prêmios), parcerias, dashboard, pré-registro |
| `batalha-e-pvp.md` | motor (Showdown), animações, Mega/Z/Dynamax/Tera, NPCs, ginásios, professores de golpes, PvP, Torneio, Ranqueado, Liga, tiers, voltar à batalha |
| `itens-loja-economia.md` | loja/bolsa, itens e formas, tickets/Orbs, cubos, ovos, craft/canteiros/Daycare, Mercado negro, economia e preços, moedas, Suspeito, doação, recompensas de login, lojas especiais |
| `eventos.md` | Outbreak, Cofre, Loteria, Expedição, Ninho, Evento de captura, Bosses, Safari, Quadro de missões, temas dos eventos |
| `jogador-e-interface.md` | conquistas/títulos, skins, ranking, tutorial do Professor, Guia, atalhos, avisos/dicas/roleta, logo e tema |
| `idiomas.md` | traduções de descrições e o sistema de idiomas (pt/en/es) |
| `historico-correcoes.md` | correções do Closed Beta (histórico) |

**Livro de Regras (`LIVRO-DE-REGRAS.md`):** documento para jogadores/Discord. Mudou regra/número/sistema → atualizar a seção e o "Histórico de versões". Ideias novas do dono → **Banco de Ideias** (artifact https://claude.ai/artifact/HmZUUAxtgDjExnTVrziBQf, coleção `ideias`: titulo, descricao, categoria, status ideia|vamos-fazer|fazendo|em-espera|concluido|nao-vamos, criadoEm, atualizadoEm); concluiu algo da lista → marcar lá.

## Regras de trabalho
- Testes no navegador **sempre com o jogo no mudo**. Teste de API/online: **cópia do banco** (servidor de teste na porta 3011 com `BANCO_ARQUIVO`, Vite de teste na 5174), contas `tst…` criadas pela API, tudo apagado no fim; nunca derrubar 3001/5173 nem mexer na conta ADM (id 1).
- **Nunca `alert`/`confirm`/`prompt`:** aviso = `avisar(texto, 'info'|'erro'|'ok')` (`ui/avisos.ts`); pergunta = `await confirmar(titulo, texto)` (`ui/confirmar.ts`). Gastar item/moeda que não volta → `confirmar` (remédio e item de segurar não perguntam).
- Commit só quando o dono pedir. Arquivo de trabalho que não vai para o git → `fora_github/`.
- Todo sistema novo nasce com as **decisões no servidor** (sorteio, batalha, prêmio). Quando não der, avisar o dono do que ficou no navegador.
- **Trancas de nível:** a cada conteúdo novo o dono diz se quer tranca (`shared/trancas.ts`); não inventar. Tranca nova = lição nova em `LICOES` do tutorial.
- Texto novo visível: escrever em português; depois `npm run idiomas`, traduzir num `.tsv` de `scripts/idiomas/` e `node scripts/idiomas-juntar.mjs` (ver `idiomas.md`). Descrição nova em `traducoes.json` precisa da linha em espanhol.
- Regra/número mudou → atualizar o tópico do **Guia** (`client/src/guiaConteudo.ts`) e o Livro de Regras.

## Idioma e nomes (regra do dono)
- Texto ao jogador em **português**. Em inglês: nomes de Pokémon, golpes, itens, Abilities, Natures, **tipos** e atributos. Descrições do Showdown/PokéAPI sempre traduzidas (`traduzir()`); nunca mostrar descrição em inglês.
- Moedas: o jogador lê **Poké Dólar** (silver) e **Origin Coin** (gold); no código continuam `silver`/`gold`. Texto com moeda: `nomeDaMoeda`; preço/saldo: a moedinha (`valorEmMoeda`). Nunca escrever "silver"/"gold" para o jogador.
- Clã = **guilda** para o jogador (código continua `cla`). Creche = **Daycare**. Tickets de prêmio = **Orbs** (código `ticket-*`). "Sexo" na criação de personagem (código `corpo`).
- Código, nomes e comentários em português (sem acento em identificadores). Regras de jogo ficam em `shared/` como constantes fáceis de ajustar.

## Visual (regras do dono)
- **Preto e dourado:** usar as variáveis do `:root` (`--fundo`, `--painel`, `--borda`, `--texto`, `--destaque`…); nunca azul-marinho à mão.
- Botão parado **marrom**; **dourado** (`--dourado`) com mouse/foco/apertado e no selecionado. Botões com cor própria (perigo, gold, batalha, cura) mantêm a cor.
- Nada de emoji nos menus (ícones de `ui/icones.ts`). Sprites de Pokémon na mesma escala, só fator inteiro.
- **Celular:** nada mais largo que a tela (estica a página e as janelas fixas saem da tela); abaixo de 760 px a barra vira ☰. Fala com tecla/clique no tutorial: versão de toque com `noAparelho`.
- `title` vira dica do jogo sozinho; `data-item="<id>"` mostra o cartão do item; cartões de "passar o mouse" já funcionam no toque longo.

## Armadilhas técnicas (não esquecer)
- **Save em memória único** (`emMemoria` em `estado.ts`): `carregarSave()` devolve sempre o mesmo objeto; nunca trabalhar com cópia do localStorage. Depois de ação no servidor: `salvarAgora()` antes e `adotarSaveDoServidor(save, versao)` depois (mesmo objeto). Janela que segura Pokémon confere `estaNoSave` antes de agir.
- **Um único `Phaser.Game`** reaproveitado (`jogo/jogoUnico.ts`); nunca criar um Game por mapa. Com `.batalha-fundo` aberta o Phaser dorme.
- Imagem passada por **variável CSS** precisa de endereço completo (`new URL(..., document.baseURI)`), senão some no site publicado.
- **Servidor** roda TypeScript direto (Node 24, sem enum/parameter properties; imports com `.ts`). Ele roda o código do jogo pela ponte `server/src/motorDoJogo.ts` (os scripts `dev`/`start` precisam de `--experimental-transform-types --import ./src/importarShared.mjs`). Arquivo de `shared/` lido pelo servidor: imports com `./x.ts` ou nenhum import. Checar tipos: `cd server && npx tsc --noEmit -p .` e `cd client && npx tsc --noEmit -p .`.
- Aviso novo do servidor no `/ws` precisa entrar na lista de `online.ts` que repassa para `aoAvisoDoServidor`. Tarefa automática nova (`setInterval`) passa por `tarefaSegura`.
- **Adversário no motor:** nunca usar a posição em `p2.pokemon` como posição no time (o simulador reordena). Sorteio dentro de batalha do navegador usa o `aleatorio` do motor (a batalha é refeita pela semente ao recarregar), nunca `Math.random`.
- **Só o servidor sobe** Origin Coins, VIP, títulos, pacotes, NT e o Passe (`server/src/protecaoSave.ts` no `PUT /api/save`). Prêmio novo com isso: entregar pelo servidor (Correio `correio.enviar` ou rota própria), nunca no navegador.
- **Nada por cima da batalha:** pop-up que aparece sozinho passa por `depoisDaBatalha`; janelas automáticas (Professor, Prêmios de hoje, conquista) se esperam com `quandoLivre` (`ui/semBatalha.ts`).
- **PC cheio:** mecânica nova que dá Pokémon confere `cabemPokemons` (servidor: `cabePokemon`/`guardarPokemon`) antes de gastar. Nunca usar número fixo de boxes (`numeroDeBoxes`).
- **Limite de nível pelo treinador:** quem passa do limite não entra no time (`podeUsar`); servidor manda para o PC.
- Batalha nova no navegador: passar `contexto` (volta depois de recarregar, `batalha/retomada.ts`); de treinador: `avisoFuga`. PvP/NPC no servidor: `criarBatalhaPve`/`criarBatalha` em `server/src/pvp.ts`, time conferido por `problemasDeLegalidade`.
- Windows/PowerShell: depois de instalar algo, o PATH pode precisar ser recarregado.

## "Faça sempre" ao criar coisa nova
- Mecânica nova que dá Pokémon → marcar `obtido` (ver "Obtido em" em `jogo-base.md`).
- Lugar/NPC na cidade → `LUGARES` (`ui/lugaresCidade.ts`). Tela que é lugar do jogo → `lembrarLugar`. Tela com o time → `acompanharTime`/`colunaDoTime`.
- Evento novo → `EVENTOS` + tema no CSS (`ui/temaEvento.ts`) + emblema (`ui/emblemaEvento.ts`); prêmio ajustável → `shared/premiosEventos.ts` + editor em `telas/adminPremios.ts`.
- Atalho → `ACOES_TECLA`/`ATALHOS`. Fatia de roleta → `iconeDaFatia`. Skin nova → `ARTES` (prévia aprovada pelo dono). Orb nova → `ORBS`. Título novo → `VISUAIS`. Item consumível na loja → `ITENS_DE_USO_UNICO`. Mega Stone nova → `VALOR_MEGA_STONE`. Bioma novo → `BIOMAS`, `PALETAS`, `FUNDOS_BATALHA`.
- Item, golpe ou Pokémon novo com descrição → tradução (pt e es).

## Decisões do dono que valem para tudo
- Inicial: ovo com chance igual entre os 27, IVs 20, NT. Chances fixas por encontro (inicial 1/12 mil, lendário/mítico/UB 1/20 mil, shiny 1/1500); bônus de shiny **somam**, os outros multiplicam.
- Cada Pokémon mora num bioma só (o do tipo principal; exceções em `BIOMA_FIXO`). Todo passo tem encontro, sorteado só quando o jogador para (anti-macro).
- IVs de capturados ocultos até "Avaliar IVs"; avaliado: VIP vê exato, não-VIP vê faixa (vale na ficha, Mercado e troca). NT e trancado não trocam nem vendem.
- Troca, Mercado, Correio, lojas especiais, Liga, PvP, Torneio, Ranqueado, Boss e quadro de missões são decididos no servidor. Ainda no navegador: batalhas de selvagem/NPC, XP do passe, Poké Dólares, bolsa/craft/Daycare/Expedição.
- Conta comum só muda de região pelo trem e chega aos mapas pela saída sul da cidade; staff tem atalhos e o painel ⚙ Admin.
- Não citar os Pokémon sem jeito de obter (Toxtricity Low Key, Keldeo Resolute, Greninja Battle Bond) a menos que o dono pergunte.
- Divulgação cita só o Open Beta.

## Comandos
- `npm run dev` — jogo em http://localhost:5173 + servidor na 3001
- `npm run start` — só o servidor (produção entrega `client/dist` depois de `npm run build`)
- `npm run admin -- <usuario>` — dá administrador (`-- <usuario> nao` tira)
- `npm run build` — checa tipos e gera `client/dist`
- `npm run dados -- <regiao|todas>` — dados da PokéAPI · `npm run idiomas` — textos sem tradução

## Estrutura
- `client/` jogo (Vite + TypeScript + Phaser 3): telas HTML/CSS em `src/telas` e `src/ui`, mapa em `src/jogo`, batalha em `src/batalha`.
- `shared/` regras e dados usados pelo jogo e pelo servidor (`shared/data/` = JSON da PokéAPI, traduções, idiomas).
- `server/` Node puro + `node:sqlite` (`server/dados/pokeorigins.db`, fora do git; no Railway pode virar PostgreSQL só em `banco.ts`).
- `scripts/` dados, idiomas, prints do Guia. `docs/sistemas/` detalhe dos sistemas. `fora_github/` prévias, planilhas, relatórios (fora do git).
