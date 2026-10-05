import kanto from '../../shared/data/pokemon-kanto.json';
import type { PokemonBase } from '../../shared/tipos';

// Por enquanto só Kanto. As outras regiões entram aqui (com import dinâmico) quando forem liberadas.
const POKEMONS_POR_REGIAO: Record<string, PokemonBase[]> = {
  kanto: kanto as unknown as PokemonBase[],
};

const porId = new Map<number, PokemonBase>();
for (const lista of Object.values(POKEMONS_POR_REGIAO)) for (const p of lista) porId.set(p.id, p);

export function pokemonsDaRegiao(regiao: string): PokemonBase[] {
  return POKEMONS_POR_REGIAO[regiao] ?? [];
}

export function pokemonPorId(id: number): PokemonBase {
  const p = porId.get(id);
  if (!p) throw new Error(`Pokémon ${id} não carregado`);
  return p;
}
