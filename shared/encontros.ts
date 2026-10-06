// Sorteio de Pokémon selvagens. Fica em shared/ porque, no MMO, quem vai sortear é o
// servidor (para ninguém trapacear); por enquanto o cliente usa o mesmo código.
import { BIOMAS, type Bioma } from './biomas';
import { especie, nivelDeEvolucao } from './batalha/pokemon';
import { TODOS_INICIAIS } from './regioes';
import type { PokemonBase } from './tipos';
import { FAIXA_NIVEIS_ENCONTRO, nivelMaximoEncontro } from './treinador';

/** Chance de um Pokémon ser shiny. O original é 1/4096; aqui é configurável. */
export const CHANCE_SHINY = 1 / 1500;
/** Chance de aparecer um Pokémon a cada passo (1 = todo passo). */
export const CHANCE_ENCONTRO_POR_PASSO = 1;
/**
 * Peso de cada LINHA EVOLUTIVA no sorteio (pedido do dono: chances parecidas entre si, a raridade original
 * pesa pouco). Peso = PESO_BASE_LINHA + taxa de captura da forma base × PESO_POR_TAXA
 * (taxa 3 → ~101, taxa 255 → ~178: o mais comum sai no máximo ~1,8× mais que o mais raro).
 */
export const PESO_BASE_LINHA = 100;
export const PESO_POR_TAXA = 0.3;
/** Chance FIXA por encontro de cada linha de inicial (pedido do dono: 1 em 10 mil). */
export const CHANCE_INICIAL = 1 / 10000;
/** Chance FIXA por encontro de cada lendário, mítico ou Ultra Beast (pedido do dono: 1 em 20 mil). */
export const CHANCE_LENDARIO = 1 / 20000;
/** Lendários e míticos aparecem desde o começo, mas nunca abaixo deste nível. */
export const NIVEL_LENDARIO = 50;

export type Faixa = [number, number];

/** Ajustes de teste do painel de administrador (padrão = regras normais do jogo). */
export interface AjustesEncontro {
  /** chance de shiny (0 a 1) */
  chanceShiny: number;
  /** multiplica o peso de lendários/míticos (0 = nunca aparecem) */
  multLendario: number;
  /** só lendários/míticos do bioma aparecem */
  soLendarios: boolean;
  /** chance de encontro a cada passo (0 a 1) */
  chancePorPasso: number;
  /** número da Pokédex que sempre aparece (de qualquer bioma), ou null */
  especie: number | null;
  /** nível fixo dos encontros, ou null */
  nivel: number | null;
}

export const AJUSTES_PADRAO: AjustesEncontro = {
  chanceShiny: CHANCE_SHINY,
  multLendario: 1,
  soLendarios: false,
  chancePorPasso: CHANCE_ENCONTRO_POR_PASSO,
  especie: null,
  nivel: null,
};

export interface EntradaTabela {
  pokemon: PokemonBase;
  /** Peso da LINHA evolutiva no sorteio (igual para todas as formas da linha); quanto maior, mais comum. */
  peso: number;
  /** Número da forma base da linha (Caterpie, Metapod e Butterfree → 10): a linha divide a chance. */
  linha: number;
  /** Chance fixa da linha por encontro (iniciais, lendários, míticos, Ultra Beasts), fora do sorteio por peso. */
  chanceFixa: number | null;
  /** Faixa de nível em que esta forma aparece (ex.: Charmander 1–15, Charmeleon 16–35, Charizard 36–100). */
  nivelMin: number;
  nivelMax: number;
}

export interface Encontro {
  pokemon: PokemonBase;
  nivel: number;
  shiny: boolean;
}

/** Lendários, míticos e Ultra Beasts: chance fixa, nível 50+. */
const ehLendario = (p: PokemonBase) => p.lendario || p.mitico || (especie(p.id).tags ?? []).includes('Ultra Beast');

/**
 * Cada Pokémon mora em um único bioma: o do seu tipo principal (o primeiro).
 * Se nenhum bioma tiver o tipo principal, vale o segundo tipo. Exceções em BIOMA_FIXO.
 */
