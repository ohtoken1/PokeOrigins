// Sorteio de Pokémon selvagens. Fica em shared/ porque, no MMO, quem vai sortear é o
// servidor (para ninguém trapacear); por enquanto o cliente usa o mesmo código.
import { BIOMAS, type Bioma } from './biomas';
import { nivelDeEvolucao } from './batalha/pokemon';
import type { PokemonBase } from './tipos';
import { FAIXA_NIVEIS_ENCONTRO, nivelMaximoEncontro } from './treinador';

/** Chance de um Pokémon ser shiny. O original é 1/4096; aqui é configurável. */
export const CHANCE_SHINY = 1 / 512;
/** Chance de aparecer um Pokémon a cada passo (1 = todo passo). */
export const CHANCE_ENCONTRO_POR_PASSO = 1;
/** Peso fixo de lendários e míticos no sorteio (um comum tem ~45 a 255): ~0,1% num bioma. */
export const PESO_LENDARIO = 1;
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
  /** Peso no sorteio; quanto maior, mais comum. Usa a taxa de captura oficial. */
  peso: number;
  /** Faixa de nível em que esta forma aparece (ex.: Charmander 1–15, Charmeleon 16–35, Charizard 36–100). */
  nivelMin: number;
  nivelMax: number;
}

export interface Encontro {
  pokemon: PokemonBase;
  nivel: number;
  shiny: boolean;
}

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
      return { pokemon: p, peso: p.lendario || p.mitico ? PESO_LENDARIO : Math.max(1, p.taxaCaptura), nivelMin, nivelMax };
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

const ehLendario = (p: PokemonBase) => p.lendario || p.mitico;

/** Aplica os ajustes de administrador nos pesos da tabela (sem lendários no bioma, "só lendários" é ignorado). */
export function ajustarTabela(tabela: EntradaTabela[], ajustes: AjustesEncontro): EntradaTabela[] {
  let nova = tabela.map((e) => (ehLendario(e.pokemon) ? { ...e, peso: e.peso * ajustes.multLendario } : e)).filter((e) => e.peso > 0);
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

/** Probabilidade (0 a 1) de cada entrada sair na faixa de nível, na mesma ordem da tabela. */
export function probabilidades(tabela: EntradaTabela[], [min, max]: Faixa): number[] {
  const chances = tabela.map(() => 0);
  for (let nivel = min; nivel <= max; nivel++) {
    const total = tabela.reduce((soma, e) => soma + (cabe(e, nivel) ? e.peso : 0), 0);
    if (!total) continue;
    tabela.forEach((e, i) => {
      if (cabe(e, nivel)) chances[i] += e.peso / total / (max - min + 1);
    });
  }
  return chances;
}

/** Sorteia o nível dentro da faixa e depois um Pokémon cuja forma existe nesse nível. */
export function sortearEncontro(tabela: EntradaTabela[], [min, max]: Faixa, aleatorio = Math.random, ajustes = AJUSTES_PADRAO): Encontro {
  if (ajustes.nivel !== null) min = max = ajustes.nivel;
  let nivel = min + Math.floor(aleatorio() * (max - min + 1));
  let candidatos = tabela.filter((e) => cabe(e, nivel));
  if (!candidatos.length) {
    // nenhum Pokémon do bioma nesse nível: usa os de faixa mais próxima
    const distancia = (e: EntradaTabela) => (nivel < e.nivelMin ? e.nivelMin - nivel : nivel - e.nivelMax);
    const menor = Math.min(...tabela.map(distancia));
    candidatos = tabela.filter((e) => distancia(e) === menor);
  }
  const total = candidatos.reduce((soma, e) => soma + e.peso, 0);
  let sorteio = aleatorio() * total;
  let escolhido = candidatos[candidatos.length - 1];
  for (const entrada of candidatos) {
    sorteio -= entrada.peso;
    if (sorteio < 0) {
      escolhido = entrada;
      break;
    }
  }
  nivel = Math.max(escolhido.nivelMin, Math.min(escolhido.nivelMax, nivel));
  if (ajustes.nivel !== null) nivel = ajustes.nivel;
  else if (ehLendario(escolhido.pokemon)) nivel = Math.max(NIVEL_LENDARIO, nivel);
  return { pokemon: escolhido.pokemon, nivel, shiny: aleatorio() < ajustes.chanceShiny };
}
