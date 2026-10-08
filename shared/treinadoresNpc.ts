// Treinadores NPC para "Duelos com treinadores" (aba Jogar). Times inspirados nos jogos e no anime (sem líderes
// de ginásio, pedido do dono). Regras do dono:
// - nível = média dos níveis do time do jogador (as formas "voltam" para a evolução certa do nível: Metagross Nv. 20
//   vira Metang);
// - sem EVs; IVs baixos, todos iguais, de 5 a 10 conforme a força do treinador na franquia (dificuldade 1 a 5);
// - recompensa em silver pela dificuldade.
import { Dex } from '@pkmn/sim';
import { especie, gerarIndividuo, hpMaximo, type PokemonIndividual } from './batalha/pokemon';

export type Dificuldade = 1 | 2 | 3 | 4 | 5;

export interface TreinadorNpc {
  id: string;
  nome: string;
  /** "Campeão de Hoenn", "Elite Four de Kanto"… */
  titulo: string;
  dificuldade: Dificuldade;
  /** Números da Pokédex, na ordem em que entram (o mais forte no fim). */
  time: number[];
}

/** IV de todos os atributos pela dificuldade (5 a 10). */
export const IV_POR_DIFICULDADE: Record<Dificuldade, number> = { 1: 5, 2: 6, 3: 8, 4: 9, 5: 10 };
/** Silver por vencer (provisório, o dono ajusta). */
export const RECOMPENSA_POR_DIFICULDADE: Record<Dificuldade, number> = { 1: 100, 2: 200, 3: 400, 4: 700, 5: 1000 };
export const NOMES_DIFICULDADE: Record<Dificuldade, string> = { 1: 'Fácil', 2: 'Normal', 3: 'Difícil', 4: 'Muito difícil', 5: 'Lendário' };

const t = (id: string, nome: string, titulo: string, dificuldade: Dificuldade, time: number[]): TreinadorNpc => ({ id, nome, titulo, dificuldade, time });

export const TREINADORES_NPC: TreinadorNpc[] = [
  // ---- fáceis ----
  t('joey', 'Joey', 'Youngster', 1, [20]),
  t('wade', 'Wade', 'Bug Catcher', 1, [10, 13, 11]),
  t('jessie-james', 'Jessie & James', 'Equipe Rocket', 1, [24, 110, 52, 202]),
  // ---- normais ----
  t('bianca', 'Bianca', 'Amiga de Unova', 2, [518, 514, 500]),
  t('shauna', 'Shauna', 'Amiga de Kalos', 2, [676, 706, 655]),
  t('maxie', 'Maxie', 'Líder da Equipe Magma', 2, [262, 169, 323]),
  t('archie', 'Archie', 'Líder da Equipe Aqua', 2, [262, 169, 319]),
  t('hau', 'Hau', 'Rival de Alola', 2, [26, 136, 715, 724]),
  // ---- difíceis ----
  t('silver', 'Silver', 'Rival de Johto', 3, [215, 82, 94, 65, 169, 160]),
  t('wally', 'Wally', 'Rival de Hoenn', 3, [334, 301, 315, 82, 475]),
  t('barry', 'Barry', 'Rival de Sinnoh', 3, [398, 419, 407, 143, 392]),
  t('hop', 'Hop', 'Rival de Galar', 3, [832, 823, 871, 143, 812]),
  t('bede', 'Bede', 'Rival de Galar', 3, [303, 78, 282, 858]),
  t('arven', 'Arven', 'Amigo de Paldea', 3, [820, 91, 952, 949, 934, 943]),
  t('gladion', 'Gladion', 'Rival de Alola', 3, [169, 571, 448, 461, 773]),
  t('penny', 'Penny', 'Chefe da Equipe Star', 3, [134, 135, 136, 470, 197, 700]),
  // ---- muito difíceis (Elite Four e chefes) ----
  t('lorelei', 'Lorelei', 'Elite Four de Kanto', 4, [87, 91, 80, 124, 131]),
  t('bruno', 'Bruno', 'Elite Four de Kanto', 4, [95, 107, 106, 95, 68]),
  t('agatha', 'Agatha', 'Elite Four de Kanto', 4, [94, 42, 93, 24, 94]),
  t('will', 'Will', 'Elite Four de Johto', 4, [178, 124, 103, 80, 178]),
  t('koga', 'Koga', 'Elite Four de Johto', 4, [168, 49, 205, 89, 169]),
  t('karen', 'Karen', 'Elite Four de Johto', 4, [197, 45, 94, 198, 229]),
  t('sidney', 'Sidney', 'Elite Four de Hoenn', 4, [262, 275, 332, 342, 359]),
  t('phoebe', 'Phoebe', 'Elite Four de Hoenn', 4, [356, 354, 302, 354, 356]),
  t('drake', 'Drake', 'Elite Four de Hoenn', 4, [372, 334, 330, 230, 373]),
  t('aaron', 'Aaron', 'Elite Four de Sinnoh', 4, [269, 267, 416, 214, 452]),
  t('flint', 'Flint', 'Elite Four de Sinnoh', 4, [78, 208, 428, 426, 392]),
  t('shauntal', 'Shauntal', 'Elite Four de Unova', 4, [563, 593, 623, 609]),
  t('grimsley', 'Grimsley', 'Elite Four de Unova', 4, [560, 510, 553, 625]),
  t('caitlin', 'Caitlin', 'Elite Four de Unova', 4, [518, 561, 579, 576]),
  t('drasna', 'Drasna', 'Elite Four de Kalos', 4, [691, 621, 334, 715]),
  t('cyrus', 'Cyrus', 'Líder da Equipe Galactic', 4, [229, 430, 169, 130, 461]),
  t('lysandre', 'Lysandre', 'Líder da Equipe Flare', 4, [620, 430, 668, 130]),
  t('n', 'N', 'Rei da Equipe Plasma', 4, [571, 565, 584, 567, 601]),
  // ---- lendários (campeões e grandes vilões) ----
  t('lance', 'Lance', 'Campeão de Johto', 5, [130, 142, 6, 149, 149, 149]),
  t('blue', 'Blue', 'Campeão de Kanto', 5, [18, 65, 112, 59, 103, 9]),
  t('red', 'Red', 'Lenda do Monte Silver', 5, [25, 196, 143, 3, 6, 9]),
  t('steven', 'Steven', 'Campeão de Hoenn', 5, [227, 344, 306, 346, 348, 376]),
  t('wallace', 'Wallace', 'Campeão de Hoenn', 5, [321, 73, 272, 340, 130, 350]),
  t('cynthia', 'Cynthia', 'Campeã de Sinnoh', 5, [442, 407, 423, 448, 350, 445]),
  t('alder', 'Alder', 'Campeão de Unova', 5, [617, 626, 621, 584, 589, 637]),
  t('iris', 'Iris', 'Campeã de Unova', 5, [635, 621, 306, 567, 131, 612]),
  t('diantha', 'Diantha', 'Campeã de Kalos', 5, [701, 697, 699, 711, 706, 282]),
  t('kukui', 'Kukui', 'Professor e Campeão de Alola', 5, [745, 38, 628, 462, 143, 727]),
  t('leon', 'Leon', 'Campeão de Galar', 5, [681, 887, 612, 537, 866, 6]),
  t('geeta', 'Geeta', 'Campeã de Paldea', 5, [956, 673, 976, 713, 983, 970]),
  t('nemona', 'Nemona', 'Campeã de Paldea', 5, [745, 706, 982, 968, 923, 908]),
  t('ghetsis', 'Ghetsis', 'Líder da Equipe Plasma', 5, [563, 626, 537, 625, 604, 635]),
  t('volo', 'Volo', 'Mercador de Hisui', 5, [442, 407, 445, 448, 59, 468]),
  t('ash', 'Ash', 'Campeão Mundial (anime)', 5, [25, 6, 658, 448, 149, 94]),
];