/** Exceções escolhidas pelo dono (a linha evolutiva inteira vai junto). Número da Pokédex → bioma. */
export const BIOMA_FIXO: Record<number, string> = {
  137: 'torre', 233: 'torre', 474: 'torre', // Porygon, Porygon2, Porygon-Z → Torre Assombrada (cemitério)
  41: 'caverna', 42: 'caverna', 169: 'caverna', // Zubat, Golbat, Crobat → Caverna Rochosa
  88: 'vulcao', 89: 'vulcao', // Grimer, Muk → Vulcão
  109: 'vulcao', 110: 'vulcao', // Koffing, Weezing → Vulcão
  147: 'agua', 148: 'agua', 149: 'agua', // Dratini, Dragonair, Dragonite → Mar Profundo
};

export function biomaDoPokemon(p: PokemonBase): string | null {
  if (BIOMA_FIXO[p.id]) return BIOMA_FIXO[p.id];
  for (const tipo of p.tipos) {
    const bioma = BIOMAS.find((b) => b.tipos.includes(tipo));
    if (bioma) return bioma.id;
  }
  return null;
}

/**
 * Forma anterior da espécie. Bebês criados em gerações seguintes (Pichu → Pikachu, Cleffa → Clefairy)
 * não contam: Pikachu continua sendo forma inicial; já Crobat (de Golbat) conta.
 */
/** Forma base da linha evolutiva (Butterfree → Caterpie). */
function baseDaLinha(p: PokemonBase, porSlug: Map<string, PokemonBase>): PokemonBase {
  let atual = p;
  for (let anterior = anteriorDe(atual, porSlug); anterior; anterior = anteriorDe(atual, porSlug)) atual = anterior;
  return atual;
}

function anteriorDe(p: PokemonBase, porSlug: Map<string, PokemonBase>): PokemonBase | undefined {
  const anterior = p.evoluiDe ? porSlug.get(p.evoluiDe) : undefined;
  return anterior && anterior.id < p.id ? anterior : undefined;
}

/**
 * Formas que só se obtêm evoluindo por pedra, troca ou amizade (ex.: Raichu, Alakazam, Gengar, Crobat):
 * não aparecem soltas nos mapas (pedido do dono).
 */
function evoluiSemNivel(p: PokemonBase, porSlug: Map<string, PokemonBase>): boolean {
  return !!(anteriorDe(p, porSlug) && nivelDeEvolucao(p.id) === null);
}

/** Faixa de nível de cada forma, para a mesma linha evolutiva não aparecer repetida. */
function faixasDeNivel(pokemons: PokemonBase[]): Map<number, Faixa> {
  const porSlug = new Map(pokemons.map((p) => [p.slug, p]));
  const minimos = new Map<number, number>();
  const nivelMin = (p: PokemonBase): number => {
    const salvo = minimos.get(p.id);
    if (salvo) return salvo;
    let min = 1;
    const anterior = anteriorDe(p, porSlug);
    if (anterior) {
      const minAnterior = nivelMin(anterior);
      min = Math.max(minAnterior + 1, nivelDeEvolucao(p.id) ?? minAnterior + 1);
    }
    min = Math.min(100, min);
    minimos.set(p.id, min);
    return min;
  };

  const faixas = new Map<number, Faixa>();
  for (const p of pokemons) {
    // evoluções que não aparecem no mapa não limitam a faixa (Kadabra vai até o 100, já que Alakazam não aparece)
    const proximas = pokemons.filter((q) => anteriorDe(q, porSlug) === p && !evoluiSemNivel(q, porSlug)).map(nivelMin);
    const max = proximas.length ? Math.min(...proximas) - 1 : 100;
    faixas.set(p.id, [nivelMin(p), Math.max(nivelMin(p), max)]);
  }
  return faixas;
}

