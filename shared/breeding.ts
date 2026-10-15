// Breeding (planilha do dono "Craft.xlsx", aba Breeding): casal na creche, um ciclo a cada 6 h (VIP 4 h) com 15% de
// chance de ovo; o ovo sai como um Pokémon (vai para o PC) e choca depois (sistema a definir com o dono).
import { Dex } from '@pkmn/sim';
import { ATRIBUTOS, especie, type Atributos, type PokemonIndividual } from './batalha/pokemon';
import { ehParadoxo } from './formasRegionais';

const HORA = 60 * 60 * 1000;
export const CICLO_CRECHE_MS = 6 * HORA;
export const CICLO_CRECHE_VIP_MS = 4 * HORA;
export const CHANCE_OVO_POR_CICLO = 0.15;
export const CASAIS_POR_VEZ = 1;
export const CASAIS_POR_VEZ_VIP = 2;
/** Chance de shiny pelo número de shiny no casal (0, 1 ou 2). */
export const CHANCE_SHINY_CRIA = [0.01, 0.1, 0.25];
/** Cada Egg Move que um dos pais sabe passa com esta chance (sorteio separado para cada um). */
export const CHANCE_EGG_MOVE = 0.5;
/** O IV do pai entra na conta com −4 (o da mãe entra inteiro). */
export const PENALIDADE_IV_PAI = 4;
export const DESTINY_KNOT = 'destinyknot';
/** Choco (pedido do dono): o ovo choca sozinho depois de tantos passos no mapa (cidade e biomas), com ele no PC. */
export const PASSOS_PARA_CHOCAR = 1000;
/** ...ou a moça do Daycare choca na hora certa: cobra e fica com o ovo por 10 minutos. */
export const PRECO_CHOCAR_DAYCARE = 20_000;
export const TEMPO_CHOCAR_DAYCARE_MS = 10 * 60 * 1000;
export const EVERSTONE = 'everstone';

type Individuo = Pick<PokemonIndividual, 'especieId' | 'genero' | 'inegociavel' | 'ivs' | 'shiny' | 'natureza' | 'item' | 'golpes'> & { ovo?: unknown };

const gruposDeOvo = (p: Individuo): string[] => especie(p.especieId).eggGroups ?? [];
export const ehDitto = (p: Individuo) => gruposDeOvo(p).includes('Ditto');

/** Por que este Pokémon não pode ir para a creche (null = pode). Regras dos jogos + NT (pedido do dono). */
export function motivoForaDaCreche(p: Individuo): string | null {
  const s = especie(p.especieId);
  const tags = s.tags ?? [];
  if (p.ovo) return 'é um ovo';
  if (p.inegociavel) return 'é NT';
  if (tags.some((t) => /Legendary|Mythical|Ultra Beast/.test(t)) || ehParadoxo(s.name)) return 'lendários, míticos, Ultra Beasts e Paradoxos não cruzam';
  if (gruposDeOvo(p).includes('Undiscovered')) return 'esta espécie não cruza';
  return null;
}

/** Os dois podem cruzar? (grupo de ovo em comum e sexos diferentes, ou um deles Ditto; sem gênero só com Ditto) */
export function podemCruzar(a: Individuo, b: Individuo): boolean {
  if (motivoForaDaCreche(a) || motivoForaDaCreche(b)) return false;
  const dittoA = ehDitto(a);
  const dittoB = ehDitto(b);
  if (dittoA && dittoB) return false;
  if (dittoA || dittoB) return true;
  if (a.genero === 'N' || b.genero === 'N' || a.genero === b.genero) return false;
  const grupos = gruposDeOvo(a);
  return gruposDeOvo(b).some((g) => grupos.includes(g));
}

/** Mãe e pai do casal: a mãe é quem não é Ditto (a fêmea, se nenhum for); o Ditto faz o papel do pai. */
export function maeEPai<T extends Individuo>(a: T, b: T): { mae: T; pai: T } {
  if (ehDitto(a)) return { mae: b, pai: a };
  if (ehDitto(b)) return { mae: a, pai: b };
  return a.genero === 'F' ? { mae: a, pai: b } : { mae: b, pai: a };
}

