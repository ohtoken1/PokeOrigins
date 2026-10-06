// Sorteio de Pokémon selvagens. Fica em shared/ porque, no MMO, quem vai sortear é o
// servidor (para ninguém trapacear); por enquanto o cliente usa o mesmo código.
import { BIOMAS, type Bioma } from './biomas';
import { nivelDeEvolucao } from './batalha/pokemon';
import type { PokemonBase } from './tipos';
import { bonusNivelSelvagem } from './treinador';

/** Chance de um Pokémon ser shiny. O original é 1/4096; aqui é configurável. */
export const CHANCE_SHINY = 1 / 512;
/** Chance de aparecer um Pokémon a cada passo (1 = todo passo). */
export const CHANCE_ENCONTRO_POR_PASSO = 1;
/** Peso fixo de lendários e míticos no sorteio (um comum tem ~45 a 255): ~0,1% num bioma. */
export const PESO_LENDARIO = 1;
/** Lendários e míticos só aparecem em encontros deste nível para cima. */
export const NIVEL_LENDARIO = 50;
/** Quando o jogador escolhe o nível dos encontros, eles variam este tanto para cima/baixo. */
export const VARIACAO_NIVEL_ESCOLHIDO = 2;

export type Faixa = [number, number];

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
 * Formas que só se obtêm evoluindo por pedra, troca ou amizade (ex.: Raichu, Alakazam, Gengar):
 * não aparecem soltas nos mapas (pedido do dono).
 */
function evoluiSemNivel(p: PokemonBase, porSlug: Map<string, PokemonBase>): boolean {
  return !!(p.evoluiDe && porSlug.has(p.evoluiDe) && nivelDeEvolucao(p.id) === null);
}

/** Faixa de nível de cada forma, para a mesma linha evolutiva não aparecer repetida. */
function faixasDeNivel(pokemons: PokemonBase[]): Map<number, Faixa> {
  const porSlug = new Map(pokemons.map((p) => [p.slug, p]));
  const minimos = new Map<number, number>();
  const nivelMin = (p: PokemonBase): number => {
    const salvo = minimos.get(p.id);
    if (salvo) return salvo;
    let min = 1;
    const anterior = p.evoluiDe ? porSlug.get(p.evoluiDe) : undefined;
    if (anterior) {
      const minAnterior = nivelMin(anterior);
      min = Math.max(minAnterior + 1, nivelDeEvolucao(p.id) ?? minAnterior + 1);
    }
    if (p.lendario || p.mitico) min = Math.max(min, NIVEL_LENDARIO);
    min = Math.min(100, min);
    minimos.set(p.id, min);
    return min;
  };

  const faixas = new Map<number, Faixa>();
  for (const p of pokemons) {
    // evoluções que não aparecem no mapa não limitam a faixa (Kadabra vai até o 100, já que Alakazam não aparece)
    const proximas = pokemons.filter((q) => q.evoluiDe === p.slug && !evoluiSemNivel(q, porSlug)).map(nivelMin);
    const max = proximas.length ? Math.min(...proximas) - 1 : 100;
    faixas.set(p.id, [nivelMin(p), Math.max(nivelMin(p), max)]);
  }
  return faixas;
}

/** `pokemons` = todos da região (as faixas dependem de evoluções que podem morar em outro bioma). */
export function montarTabela(bioma: Bioma, pokemons: PokemonBase[], excluir: number[] = []): EntradaTabela[] {
  const faixas = faixasDeNivel(pokemons);
  const porSlug = new Map(pokemons.map((p) => [p.slug, p]));
  return pokemons
    .filter((p) => !excluir.includes(p.id) && !evoluiSemNivel(p, porSlug))
    .filter((p) => biomaDoPokemon(p) === bioma.id)
    .map((p) => {
      const [nivelMin, nivelMax] = faixas.get(p.id)!;
      return { pokemon: p, peso: p.lendario || p.mitico ? PESO_LENDARIO : Math.max(1, p.taxaCaptura), nivelMin, nivelMax };
    });
}

/**
 * Faixa de nível dos encontros: a do bioma somada ao bônus do treinador (até 100), ou,
 * se o jogador escolheu um nível, esse nível com uma pequena variação (sem passar do máximo natural).
 */
export function faixaDosEncontros(bioma: Bioma, nivelTreinador: number, nivelEscolhido: number | null = null): Faixa {
  const bonus = bonusNivelSelvagem(nivelTreinador);
  const natural: Faixa = [Math.min(100, bioma.nivel[0] + bonus), Math.min(100, bioma.nivel[1] + bonus)];
  if (nivelEscolhido === null) return natural;
  const centro = Math.max(1, Math.min(natural[1], nivelEscolhido));
  return [Math.max(1, centro - VARIACAO_NIVEL_ESCOLHIDO), Math.min(natural[1], centro + VARIACAO_NIVEL_ESCOLHIDO)];
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
export function sortearEncontro(tabela: EntradaTabela[], [min, max]: Faixa, aleatorio = Math.random): Encontro {
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
  return { pokemon: escolhido.pokemon, nivel, shiny: aleatorio() < CHANCE_SHINY };
}