/** `pokemons` = os da região; `todos` = todas as regiões carregadas (as faixas dependem das evoluções). */
export function montarTabela(bioma: Bioma, pokemons: PokemonBase[], excluir: number[] = [], todos: PokemonBase[] = pokemons): EntradaTabela[] {
  // evoluções podem ser de outra região (Golbat de Kanto → Crobat de Johto): faixas olham todos
  const faixas = faixasDeNivel(todos);
  const porSlug = new Map(todos.map((p) => [p.slug, p]));
  return pokemons
    .filter((p) => !excluir.includes(p.id) && !evoluiSemNivel(p, porSlug))
    .filter((p) => biomaDoPokemon(p) === bioma.id)
    .map((p) => {
      const [nivelMin, nivelMax] = faixas.get(p.id)!;
      const base = baseDaLinha(p, porSlug);
      const peso = PESO_BASE_LINHA + base.taxaCaptura * PESO_POR_TAXA;
      const chanceFixa = ehLendario(p) ? CHANCE_LENDARIO : TODOS_INICIAIS.includes(base.id) ? CHANCE_INICIAL : null;
      return { pokemon: p, peso, linha: base.id, chanceFixa, nivelMin, nivelMax };
    });
}

/**
 * Faixa de nível dos encontros (igual em todos os biomas): do teto − 10 até o teto.
 * O teto é 2× o nível de treinador; o jogador pode escolher um teto MENOR (nunca maior).
 * Ex.: treinador 20 → 30–40; escolhendo 10 → 1–10.
 */
export function faixaDosEncontros(_bioma: Bioma, nivelTreinador: number, tetoEscolhido: number | null = null): Faixa {
  const maximo = nivelMaximoEncontro(nivelTreinador);
  const teto = tetoEscolhido === null ? maximo : Math.max(1, Math.min(maximo, tetoEscolhido));
  return [Math.max(1, teto - FAIXA_NIVEIS_ENCONTRO), teto];
}


/** Aplica os ajustes de administrador nos pesos da tabela (sem lendários no bioma, "só lendários" é ignorado). */
export function ajustarTabela(tabela: EntradaTabela[], ajustes: AjustesEncontro): EntradaTabela[] {
  let nova = tabela
    .map((e) => (ehLendario(e.pokemon) ? { ...e, chanceFixa: (e.chanceFixa ?? 0) * ajustes.multLendario } : e))
    .filter((e) => e.chanceFixa !== 0);
  if (ajustes.soLendarios && nova.some((e) => ehLendario(e.pokemon))) nova = nova.filter((e) => ehLendario(e.pokemon));
  return nova;
}

/** Encontro de teste: espécie e/ou nível escolhidos pelo administrador. */
export function encontroForcado(pokemon: PokemonBase, [min, max]: Faixa, ajustes: AjustesEncontro, aleatorio = Math.random): Encontro {
  let nivel = ajustes.nivel ?? min + Math.floor(aleatorio() * (max - min + 1));
  if (ajustes.nivel === null && ehLendario(pokemon)) nivel = Math.max(NIVEL_LENDARIO, nivel);
  return { pokemon, nivel: Math.max(1, Math.min(100, nivel)), shiny: aleatorio() < ajustes.chanceShiny };
}

const cabe = (e: EntradaTabela, nivel: number) => nivel >= e.nivelMin && nivel <= e.nivelMax;

interface Linha {
  peso: number;
  chanceFixa: number | null;
  formas: EntradaTabela[];
  /** níveis da faixa em que alguma forma da linha existe */
  niveis: number[];
}

/** Agrupa a tabela por linha evolutiva, só com as linhas que têm alguma forma na faixa. */
function linhasNaFaixa(tabela: EntradaTabela[], [min, max]: Faixa): Linha[] {
  const grupos = new Map<number, EntradaTabela[]>();
  for (const e of tabela) grupos.set(e.linha, [...(grupos.get(e.linha) ?? []), e]);
  const linhas: Linha[] = [];
  for (const formas of grupos.values()) {
    const niveis: number[] = [];
    for (let n = min; n <= max; n++) if (formas.some((e) => cabe(e, n))) niveis.push(n);
    if (niveis.length) linhas.push({ peso: Math.max(...formas.map((e) => e.peso)), chanceFixa: formas[0].chanceFixa, formas, niveis });
  }
  return linhas;
}