const entre = (x: number, y: number, aleatorio: () => number) => {
  const [min, max] = x <= y ? [x, y] : [y, x];
  return min + Math.floor(aleatorio() * (max - min + 1));
};

/**
 * IVs do filhote (regra do dono): cada atributo sai entre o IV da mãe e o do pai − 4. Com Destiny Knot (em qualquer
 * um dos dois), como nos jogos: 5 atributos sorteados herdam o IV de um dos pais (sem o −4) e o sexto é aleatório.
 */
export function ivsDoFilhote(mae: Individuo, pai: Individuo, aleatorio = Math.random): Atributos {
  const ivs = {} as Atributos;
  if (mae.item === DESTINY_KNOT || pai.item === DESTINY_KNOT) {
    const ordem = [...ATRIBUTOS].sort(() => aleatorio() - 0.5);
    ordem.forEach((a, i) => (ivs[a] = i < 5 ? (aleatorio() < 0.5 ? mae : pai).ivs[a] : Math.floor(aleatorio() * 32)));
    return ivs;
  }
  for (const a of ATRIBUTOS) ivs[a] = entre(mae.ivs[a], Math.max(0, pai.ivs[a] - PENALIDADE_IV_PAI), aleatorio);
  return ivs;
}

/** Nature: quem segura Everstone passa a dele (os dois com Everstone: uma das duas); senão, sorteada. */
export function naturezaDoFilhote(mae: Individuo, pai: Individuo, aleatorio = Math.random): string | null {
  const comPedra = [mae, pai].filter((p) => p.item === EVERSTONE);
  return comPedra.length ? comPedra[Math.floor(aleatorio() * comPedra.length)].natureza : null;
}

export const chanceShinyDoCasal = (a: Individuo, b: Individuo) => CHANCE_SHINY_CRIA[Number(a.shiny) + Number(b.shiny)];

/** Egg Moves da espécie do filhote (fonte "E" no learnset do Showdown, de qualquer geração). */
export function eggMovesDe(especieId: number): Set<string> {
  const saida = new Set<string>();
  const dados = Dex.species.getLearnsetData(especie(especieId).id).learnset ?? {};
  for (const [golpe, fontes] of Object.entries(dados)) if (fontes.some((f) => /^\dE/.test(f))) saida.add(golpe);
  return saida;
}

/** Egg Moves que o filhote herda: os que os pais sabem e são Egg Move dele, cada um com 50%, até 4. */
export function eggMovesHerdados(filhote: number, mae: Individuo, pai: Individuo, aleatorio = Math.random): string[] {
  const possiveis = eggMovesDe(filhote);
  const dosPais = [...new Set([...mae.golpes, ...pai.golpes].map((g) => g.id))].filter((g) => possiveis.has(g));
  return dosPais.filter(() => aleatorio() < CHANCE_EGG_MOVE).slice(0, 4);
}

// ---------- casal na creche ----------

export interface CasalCreche<P = PokemonIndividual> {
  pais: [P, P];
  /** começo do ciclo atual (ms) */
  desde: number;
  /** saiu um ovo e ele está esperando ser retirado (o ciclo só recomeça depois) */
  ovo?: boolean;
}

/** Roda os ciclos que já terminaram: cada um tem 15% de dar ovo; saiu ovo, para. Devolve true se saiu ovo agora. */
export function rodarCiclos(c: CasalCreche<unknown>, agora: number, vip: boolean, aleatorio = Math.random): boolean {
  if (c.ovo) return false;
  const ciclo = vip ? CICLO_CRECHE_VIP_MS : CICLO_CRECHE_MS;
  while (agora - c.desde >= ciclo) {
    c.desde += ciclo;
    if (aleatorio() < CHANCE_OVO_POR_CICLO) {
      c.ovo = true;
      return true;
    }
  }
  return false;
}
