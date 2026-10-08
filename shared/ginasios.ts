// Ginásios (Jogar → Ginásios): os líderes de cada região com os times dos jogos. Alola não tem ginásios: são
// 8 desafios do Island Challenge (Capitães e Kahunas), cada um com um selo próprio.
// Mesmas regras dos duelos: nível = média do time do jogador, sem EVs, IVs baixos pela ordem do ginásio.
// Vencer dá a insígnia (uma vez) e silver (sempre).
import type { Dificuldade, TreinadorNpc } from './treinadoresNpc';

export interface LiderGinasio extends TreinadorNpc {
  regiao: string;
  /** Ordem do ginásio na região (1 = primeiro). */
  ordem: number;
  /** Tipo do ginásio (em inglês, como os tipos do jogo). */
  tipo: string;
  /** Nome da insígnia. */
  insignia: string;
}

/** Dificuldade (IVs) pela ordem: os primeiros ginásios são mais fáceis. */
const DIFICULDADE_POR_ORDEM: Dificuldade[] = [1, 1, 2, 2, 3, 3, 4, 5];
/** Silver por vencer cada ginásio, pela ordem (provisório). */
export const RECOMPENSA_GINASIO = [200, 300, 400, 500, 600, 700, 850, 1000];

/** O último campo (opcional) troca o título (ex.: "Capitão de Alola"). */
type Linha = [id: string, nome: string, tipo: string, insignia: string, time: number[], titulo?: string];

const regiao = (id: string, nomeRegiao: string, lideres: Linha[]): LiderGinasio[] =>
  lideres.map(([idL, nome, tipo, insignia, time, titulo], i) => {
    const ordem = i + 1;
    return { id: idL, nome, titulo: titulo ?? `Líder de Ginásio de ${nomeRegiao}`, dificuldade: DIFICULDADE_POR_ORDEM[ordem - 1], time, regiao: id, ordem, tipo, insignia };
  });

