// Regras de um Pokémon "individual" (o que o jogador possui): golpes por nível, IVs,
// natureza, atributos, experiência e evolução. Os dados oficiais vêm do Pokémon Showdown.
import { Dex } from '@pkmn/sim';
import { especieRegional, idDaEvolucao } from '../formasRegionais';

export type Atributo = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type Atributos = Record<Atributo, number>;

export interface GolpeAprendido {
  id: string;
  pp: number;
}

export interface PokemonIndividual {
  especieId: number;
  nivel: number;
  /** Experiência total acumulada (como nos jogos originais). */
  exp: number;
  shiny: boolean;
  natureza: string;
  habilidade: string;
  genero: 'M' | 'F' | 'N';
  ivs: Atributos;
  /** Pontos de esforço: até 252 por atributo e 510 no total. */
  evs: Atributos;
  golpes: GolpeAprendido[];
  hp: number;
  /** brn, par, slp, frz, psn, tox ou null. */
  status: string | null;
  /** Item equipado para a batalha (id do Showdown, ex.: "eviolite"). */
  item?: string | null;
  /** NT = inegociável: não pode ser trocado com outros jogadores (ex.: o inicial). */
  inegociavel?: boolean;
  /**
   * ID único do Pokémon do jogador, em ordem de captura (1, 2, 3…: quem chegou antes tem o número menor), para trocas e
   * transferências; o save dá o próximo número a quem não tem. No MMO o servidor é quem vai numerar.
   */
  uid?: number;
  /** Trancado no PC: não pode ser solto (nem sozinho, nem marcado com outros). */
  trancado?: boolean;
  /** IVs exatos à mostra na ficha (capturados nascem ocultos; gold revela o valor exato). */
  ivsRevelados?: boolean;
  /** Só a FAIXA de cada IV à mostra (0–5, 6–10… 26–31), comprada com silver. */
  ivsFaixa?: boolean;
  /** Amizade 0–255 (shared/amizade.ts); sem valor = AMIZADE_INICIAL. */
  amizade?: number;
  /** Tera Type (troca com Tera Shards); sem valor = o primeiro tipo da espécie. */
  teraTipo?: string;
}

/** Amizade de quem nasce/é capturado (valor-base da maioria das espécies na 8ª/9ª geração). */
export const AMIZADE_INICIAL = 50;

/** IV mínimo de um Pokémon shiny (cada atributo vem entre 15 e 31). */
export const IV_MIN_SHINY = 15;