/** Nível dos NPCs: a média dos níveis do time do jogador (arredondada). */
export function nivelDoDuelo(timeDoJogador: PokemonIndividual[]): number {
  if (!timeDoJogador.length) return 5;
  return Math.max(1, Math.min(100, Math.round(timeDoJogador.reduce((s, p) => s + p.nivel, 0) / timeDoJogador.length)));
}

/** Quantos Pokémon o treinador usa: o tamanho do seu time (+1 nos muito difíceis/lendários), até o time dele. */
export function tamanhoDoTime(npc: TreinadorNpc, tamanhoDoJogador: number): number {
  return Math.min(npc.time.length, Math.max(1, tamanhoDoJogador) + (npc.dificuldade >= 4 ? 1 : 0));
}

/** A forma da linha evolutiva certa para o nível (só evoluções por nível: Metagross Nv. 20 → Metang). */
export function formaNoNivel(numero: number, nivel: number): number {
  let s = especie(numero);
  while (s.prevo && s.evoLevel && nivel < s.evoLevel) {
    const anterior = Dex.species.get(s.prevo);
    if (!anterior.exists || anterior.num <= 0) break;
    s = anterior;
  }
  return s.num;
}

/** Monta o time do NPC para um duelo: últimos Pokémon do time dele (os mais fortes), nível da média, IVs da dificuldade, sem EVs. */
export function montarTimeNpc(npc: TreinadorNpc, timeDoJogador: PokemonIndividual[], crescimentoDe: (n: number) => string | null): PokemonIndividual[] {
  const nivel = nivelDoDuelo(timeDoJogador);
  const iv = IV_POR_DIFICULDADE[npc.dificuldade];
  return npc.time.slice(-tamanhoDoTime(npc, timeDoJogador.length)).map((n) => {
    const numero = formaNoNivel(n, nivel);
    const p = gerarIndividuo(numero, nivel, { crescimento: crescimentoDe(numero) });
    p.ivs = { hp: iv, atk: iv, def: iv, spa: iv, spd: iv, spe: iv };
    p.hp = hpMaximo(p);
    return p;
  });
}

export function sortearTreinador(aleatorio = Math.random, excluir?: string): TreinadorNpc {
  const lista = TREINADORES_NPC.filter((x) => x.id !== excluir);
  return lista[Math.floor(aleatorio() * lista.length)];
}