export const LIDERES: LiderGinasio[] = [
  ...regiao('kanto', 'Kanto', [
    ['brock', 'Brock', 'Rock', 'Boulder Badge', [74, 95]],
    ['misty', 'Misty', 'Water', 'Cascade Badge', [120, 121]],
    ['ltsurge', 'Lt. Surge', 'Electric', 'Thunder Badge', [100, 25, 26]],
    ['erika', 'Erika', 'Grass', 'Rainbow Badge', [71, 114, 45]],
    ['koga-ginasio', 'Koga', 'Poison', 'Soul Badge', [109, 89, 109, 110]],
    ['sabrina', 'Sabrina', 'Psychic', 'Marsh Badge', [64, 122, 49, 65]],
    ['blaine', 'Blaine', 'Fire', 'Volcano Badge', [58, 77, 78, 59]],
    ['giovanni', 'Giovanni', 'Ground', 'Earth Badge', [111, 51, 31, 34, 112]],
  ]),
  ...regiao('johto', 'Johto', [
    ['falkner', 'Falkner', 'Flying', 'Zephyr Badge', [16, 17]],
    ['bugsy', 'Bugsy', 'Bug', 'Hive Badge', [11, 14, 123]],
    ['whitney', 'Whitney', 'Normal', 'Plain Badge', [35, 241]],
    ['morty', 'Morty', 'Ghost', 'Fog Badge', [92, 93, 93, 94]],
    ['chuck', 'Chuck', 'Fighting', 'Storm Badge', [57, 62]],
    ['jasmine', 'Jasmine', 'Steel', 'Mineral Badge', [81, 81, 208]],
    ['pryce', 'Pryce', 'Ice', 'Glacier Badge', [86, 87, 221]],
    ['clair', 'Clair', 'Dragon', 'Rising Badge', [148, 148, 148, 230]],
  ]),
  ...regiao('hoenn', 'Hoenn', [
    ['roxanne', 'Roxanne', 'Rock', 'Stone Badge', [74, 74, 299]],
    ['brawly', 'Brawly', 'Fighting', 'Knuckle Badge', [66, 307, 296]],
    ['wattson', 'Wattson', 'Electric', 'Dynamo Badge', [81, 100, 82, 310]],
    ['flannery', 'Flannery', 'Fire', 'Heat Badge', [218, 218, 324]],
    ['norman', 'Norman', 'Normal', 'Balance Badge', [327, 288, 264, 289]],
    ['winona', 'Winona', 'Flying', 'Feather Badge', [333, 277, 279, 334]],
    ['tateandliza', 'Tate & Liza', 'Psychic', 'Mind Badge', [337, 338]],
    ['juan', 'Juan', 'Water', 'Rain Badge', [370, 340, 364, 342, 230]],
  ]),
  ...regiao('sinnoh', 'Sinnoh', [
    ['roark', 'Roark', 'Rock', 'Coal Badge', [74, 95, 408]],
    ['gardenia', 'Gardenia', 'Grass', 'Forest Badge', [420, 387, 407]],
    ['maylene', 'Maylene', 'Fighting', 'Cobble Badge', [307, 67, 448]],
    ['crasherwake', 'Crasher Wake', 'Water', 'Fen Badge', [130, 195, 419]],
    ['fantina', 'Fantina', 'Ghost', 'Relic Badge', [425, 93, 429]],
    ['byron', 'Byron', 'Steel', 'Mine Badge', [436, 208, 411]],
    ['candice', 'Candice', 'Ice', 'Icicle Badge', [215, 221, 460, 478]],
    ['volkner', 'Volkner', 'Electric', 'Beacon Badge', [135, 26, 405, 466]],
  ]),
  ...regiao('unova', 'Unova', [
    ['cilan', 'Cilan', 'Grass', 'Trio Badge', [506, 511]],
    ['lenora', 'Lenora', 'Normal', 'Basic Badge', [507, 505]],
    ['burgh', 'Burgh', 'Bug', 'Insect Badge', [544, 557, 542]],
    ['elesa', 'Elesa', 'Electric', 'Bolt Badge', [587, 587, 523]],
    ['clay', 'Clay', 'Ground', 'Quake Badge', [552, 536, 530]],
    ['skyla', 'Skyla', 'Flying', 'Jet Badge', [528, 521, 581]],
    ['brycen', 'Brycen', 'Ice', 'Freeze Badge', [582, 615, 614]],
    ['drayden', 'Drayden', 'Dragon', 'Legend Badge', [610, 621, 612]],
  ]),
  ...regiao('kalos', 'Kalos', [
    ['viola', 'Viola', 'Bug', 'Bug Badge', [283, 666]],
    ['grant', 'Grant', 'Rock', 'Cliff Badge', [698, 696]],
    ['korrina', 'Korrina', 'Fighting', 'Rumble Badge', [619, 67, 701]],
    ['ramos', 'Ramos', 'Grass', 'Plant Badge', [189, 70, 673]],
    ['clemont', 'Clemont', 'Electric', 'Voltage Badge', [587, 82, 695]],
    ['valerie', 'Valerie', 'Fairy', 'Fairy Badge', [303, 122, 700]],
    ['olympia', 'Olympia', 'Psychic', 'Psychic Badge', [561, 199, 678]],
    ['wulfric', 'Wulfric', 'Ice', 'Iceberg Badge', [459, 615, 713]],
  ]),
  ...regiao('alola', 'Alola', [
    ['ilima', 'Ilima', 'Normal', 'Selo da Prova de Ilima', [734, 235], 'Capitão de Alola'],
    ['hala', 'Hala', 'Fighting', 'Selo de Melemele', [56, 296, 739], 'Kahuna de Alola'],
    ['lana', 'Lana', 'Water', 'Selo da Prova de Lana', [746, 771, 752], 'Capitã de Alola'],
    ['kiawe', 'Kiawe', 'Fire', 'Selo da Prova de Kiawe', [59, 663, 105], 'Capitão de Alola'],
    ['mallow', 'Mallow', 'Grass', 'Selo da Prova de Mallow', [756, 709, 763], 'Capitã de Alola'],
    ['olivia', 'Olivia', 'Rock', 'Selo de Akala', [299, 525, 745], 'Kahuna de Alola'],
    ['nanu', 'Nanu', 'Dark', "Selo de Ula'ula", [302, 552, 53], 'Kahuna de Alola'],
    ['hapu', 'Hapu', 'Ground', 'Selo de Poni', [51, 423, 330, 750], 'Kahuna de Alola'],
  ]),
  ...regiao('galar', 'Galar', [
    ['milo', 'Milo', 'Grass', 'Grass Badge', [829, 830]],
    ['nessa', 'Nessa', 'Water', 'Water Badge', [118, 846, 834]],
    ['kabu', 'Kabu', 'Fire', 'Fire Badge', [38, 59, 851]],
    ['bea', 'Bea', 'Fighting', 'Fighting Badge', [237, 675, 865, 68]],
    ['opal', 'Opal', 'Fairy', 'Fairy Badge', [110, 303, 468, 869]],
    ['gordie', 'Gordie', 'Rock', 'Rock Badge', [689, 213, 874, 839]],
    ['piers', 'Piers', 'Dark', 'Dark Badge', [560, 435, 454, 862]],
    ['raihan', 'Raihan', 'Dragon', 'Dragon Badge', [330, 526, 844, 884]],
  ]),
  ...regiao('paldea', 'Paldea', [
    ['katy', 'Katy', 'Bug', 'Bug Badge', [919, 917, 216]],
    ['brassius', 'Brassius', 'Grass', 'Grass Badge', [548, 928, 185]],
    ['iono', 'Iono', 'Electric', 'Electric Badge', [940, 939, 404, 429]],
    ['kofu', 'Kofu', 'Water', 'Water Badge', [976, 961, 740]],
    ['larry', 'Larry', 'Normal', 'Normal Badge', [775, 982, 398]],
    ['ryme', 'Ryme', 'Ghost', 'Ghost Badge', [354, 778, 972, 849]],
    ['tulip', 'Tulip', 'Psychic', 'Psychic Badge', [981, 282, 956, 671]],
    ['grusha', 'Grusha', 'Ice', 'Ice Badge', [873, 614, 975, 334]],
  ]),
];

export const lideresDaRegiao = (regiaoId: string) => LIDERES.filter((l) => l.regiao === regiaoId);
export const liderPorId = (id: string) => LIDERES.find((l) => l.id === id);
