// Conteúdo do Guia do jogo (botão "?" da barra do topo, pedido do dono): como funcionam os SISTEMAS do PokeOrigins
// (eventos, trem, ginásios, bônus, gachas…). Não explica golpes nem Pokémon. Separado em grupos → tópicos.
// Regra: quando um número ou regra mudar no jogo, atualizar o tópico aqui também.
// Cada linha de `texto` é um parágrafo; linha que começa com "• " vira item de lista.

import type { ConteudoTrancado } from '../../shared/trancas';

export interface TopicoGuia {
  id: string;
  /** travas de nível do sistema (o selo no topo do tópico lê o nível de shared/trancas.ts) */
  trancas?: { conteudo: ConteudoTrancado; rotulo?: string }[];
  titulo: string;
  emoji: string;
  texto: string[];
}
export interface GrupoGuia {
  id: string;
  nome: string;
  emoji: string;
  descricao: string;
  topicos: TopicoGuia[];
}

export const GUIA: GrupoGuia[] = [
  {
    id: 'comeco', nome: 'Primeiros passos', emoji: '🌱', descricao: 'O básico para começar a jornada.',
    topicos: [
      { id: 'inicio', emoji: '🥚', titulo: 'Começo da jornada', texto: [
        'Toda conta nova ganha um Ovo de Inicial: ao abrir, ele choca um dos 27 iniciais de todas as regiões, sorteado com a mesma chance, e depois você escolhe em qual região começar.',
        'O inicial vem com IVs altos e é NT (não negociável): não pode ser trocado nem vendido.',
        'Ao fechar a introdução do Professor Carvalho, você ganha um Kit iniciante (conquista Conhecedor). Abra-o pela Bolsa para receber Pokébolas, remédios, Poké Dólares, uma skin e um Charm.',
      ] },
      { id: 'treinador', emoji: '⭐', titulo: 'Nível de treinador', texto: [
        'Seu nível de treinador vai do 1 ao 25. Você ganha o mesmo XP que o seu Pokémon ganha ao derrotar ou capturar.',
        '• Os Pokémon selvagens aparecem até 5 vezes o seu nível de treinador (máximo nível 100).',
        '• Até o treinador nível 10, seus Pokémon só podem estar no time até 10 vezes o seu nível de treinador. Quem passar disso vai para o PC e para de ganhar XP.',
        '• Vários conteúdos só abrem a partir de um nível de treinador (aparece "🔒 Requer treinador nível X").',
      ] },
      { id: 'mapas', emoji: '🗺️', titulo: 'Cidade e mapas', texto: [
        'A cidade é onde ficam a loja, o Centro Pokémon, a estação de trem, a Arena e os NPCs. Clique no nome de um lugar para usar, ou no minimapa para andar até ele.',
        'Para caçar, saia pela saída do sul da cidade e escolha um dos 6 biomas da sua região. Cada Pokémon mora no bioma do seu tipo.',
      ] },
      { id: 'encontros', emoji: '🌿', titulo: 'Encontros e captura', texto: [
        'Nos mapas, cada passo pode trazer um Pokémon. O encontro aparece quando você PARA de andar: andar de novo foge, Enter (ou o botão) começa a batalha.',
        '• Shiny: 1 em 1.500 encontros.',
        '• Algum inicial: 1 em 12.000. Algum lendário, algum mítico e alguma Ultra Beast: 1 em 20.000 cada.',
        '• Os bônus (VIP, skins, títulos, guilda, Charms…) aumentam essas chances.',
        'Selvagens não dão Poké Dólares, mas dão XP e, às vezes, uma Energy do tipo deles (10%) ou uma Orb (rara).',
      ] },
      { id: 'ivs', emoji: '🔍', titulo: 'IVs e avaliação', texto: [
        'Os IVs dos Pokémon capturados ficam ocultos. Na ficha do Pokémon, use "Avaliar IVs" para revelar.',
        '• Preço: 5.000 Poké Dólares (VIP: 3.000).',
        '• Quem não é VIP vê a faixa de cada IV (0–5, 6–10… 26–31). VIP vê o valor exato.',
        '• Depois de avaliado, o Pokémon ganha um selo de tier pela soma dos IVs: C, B, A, S ou S+.',
      ] },
      { id: 'centro', emoji: '❤️', titulo: 'Centro Pokémon', texto: [
        'O coração do cabeçalho ou o Centro Pokémon da cidade abrem a máquina de cura. Ela cura todo o time de graça em 5 segundos (VIP: 2 segundos).',
        'HP, status e PP continuam entre uma batalha e outra até você curar.',
      ] },
      { id: 'moedas', emoji: '💰', titulo: 'Moedas', texto: [
        '• Poké Dólar: a moeda do dia a dia. Ganha vencendo treinadores, ginásios, eventos e vendendo no Mercado negro.',
        '• Origin Coin: a moeda especial. Vem de missões do quadro, conquistas, eventos e doações.',
        '• Fragmentos Temporais: usados na loja do Viajante do tempo.',
        '• League Coins: prêmio da Liga Pokémon.',
      ] },
      { id: 'nt', emoji: '🔒', titulo: 'NT (não negociável)', texto: [
        'Pokémon e itens marcados como NT não podem ser trocados nem vendidos no Mercado negro. Exemplos: o inicial, o que vem do Kit iniciante e os prêmios da trilha grátis do passe.',
        'Você também pode TRANCAR um Pokémon no PC para não soltá-lo nem trocá-lo por engano.',
      ] },
    ],
  },
  {
    id: 'sistemas', nome: 'Sistemas', emoji: '⚙️', descricao: 'Trem, ginásios, loja, trocas, guildas e mais.',
    topicos: [
      { id: 'trem', emoji: '🚆', titulo: 'Viagem de trem, Fly e Surf', texto: [
        'Para mudar de região, vá à estação de trem da cidade e escolha o destino.',
        '• Ticket: 1.000 Poké Dólares por região de distância (Kanto → Johto = 1, Kanto → Paldea = 8).',
        '• Tempo: 30 segundos por região de distância.',
        '• VIP: metade do tempo e metade do preço.',
        '• Fly ou Surf: se um Pokémon do seu time sabe Fly ou Surf, você pode usá-lo na estação. É de graça e leva o mesmo tempo do trem.',
        'Durante a viagem você pode usar a cidade normalmente, mas os mapas e ginásios só abrem quando chegar.',
      ] },
      { id: 'ginasios', emoji: '🏅', titulo: 'Ginásios', texto: [
        'Cada região tem 8 líderes de ginásio, na Arena da cidade. Você só desafia os da região onde está.',
        '• Ordem: é preciso vencer os líderes anteriores antes de desafiar o próximo.',
        '• Nível: os Pokémon do líder vêm no nível do Pokémon mais alto do seu time.',
        '• Prêmio: a insígnia e Poké Dólares (só na primeira vitória).',
      ] },
      { id: 'duelos', emoji: '⚔️', titulo: 'Duelos com treinadores', texto: [
        'Na Arena você enfrenta treinadores de dificuldade 1 a 5. É a principal forma de ganhar Poké Dólares e pode ser repetido.',
        '• O time do treinador é montado na hora de batalhar, no nível médio do seu time.',
        '• Quanto maior a dificuldade e o time dele, maior o prêmio.',
        '• Fugir de uma batalha de treinador conta como derrota.',
      ] },
      { id: 'pvp', emoji: '🤺', titulo: 'Duelo contra jogadores (PvP)', texto: [
        'Clique em outro jogador no mapa e escolha "Desafiar para duelo". A batalha é calculada no servidor, com os dois times curados.',
        '• Cada turno tem 60 segundos. Quem não escolher perde.',
        '• Se a página recarregar, você volta para a batalha.',
        '• Em Opções você escolhe se aceita convites de duelo.',
      ] },
      { id: 'loja', emoji: '🛒', titulo: 'Pokémarket e Bolsa', texto: [
        'O Pokémarket da cidade vende Pokébolas, remédios, itens de evolução, itens de batalha e TMs/TRs. VIP paga 20% menos.',
        'Loja do dia (aba do Pokémarket): 4 Mega Stones e 1 Z-Crystal sorteados todo dia à meia-noite (horário de Brasília), cada um por 300 Origin Coins. As Mega Stones também ficam nas lojas da Liga (janela da Liga Pokémon): as das Megas RU e UU na Loja da Liga (League Coins) e as das Megas OU e Ubers na Loja Nightmare (League Coins Nightmare).',
        'Na Bolsa você usa, equipa ou abre os itens. Itens de segurar vão para a batalha com o Pokémon.',
      ] },
      { id: 'pc', emoji: '💻', titulo: 'PC', texto: [
        'O PC guarda seus Pokémon em boxes de 50. Arraste entre o time e as boxes, renomeie as boxes e troque o fundo.',
        '• Começa com 15 boxes; o item Box Pokémon (loja) dá mais uma, até 30.',
        '• Trancar impede soltar e trocar o Pokémon.',
        '• Segure o clique para marcar vários e soltar de uma vez.',
      ] },
      { id: 'professores', emoji: '📚', titulo: 'Professores de golpes', texto: [
        '• Move Reminder: ensina de novo golpes que o Pokémon já aprendeu (por nível, TM, tutor…).',
        '• Move Tutor: ensina golpes de tutor.',
        'Cada golpe custa 5.000 Poké Dólares.',
      ] },
      { id: 'trocas', trancas: [{ conteudo: 'troca' }], emoji: '🔄', titulo: 'Trocas', texto: [
        'Clique em outro jogador no mapa e escolha "Trocar". Cada um monta a oferta (Pokémon, itens e moedas) e confirma.',
        '• Confirmar é definitivo: depois só dá para Trocar ou Cancelar.',
        '• Pokémon NT, trancados e ovos não podem ser trocados. Você fica sempre com pelo menos 1 Pokémon no time.',
        '• O servidor confere tudo antes de fazer a troca.',
      ] },
      { id: 'mercado', trancas: [{ conteudo: 'mercadoNegro' }], emoji: '🕶️', titulo: 'Mercado negro', texto: [
        'NPC da cidade onde os jogadores anunciam Pokémon, itens e Origin Coins à venda. Abre no treinador nível 7.',
        '• O vendedor escolhe o preço em Poké Dólares ou Origin Coins.',
        '• Taxa de 5% sobre a venda. Até 10 anúncios por jogador, cada um vale 1 dia.',
        '• O comprador só vê tier e IVs do que já foi avaliado.',
        '• O pagamento (ou o anúncio vencido) volta para você automaticamente.',
      ] },
      { id: 'guildas', trancas: [{ conteudo: 'guilda' }], emoji: '🛡️', titulo: 'Guildas', texto: [
        'Abre no treinador nível 11. Entre numa guilda ou crie a sua (100 Origin Coins).',
        '• Até 5 membros. Cargos: líder, vice-líder e membro.',
        '• A guilda ganha XP quando os membros derrotam ou capturam selvagens e vencem treinadores.',
        '• Cada nível (até o 10) dá bônus para todos os membros: shiny, raros, XP e Poké Dólares.',
        '• A guilda tem chat próprio e bandeira personalizada.',
        '• Loja da guilda (botão na tela da guilda): paga em Pontos de guilda, ganhos no Boss da guilda. A loja é a mesma para todos e troca todo mês; os limites de compra zeram no dia 1º. Tem o inicial do mês (20 pontos, 1 por mês), Mint aleatória (6, até 5), Charm aleatório (5, até 10), 10 Tera Shards de um tipo sorteado (5, até 10) e packs de 10 Pokébolas da Artesã (1 ponto, até 10 de cada).',
      ] },
      { id: 'amigos', emoji: '👥', titulo: 'Amigos e chat', texto: [
        'Em Comunidade → Amigos você adiciona jogadores e conversa em particular.',
        'O chat do mapa tem as abas Local (quem está no mesmo mapa), Global (todos online), Guilda e Amigos.',
      ] },
      { id: 'correio', emoji: '✉️', titulo: 'Correio', texto: [
        'Prêmios de eventos, presentes e avisos da equipe chegam como cartas no envelope do cabeçalho.',
        'Os anexos só entram na sua conta quando você clica em Resgatar. Se o PC estiver cheio, nada muda até você abrir espaço.',
      ] },
      { id: 'login', trancas: [{ conteudo: 'loginBoasVindas', rotulo: 'Boas-vindas' }, { conteudo: 'loginTrinta', rotulo: '30 dias' }], emoji: '🎁', titulo: 'Recompensas de login', texto: [
        'Prêmios só por entrar no jogo. Acompanhe em Minha conta → Recompensas; os prêmios chegam pelo Correio e são todos NT.',
        '• Login de boas-vindas: nos 7 primeiros dias da sua conta, cada dia em que você entra vale o prêmio seguinte da lista.',
        '• Login dos 30 dias: nos 30 primeiros dias do servidor, cada dia tem o seu prêmio. Entrou naquele dia, ganha; não entrou, perde.',
        '• VIP recupera até 3 dias perdidos do login dos 30 dias.',
      ] },
      { id: 'quadro', emoji: '📋', titulo: 'Quadro de missões', texto: [
        'A cada 2 horas entram 2 missões novas, e cada uma fica 12 horas no quadro. A missão pede um Pokémon de certa espécie com Nature, IV e qualidade específicos.',
        '• Cada missão só pode ser concluída por UM jogador do servidor: quem chegar primeiro.',
        '• O Pokémon não é entregue, só mostrado.',
        '• Prêmio em Origin Coins, de acordo com a qualidade pedida.',
      ] },
      { id: 'daycare', trancas: [{ conteudo: 'creche' }], emoji: '🥚', titulo: 'Daycare e ovos', texto: [
        'Abre no treinador nível 8. Deixe um casal compatível no Daycare (VIP: dois casais). A cada ciclo de 6 horas (VIP: 4 horas), há 15% de chance de sair um ovo. Saiu ovo, o ciclo para até você retirar.',
        'Quem pode cruzar:',
        '• Macho e fêmea com pelo menos um grupo de ovo em comum, ou qualquer Pokémon com um Ditto.',
        '• Não cruzam: lendários, míticos, Ultra Beasts, Paradoxos, Pokémon NT e os do grupo Undiscovered.',
        'O filhote:',
        '• Nasce na primeira forma da linha da MÃE (com Ditto, na do outro Pokémon), no nível 1.',
        '• IVs: cada atributo sai num valor entre o IV da mãe e o IV do pai − 4. Ex.: mãe 31 e pai 20 em Attack → o filhote fica entre 16 e 31.',
        '• Destiny Knot (segurado por um dos pais): 5 atributos herdam o IV exato de um dos pais (sem o −4) e o 6º é aleatório.',
        '• Everstone (segurada por um dos pais): o filhote herda a Nature desse pai.',
        '• Egg Moves: cada Egg Move que um dos pais sabe tem 50% de chance de passar para o filhote (até 4 golpes).',
        '• Shiny: 1% sem nenhum pai shiny, 10% com um pai shiny e 25% com os dois shiny.',
        'Chocar:',
        '• O ovo vai para o PC e choca sozinho depois de 1.000 passos nos mapas (cidade e biomas).',
        '• Com pressa? A moça do Daycare choca em 10 minutos por 20.000 Poké Dólares.',
        '• Retirar o casal antes do fim do ciclo perde o ciclo em andamento.',
      ] },
      { id: 'craft', trancas: [{ conteudo: 'canteiros', rotulo: 'Canteiros' }, { conteudo: 'craftBola', rotulo: 'Pokébolas' }, { conteudo: 'craftCharm', rotulo: 'Charms' }], emoji: '🔨', titulo: 'Artesã: craft e canteiros', texto: [
        '• Pokébolas (treinador 5): 2 Apricorns + Poké Dólares viram Pokébolas especiais.',
        '• Charms (treinador 15): Berries + Energies + Poké Dólares viram um Charm.',
        '• Canteiros (treinador 4): plante Berries e Apricorns. Regue para crescer; sem água o crescimento para, mas nada morre.',
      ] },
      { id: 'suspeito', trancas: [{ conteudo: 'suspeito' }], emoji: '🕵️', titulo: 'Homem Suspeito', texto: [
        'NPC sentado no campo de flores da cidade (treinador 9). Por Poké Dólares, ele reseta EVs, reseta o nível, desfaz a evolução ou separa Pokémon fundidos.',
      ] },
      { id: 'viajante', emoji: '⏳', titulo: 'Viajante do tempo e cubos', texto: [
        'O Viajante do tempo vende Cubos e a Chave Temporal por Fragmentos Temporais.',
        'Um Cubo transforma um Pokémon do seu time no Pokémon do passado ou do futuro ligado a ele, mantendo IVs, Nature e shiny.',
      ] },
      { id: 'passe', emoji: '🎟️', titulo: 'Passe de batalha', texto: [
        'O passe tem 30 níveis por temporada. Você ganha XP do passe com as missões diárias (iguais para todos).',
        '• Trilha grátis: prêmios NT.',
        '• Trilha premium: liberada pelo item Passe Premium.',
        'Clique numa casa para resgatar o prêmio. Temporada nova zera o progresso.',
      ] },
      { id: 'conquistas', emoji: '🏆', titulo: 'Conquistas e títulos', texto: [
        'Em Minha conta → Conquistas você acompanha o progresso. Ao concluir, clique em Resgatar para receber a recompensa.',
        'Algumas conquistas dão títulos, que aparecem no seu perfil e dão bônus enquanto estiverem em uso.',
      ] },
      { id: 'ranking', emoji: '📊', titulo: 'Ranking', texto: [
        'Em Comunidade → Ranking você vê os melhores do servidor em capturas, shiny, lendários, nível de treinador, missões e mais.',
      ] },
    ],
  },
  {
    id: 'eventos', nome: 'Eventos', emoji: '📅', descricao: 'Os eventos do servidor e quando acontecem.',
    topicos: [
      { id: 'outbreak', emoji: '🔥', titulo: 'Outbreak', texto: [
        'Todo dia às 15h e às 21h (horário de Brasília), durante 1 hora, uma espécie aparece em massa num mapa sorteado: metade dos encontros lá é dela.',
        'O aviso no canto da tela mostra onde está.',
      ] },
      { id: 'ninho', emoji: '🪺', titulo: 'Ninho', texto: [
        'A cada 20 minutos surge um ninho num mapa, com um Pokémon nível 150, por 10 minutos.',
        '• Entrada: 100.000 Poké Dólares (VIP: 50.000).',
        '• Vencer: 100.000 Poké Dólares e um giro na Roleta do Ninho. Se for lendário, 5% de chance de ganhar o Pokémon.',
        '• Cada derrota faz o ninho mudar de lugar e ganhar mais 5 minutos.',
      ] },
      { id: 'captura', emoji: '🎯', titulo: 'Evento de captura', texto: [
        'Quando a equipe abre o evento, uma espécie é sorteada e vale até a meia-noite. Capture-a nos mapas: conta a sua melhor soma de IVs.',
        'O primeiro lugar ganha um Ovo Lendário, 200.000 Poké Dólares e 50 Origin Coins.',
      ] },
      { id: 'cofre', emoji: '🔐', titulo: 'Cofre', texto: [
        'A equipe coloca um prêmio no cofre, protegido por uma senha de 3 dígitos. Quem acertar primeiro leva.',
        'Você pode tentar uma vez a cada 1,5 segundo.',
      ] },
      { id: 'loteria', emoji: '🎰', titulo: 'Loteria', texto: [
        'Bilhete de 1.000 Poké Dólares, com um número de 5 dígitos (até 100 bilhetes por dia). Metade do valor vai para o prêmio.',
        '• Vendas até 20h; sorteio às 20h05.',
        '• Ninguém acertou: o prêmio acumula.',
      ] },
      { id: 'expedicao', emoji: '🧭', titulo: 'Expedição', texto: [
        'Mande até 6 Pokémon numa expedição de 1, 3 ou 6 horas (entrada: 10.000 Poké Dólares; VIP: 5.000).',
        'Quanto maior o Power somado do grupo e mais longa a expedição, melhores os prêmios. Os prêmios são NT.',
      ] },
      { id: 'safari', trancas: [{ conteudo: 'safari' }], emoji: '🦒', titulo: 'Safari', texto: [
        'Abre no treinador nível 15. Você escolhe um tipo e passa por 3 salas com 10 Pokémon andando em cada uma. Clique em um para batalhar; os outros somem e a próxima sala abre.',
        '• 1 ticket por dia (VIP: 2). Dá para comprar mais um por dia com Origin Coins.',
        '• Os Pokémon do Safari têm IVs de tier A ou melhor, e shiny e raros aparecem 10 vezes mais.',
      ] },
      { id: 'boss', trancas: [{ conteudo: 'boss' }], emoji: '👹', titulo: 'Boss global e Boss da guilda', texto: [
        'A equipe solta um Boss nível 200 na gaiola da cidade por 2 horas. Abre no treinador nível 13. Cada jogador luta UMA vez, por até 50 turnos.',
        '• Vale o dano direto que você causar.',
        '• Boss global: todos que lutaram ganham. 1º: Chave Temporal + 500 mil Poké Dólares + 50 Origin Coins; 2º: 5 Fragmentos Temporais + 300 mil + 30 Origin Coins; 3º: 2 Fragmentos + 200 mil + 20 Origin Coins; 4º ao 10º: 100 mil; os outros: 50 mil.',
        '• Boss da guilda: soma o dano por guilda. Todo membro que lutou ganha 1 Ponto de guilda, mais 15 / 10 / 5 se a guilda ficou em 1º / 2º / 3º, ou mais 1 do 4º ao 10º.',
      ] },
      { id: 'torneio', trancas: [{ conteudo: 'torneio' }], emoji: '🏟️', titulo: 'Torneio', texto: [
        'Dois por dia, às 12h30 e às 18h30 (horário de Brasília). Abre no treinador nível 10.',
        '• A inscrição abre 10 minutos antes e custa 10.000 Poké Dólares.',
        '• Cada torneio tem regras próprias para o time (veja na janela do Torneio).',
        '• Chaveamento até a final, com disputa de 3º lugar. Batalhas no servidor.',
        '• Prêmios para os 3 primeiros, com medalhas e a Roleta do Torneio para o campeão.',
      ] },
      { id: 'ranqueado', emoji: '⚔️', titulo: 'PvP Ranqueado', texto: [
        'Na Arena da cidade. A fila abre duas vezes por dia, às 14h e às 21h (horário de Brasília), por 1 hora cada. Dá para jogar quantas partidas quiser nesse tempo; a batalha que começou pode passar do horário.',
        '• Cada tier tem o seu elo: Ubers, OU, UU e RU.',
        '• Elos: Poké Ball, Great Ball e Ultra Ball (3 divisões cada, de III até I, 100 pontos por divisão), Beast Ball (pontos corridos) e Master Ball.',
        '• Master Ball: só 3 vagas por tier, para os 3 com mais pontos da Beast Ball. Passou os pontos de um Master, toma o lugar dele.',
        '• A busca começa só na sua divisão e, a cada 30 segundos sem achar ninguém, abre mais uma divisão para cada lado.',
        '• Mesma divisão: vitória +20 pontos, derrota −15. Para cada divisão que o adversário está acima de você, +2 na vitória e −2 na derrota (abaixo de você, o contrário). Empate não muda nada.',
        '• Time de 6, sem espécie nem item repetido, Sleep Clause, 60 s por turno. Batalhas no servidor.',
        '• Mega Evolução, Z-Move e Terastal valem, mas só UMA delas por partida: usar uma segunda diferente = derrota.',
        'Seu elo aparece no seu perfil (escolha a tier) e em Comunidade → Ranking → PvP Ranqueado.',
      ] },
      { id: 'liga', trancas: [{ conteudo: 'liga' }], emoji: '👑', titulo: 'Liga Pokémon', texto: [
        'Abre no treinador nível 18, na Arena. Há duas Ligas:',
        '• Normal: Elite 4 (4 batalhas).',
        '• Nightmare: um treinador de cada tipo (18 batalhas).',
        'O desafio é feito de uma vez: seu time de 6 fica travado do começo ao fim e não é curado (só remédios entre as batalhas, na janela da Liga). As batalhas são em sequência: depois de cada vitória, a próxima começa sozinha em 3 minutos. 180 s por turno; se sair do jogo, a batalha continua e o tempo corre (acabou o tempo, perdeu).',
        'Uma tentativa por semana em cada Liga; a semana vira na segunda-feira. Cada treinador vencido dá 1 League Coin (Nightmare: 1 League Coin Nightmare), mesmo que você perca depois; tudo chega numa carta só no fim do desafio. Vencendo todos: +6 League Coins (total 10) ou +12 League Coins Nightmare (total 30), mais Poké Dólares. As moedas compram itens nas lojas da Liga: Mega Stones, Mints, Ability Capsule/Patch, Charms, ovos, Z-Crystals e Fragmentos (Liga) e Seletores, ovos lendários, Master Ball, Chave Temporal, Destiny Knot, itens de forma e o título Mestre Nightmare (Nightmare).',
      ] },
    ],
  },
  {
    id: 'bonus', nome: 'Bônus', emoji: '✨', descricao: 'De onde vêm os bônus e como eles se juntam.',
    topicos: [
      { id: 'como', emoji: '➕', titulo: 'Como os bônus se juntam', texto: [
        'Os bônus de shiny de todas as fontes SOMAM entre si.',
        'Os outros bônus (raros, Poké Dólares, XP e captura) se multiplicam entre as fontes.',
        'Passe o mouse nos selos do cabeçalho ou veja a Pokédex para conferir suas chances atuais.',
      ] },
      { id: 'vip', emoji: '💎', titulo: 'VIP', texto: [
        'O VIP dura alguns dias e dá, enquanto estiver ativo:',
        '• Mais shiny, raros, XP, captura e Poké Dólares.',
        '• 20% de desconto na loja.',
        '• Ver o valor exato dos IVs e avaliar mais barato.',
        '• Trem com metade do tempo e do preço; cura mais rápida.',
        '• Vantagens no Safari, Daycare, Ninho, Expedição e canteiros.',
      ] },
      { id: 'skins', emoji: '🎨', titulo: 'Skins', texto: [
        'Cada skin dá bônus (shiny, raros, Poké Dólares, captura e/ou XP). Em Minha conta → Minhas skins você escolhe separadamente o visual e de qual skin vem o bônus.',
        'Só vale o bônus de UMA skin por vez.',
      ] },
      { id: 'titulos', emoji: '🏷️', titulo: 'Títulos', texto: [
        'Títulos dão de 1% a 4% de bônus em shiny, raros, Poké Dólares e XP. Só conta o título que você estiver usando.',
      ] },
      { id: 'guilda', emoji: '🛡️', titulo: 'Guilda', texto: [
        'Cada nível da guilda dá +1% de bônus para todos os membros, até 5% em cada um no nível 10.',
      ] },
      { id: 'charms', emoji: '🔮', titulo: 'Charms', texto: [
        'Existe um Charm para cada tipo. Usado, ele aumenta a chance de shiny daquele tipo por 30 minutos.',
        'Dá para ter Charms de tipos diferentes ativos ao mesmo tempo.',
      ] },
      { id: 'conquistas', emoji: '🏆', titulo: 'Conquistas', texto: [
        'Muitas conquistas dão bônus permanentes (Poké Dólares, raros ou captura), que somam entre si depois de resgatadas.',
      ] },
      { id: 'lider', emoji: '🥇', titulo: 'Habilidade do primeiro do time', texto: [
        'A Ability do primeiro Pokémon do time muda os encontros, como nos jogos. Exemplos:',
        '• Static, Flash Fire, Magnet Pull…: mais encontros do tipo ligado à Ability.',
        '• Synchronize: mais selvagens com a mesma Nature.',
        '• Intimidate e Keen Eye: menos encontros com Pokémon bem mais fracos.',
      ] },
    ],
  },
  {
    id: 'gachas', nome: 'Gachas e prêmios', emoji: '🎁', descricao: 'Orbs, ovos, roletas e outras surpresas.',
    topicos: [
      { id: 'orbs', emoji: '🔮', titulo: 'Orbs', texto: [
        'As Orbs ficam na aba Orbs da Bolsa. Ao abrir, uma roleta sorteia o prêmio pela raridade:',
        '• Comum (70%): Pokébolas, Berries, Apricorns ou Energies.',
        '• Raro e Épico: itens melhores, Poké Dólares e Origin Coins.',
        '• Lendário (raríssimo): o Pokémon lendário da Orb, o item dele ou a skin.',
        '• Mítico (0,1% nas Orbs com skin): a skin shiny.',
        'As chances completas aparecem em "Prêmios possíveis" na janela da Orb. Dá para abrir 1, 3 ou 5 de uma vez.',
      ] },
      { id: 'ovos', emoji: '🥚', titulo: 'Ovos', texto: [
        '• Ovo Misterioso: qualquer Pokémon.',
        '• Ovo Comum: sem lendários e sem iniciais.',
        '• Ovo Lendário: um lendário, mítico ou Ultra Beast.',
        '• Ovo Inicial: um dos 27 iniciais.',
        'Ovos com letra (A, S, S+) garantem IVs daquele tier ou melhor. Todo ovo tem 5% de chance de shiny, e o Pokémon nasce no nível 1.',
      ] },
      { id: 'chave', emoji: '🗝️', titulo: 'Chave Temporal', texto: [
        'Uma Orb especial que dá Cubos do passado ou do futuro (49,5% cada) ou, com 1% de chance, um Cubo lendário.',
      ] },
      { id: 'roletas', emoji: '🎡', titulo: 'Roletas', texto: [
        'Vencer um Ninho ou ser campeão de um Torneio dá um giro na roleta daquele evento. O resultado é sorteado no servidor.',
      ] },
      { id: 'kit', emoji: '🎒', titulo: 'Kit iniciante', texto: [
        'Chega na Bolsa de toda conta nova quando a introdução do Professor Carvalho termina (conquista Conhecedor): 100 Pokébolas, remédios, 20.000 Poké Dólares, uma skin e um Charm sorteados. Tudo NT.',
      ] },
    ],
  },
];
