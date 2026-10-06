import kanto from '../../shared/data/pokemon-kanto.json';
import johto from '../../shared/data/pokemon-johto.json';
import type { PokemonBase } from '../../shared/tipos';

// Regiões liberadas: Kanto e Johto. As outras entram aqui quando forem liberadas.
const POKEMONS_POR_REGIAO: Record<string, PokemonBase[]> = {
  kanto: kanto as unknown as PokemonBase[],
  johto: johto as unknown as PokemonBase[],
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