/**
 * Chance (0 a 1) de cada linha sair: as de chance fixa (iniciais 1/10 mil, lendários 1/20 mil) ficam com ela,
 * e as outras dividem o resto pelo peso. Sem linhas comuns (admin "só lendários"), as fixas dividem tudo.
 */
function chancesDasLinhas(linhas: Linha[]): number[] {
  const fixas = linhas.reduce((soma, l) => soma + (l.chanceFixa ?? 0), 0);
  const pesoComuns = linhas.reduce((soma, l) => soma + (l.chanceFixa === null ? l.peso : 0), 0);
  if (!pesoComuns || fixas >= 1) return linhas.map((l) => (l.chanceFixa ?? 0) / fixas);
  return linhas.map((l) => (l.chanceFixa !== null ? l.chanceFixa : ((1 - fixas) * l.peso) / pesoComuns));
}

/**
 * Probabilidade (0 a 1) de cada entrada sair na faixa de nível, na mesma ordem da tabela.
 * Primeiro sai a linha (pelo peso), depois o nível (dentro da faixa), e o nível decide a forma.
 */
export function probabilidades(tabela: EntradaTabela[], faixa: Faixa): number[] {
  const chances = new Map<EntradaTabela, number>();
  const linhas = linhasNaFaixa(tabela, faixa);
  const chanceLinha = chancesDasLinhas(linhas);
  linhas.forEach((l, i) => {
    for (const n of l.niveis) {
      const formas = l.formas.filter((e) => cabe(e, n));
      for (const e of formas) chances.set(e, (chances.get(e) ?? 0) + chanceLinha[i] / l.niveis.length / formas.length);
    }
  });
  return tabela.map((e) => chances.get(e) ?? 0);
}

function sortearPorPeso<T extends { peso: number }>(itens: T[], aleatorio: () => number): T {
  let sorteio = aleatorio() * itens.reduce((soma, i) => soma + i.peso, 0);
  for (const item of itens) {
    sorteio -= item.peso;
    if (sorteio < 0) return item;
  }
  return itens[itens.length - 1];
}

/** Sorteia a linha evolutiva (pelo peso), depois o nível dentro da faixa, e o nível decide a forma (Caterpie/Metapod/Butterfree). */
export function sortearEncontro(tabela: EntradaTabela[], [min, max]: Faixa, aleatorio = Math.random, ajustes = AJUSTES_PADRAO): Encontro {
  if (ajustes.nivel !== null) min = max = ajustes.nivel;
  const linhas = linhasNaFaixa(tabela, [min, max]);
  let escolhido: EntradaTabela;
  let nivel: number;
  if (linhas.length) {
    const chanceLinha = chancesDasLinhas(linhas);
    const linha = sortearPorPeso(linhas.map((l, i) => ({ ...l, peso: chanceLinha[i] })), aleatorio);
    nivel = linha.niveis[Math.floor(aleatorio() * linha.niveis.length)];
    const formas = linha.formas.filter((e) => cabe(e, nivel));
    escolhido = formas[Math.floor(aleatorio() * formas.length)];
  } else {
    // nenhum Pokémon do bioma nessa faixa: usa os de faixa mais próxima
    nivel = min + Math.floor(aleatorio() * (max - min + 1));
    const distancia = (e: EntradaTabela) => (nivel < e.nivelMin ? e.nivelMin - nivel : nivel > e.nivelMax ? nivel - e.nivelMax : 0);
    const menor = Math.min(...tabela.map(distancia));
    escolhido = sortearPorPeso(tabela.filter((e) => distancia(e) === menor), aleatorio);
    nivel = Math.max(escolhido.nivelMin, Math.min(escolhido.nivelMax, nivel));
  }
  if (ajustes.nivel !== null) nivel = ajustes.nivel;
  else if (ehLendario(escolhido.pokemon)) nivel = Math.max(NIVEL_LENDARIO, nivel);
  return { pokemon: escolhido.pokemon, nivel, shiny: aleatorio() < ajustes.chanceShiny };
}