export const ATRIBUTOS: Atributo[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const EV_MAX_ATRIBUTO = 252;
export const EV_MAX_TOTAL = 510;

export const atributosZerados = (): Atributos => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

/** Soma EVs respeitando os limites oficiais. Devolve quanto foi de fato somado. */
export function ganharEvs(p: PokemonIndividual, rendimento: Partial<Atributos>): number {
  let total = ATRIBUTOS.reduce((s, a) => s + p.evs[a], 0);
  let somado = 0;
  for (const a of ATRIBUTOS) {
    const quer = rendimento[a] ?? 0;
    const pode = Math.max(0, Math.min(quer, EV_MAX_ATRIBUTO - p.evs[a], EV_MAX_TOTAL - total));
    p.evs[a] += pode;
    total += pode;
    somado += pode;
  }
  return somado;
}

// ---------- espécies ----------

const especiePorNumero = new Map<number, ReturnType<typeof Dex.species.get>>();
for (const s of Dex.species.all()) if (!s.forme && s.num > 0 && !especiePorNumero.has(s.num)) especiePorNumero.set(s.num, s);

export function especie(numero: number) {
  // formas regionais (Alolan Rattata = 10091…) usam a forma do Showdown
  const regional = especieRegional(numero);
  if (regional) return regional;
  const s = especiePorNumero.get(numero);
  if (!s) throw new Error(`Espécie ${numero} não existe no Showdown`);
  return s;
}

// ---------- golpes ----------

const cacheGolpes = new Map<number, { id: string; nivel: number }[]>();

/** Golpes que a espécie aprende por nível, usando a geração mais recente em que ela existe. */
export function golpesPorNivel(numero: number): { id: string; nivel: number }[] {
  const salvo = cacheGolpes.get(numero);
  if (salvo) return salvo;
  const dados = Dex.species.getLearnsetData(especie(numero).id).learnset ?? {};
  const fontes: { id: string; gen: number; nivel: number }[] = [];
  for (const [id, origens] of Object.entries(dados)) {
    for (const origem of origens) {
      const m = /^(\d)L(\d+)$/.exec(origem);
      if (m) fontes.push({ id, gen: Number(m[1]), nivel: Number(m[2]) });
    }
  }
  const gen = Math.max(0, ...fontes.map((f) => f.gen));
  const lista = fontes
    .filter((f) => f.gen === gen && Dex.moves.get(f.id).exists)
    .map(({ id, nivel }) => ({ id, nivel }))
    .sort((a, b) => a.nivel - b.nivel || a.id.localeCompare(b.id));
  cacheGolpes.set(numero, lista);
  return lista;
}

export function ppMaximo(golpeId: string): number {
  return Dex.moves.get(golpeId).pp;
}

/**
 * PP do golpe com PP Max (3 PP Ups: +60%, como nos jogos; golpes de 1 PP não sobem). O PP Max ainda não existe no
 * jogo, mas o PP do adversário já é mostrado assim (pedido do dono), para ficar certo quando ele chegar.
 */
export function ppComPPMax(golpeId: string): number {
  const g = Dex.moves.get(golpeId);
  return g.noPPBoosts ? g.pp : Math.floor((g.pp * 8) / 5);
}

/** Como nos jogos: os 4 últimos golpes aprendidos até o nível atual. */
export function golpesIniciais(numero: number, nivel: number): GolpeAprendido[] {
  const ids: string[] = [];
  for (const g of golpesPorNivel(numero)) {
    if (g.nivel > nivel) break;
    const i = ids.indexOf(g.id);
    if (i >= 0) ids.splice(i, 1);
    ids.push(g.id);
  }
  return ids.slice(-4).map((id) => ({ id, pp: ppMaximo(id) }));
}

/** Golpes novos que a espécie aprende exatamente nesse nível (nível 0 = ao evoluir). */
export function golpesNoNivel(numero: number, nivel: number): string[] {
  return golpesPorNivel(numero).filter((g) => g.nivel === nivel).map((g) => g.id);
}

// ---------- atributos ----------

type BaseDeAtributos = Pick<PokemonIndividual, 'especieId' | 'nivel' | 'ivs' | 'evs' | 'natureza'>;

export function atributos(p: BaseDeAtributos): Atributos {
  const base = especie(p.especieId).baseStats;
  const natureza = Dex.natures.get(p.natureza);
  const resultado = {} as Atributos;
  for (const a of ATRIBUTOS) {
    const pontos = 2 * base[a] + p.ivs[a] + Math.floor(p.evs[a] / 4);
    if (a === 'hp') {
      resultado.hp = base.hp === 1 ? 1 : Math.floor((pontos * p.nivel) / 100) + p.nivel + 10;
      continue;
    }
    let valor = Math.floor((pontos * p.nivel) / 100) + 5;
    if (natureza.plus === a) valor = Math.floor(valor * 1.1);
    if (natureza.minus === a) valor = Math.floor(valor * 0.9);
    resultado[a] = valor;
  }
  return resultado;
}

/** Speed mínima e máxima que o Pokémon teria com IV 0 e IV 31 (mesma natureza, EVs e nível). */
export function faixaVelocidade(p: BaseDeAtributos): [number, number] {
  const com = (iv: number) => atributos({ ...p, ivs: { ...p.ivs, spe: iv } }).spe;
  return [com(0), com(31)];
}

export function hpMaximo(p: BaseDeAtributos): number {
  return atributos(p).hp;
}

// ---------- experiência ----------

/** Experiência total necessária para chegar ao nível, pela curva de crescimento da espécie. */
export function expParaNivel(crescimento: string | null, n: number): number {
  if (n <= 1) return 0;
  const n3 = n ** 3;
  switch (crescimento) {
    case 'fast':
      return Math.floor((4 * n3) / 5);
    case 'medium-slow':
      return Math.floor((6 / 5) * n3 - 15 * n * n + 100 * n - 140);
    case 'slow':
      return Math.floor((5 * n3) / 4);
    case 'slow-then-very-fast': // "Erratic"
      if (n < 50) return Math.floor((n3 * (100 - n)) / 50);
      if (n < 68) return Math.floor((n3 * (150 - n)) / 100);
      if (n < 98) return Math.floor((n3 * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((n3 * (160 - n)) / 100);
    case 'fast-then-very-slow': // "Fluctuating"
      if (n < 15) return Math.floor((n3 * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n < 36) return Math.floor((n3 * (n + 14)) / 50);
      return Math.floor((n3 * (Math.floor(n / 2) + 32)) / 50);
    default: // medium / medium-fast
      return n3;
  }
}

/** Experiência por derrotar um Pokémon selvagem (fórmula da 7ª geração em diante). */
export function expGanha(expBaseDerrotado: number, nivelDerrotado: number, nivelVencedor: number, participou: boolean): number {
  const L = nivelDerrotado;
  const Lp = nivelVencedor;
  const exp = Math.floor(((expBaseDerrotado * L) / 5) * ((2 * L + 10) / (L + Lp + 10)) ** 2.5) + 1;
  return participou ? exp : Math.floor(exp / 2); // quem não lutou recebe metade (Exp. Share)
}

// ---------- evolução ----------

/** Evoluções por nível que dependem só da hora ("de dia"/"à noite": Alolan Raticate, Obstagoon, Lycanroc…). */
const CONDICOES_DE_HORA = ['during the day', 'at night'];

/**
 * Número da espécie para a qual evolui ao atingir o nível, ou null. Só evoluções por nível; as de dia/noite
 * seguem o relógio do computador (dia = 6h às 18h, como na amizade).
 */
export function evolucaoPorNivel(numero: number, nivel: number, hora = new Date().getHours()): number | null {
  const dia = hora >= 6 && hora < 18;
  for (const nome of especie(numero).evos ?? []) {
    const evo = Dex.species.get(nome);
    if (evo.evoType || evo.evoItem) continue;
    if (evo.evoCondition && !CONDICOES_DE_HORA.includes(evo.evoCondition)) continue;
    if (evo.evoCondition === 'during the day' && !dia) continue;
    if (evo.evoCondition === 'at night' && dia) continue;
    const id = idDaEvolucao(numero, evo);
    if (id !== null && evo.evoLevel && nivel >= evo.evoLevel) return id;
  }
  return null;
}

// ---------- criação ----------

function sortear<T>(lista: readonly T[], aleatorio: () => number): T {
  return lista[Math.floor(aleatorio() * lista.length)];
}

export function gerarIndividuo(
  numero: number,
  nivel: number,
  opcoes: { shiny?: boolean; crescimento?: string | null; aleatorio?: () => number } = {},
): PokemonIndividual {
  const { shiny = false, crescimento = null, aleatorio = Math.random } = opcoes;
  const s = especie(numero);
  const ivs = {} as Atributos;
  // shiny: IVs de IV_MIN_SHINY a 31 (os normais vão de 0 a 31)
  const ivMin = shiny ? IV_MIN_SHINY : 0;
  for (const a of ATRIBUTOS) ivs[a] = ivMin + Math.floor(aleatorio() * (32 - ivMin));

  let genero: PokemonIndividual['genero'];
  if (s.gender) genero = s.gender as PokemonIndividual['genero'];
  else genero = aleatorio() < (s.genderRatio?.M ?? 0.5) ? 'M' : 'F';

  const habilidades = [s.abilities['0'], s.abilities['1']].filter(Boolean) as string[];
  const individuo: PokemonIndividual = {
    especieId: numero,
    nivel,
    exp: expParaNivel(crescimento, nivel),
    shiny,
    natureza: sortear(Dex.natures.all(), aleatorio).name,
    habilidade: sortear(habilidades, aleatorio),
    genero,
    ivs,
    evs: atributosZerados(),
    golpes: golpesIniciais(numero, nivel),
    hp: 0,
    status: null,
    amizade: AMIZADE_INICIAL,
  };
  individuo.hp = hpMaximo(individuo);
  return individuo;
}

export function curar(p: PokemonIndividual): void {
  p.hp = hpMaximo(p);
  p.status = null;
  for (const g of p.golpes) g.pp = ppMaximo(g.id);
}

export function nomeGolpe(id: string): string {
  return Dex.moves.get(id).name;
}

/** Nível em que a espécie surge evoluindo por nível (Charmeleon = 16), ou null se evolui de outro jeito. */
export function nivelDeEvolucao(numero: number): number | null {
  const s = especie(numero);
  // nos mapas a hora não importa: Alolan Raticate (à noite) aparece a partir do 20 como o Raticate normal
  const condicaoOk = !s.evoCondition || CONDICOES_DE_HORA.includes(s.evoCondition);
  return !s.evoType && condicaoOk && !s.evoItem && s.evoLevel ? s.evoLevel : null;
}
