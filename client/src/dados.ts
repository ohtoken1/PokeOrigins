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
import { Dex } from '@pkmn/sim';
import { FORMAS_REGIONAIS, idDaFormaRegional, montarFormaRegional } from '../../shared/formasRegionais';

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

// Formas regionais (Alola, Galar, Paldea; Hisui ainda não): entram na lista da região delas, com número próprio
for (const lista of Object.keys(POKEMONS_POR_REGIAO)) POKEMONS_POR_REGIAO[lista] = [...POKEMONS_POR_REGIAO[lista]];
for (const forma of FORMAS_REGIONAIS) {
  const normal = porId.get(Dex.species.get(forma.showdown).num);
  if (!normal) continue;
  const p = montarFormaRegional(forma, normal, (n) => porId.get(n)?.slug);
  POKEMONS_POR_REGIAO[forma.regiao].push(p);
  porId.set(p.id, p);
}
// quem evolui de uma forma regional (Clodsire ← Paldean Wooper, Obstagoon ← Galarian Linoone…)
for (const p of porId.values()) {
  if (p.numeroDex) continue;
  const prevo = Dex.species.get(Dex.species.get(String(p.slug)).prevo || '');
  const regional = prevo.exists ? idDaFormaRegional(prevo.name) : undefined;
  if (regional) porId.set(p.id, Object.assign(p, { evoluiDe: porId.get(regional)!.slug }));
}

/** Todos os Pokémon carregados (todas as regiões), em ordem da Pokédex nacional. */
// formas regionais logo depois da espécie normal (Rattata, Alolan Rattata, Raticate…)
const TODOS = Object.values(POKEMONS_POR_REGIAO).flat().sort((a, b) => (a.numeroDex ?? a.id) - (b.numeroDex ?? b.id) || a.id - b.id);
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
