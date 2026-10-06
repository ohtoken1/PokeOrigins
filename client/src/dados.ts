import kanto from '../../shared/data/pokemon-kanto.json';
import johto from '../../shared/data/pokemon-johto.json';
import hoenn from '../../shared/data/pokemon-hoenn.json';
import sinnoh from '../../shared/data/pokemon-sinnoh.json';
import unova from '../../shared/data/pokemon-unova.json';
import kalos from '../../shared/data/pokemon-kalos.json';
import alola from '../../shared/data/pokemon-alola.json';
import galar from '../../shared/data/pokemon-galar.json';
import paldea from '../../shared/data/pokemon-paldea.json';
import type { PokemonBase } from '../../shared/tipos';

// Todas as regiões (Kanto a Paldea, Pokédex nacional 1–1025).
const POKEMONS_POR_REGIAO: Record<string, PokemonBase[]> = {
  kanto: kanto as unknown as PokemonBase[],
  johto: johto as unknown as PokemonBase[],
  hoenn: hoenn as unknown as PokemonBase[],
  sinnoh: sinnoh as unknown as PokemonBase[],
  unova: unova as unknown as PokemonBase[],
  kalos: kalos as unknown as PokemonBase[],
  alola: alola as unknown as PokemonBase[],
  galar: galar as unknown as PokemonBase[],
  paldea: paldea as unknown as PokemonBase[],
};

const porId = new Map<number, PokemonBase>();
for (const lista of Object.values(POKEMONS_POR_REGIAO)) for (const p of lista) porId.set(p.id, p);

/** Todos os Pokémon carregados (todas as regiões), em ordem da Pokédex nacional. */
const TODOS = Object.values(POKEMONS_POR_REGIAO).flat().sort((a, b) => a.id - b.id);
export function todosOsPokemons(): PokemonBase[] {
  return TODOS;
}

export function pokemonsDaRegiao(regiao: string): PokemonBase[] {
  return POKEMONS_POR_REGIAO[regiao] ?? [];
}

export function pokemonPorId(id: number): PokemonBase {
  const p = porId.get(id);
  if (!p) throw new Error(`Pokémon ${id} não carregado`);
  return p;
}
