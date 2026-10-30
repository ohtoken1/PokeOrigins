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
import { pokemonsDosMapas } from '../../shared/encontros';
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

// Formas regionais (Alola, Galar, Paldea e Hisui — estas em Kalos): entram na lista da região delas, com número próprio
for (const lista of Object.keys(POKEMONS_POR_REGIAO)) POKEMONS_POR_REGIAO[lista] = [...POKEMONS_POR_REGIAO[lista]];
const SO_CADASTRADOS: PokemonBase[] = [];
for (const forma of FORMAS_REGIONAIS) {
  const normal = porId.get(Dex.species.get(forma.showdown).num);
  if (!normal) continue;
  const p = montarFormaRegional(forma, normal, (n) => porId.get(n)?.slug);
  // as que ainda não se obtêm jogando ficam fora das listas de região (mapas, Pokédex da região)
  if (forma.foraDosMapas) SO_CADASTRADOS.push(p);
  else POKEMONS_POR_REGIAO[forma.regiao].push(p);
  porId.set(p.id, p);
}
// quem evolui de uma forma regional (Clodsire ← Paldean Wooper, Obstagoon ← Galarian Linoone…)
for (const p of porId.values()) {
  if (p.numeroDex) continue;
  const prevo = Dex.species.get(Dex.species.get(String(p.slug)).prevo || '');
  const regional = prevo.exists ? idDaFormaRegional(prevo.name) : undefined;
  if (regional) porId.set(p.id, Object.assign(p, { evoluiDe: porId.get(regional)!.slug }));
}

// a PokéAPI dá o nome da forma anterior sem a forma (o slug não existe): a linha se quebrava e Jellicent/Gourgeist
// apareciam nos mapas do nível 1 ao 100, nasciam do ovo já evoluídos e o Homem Suspeito não voltava a evolução
const CORRIGIR_EVOLUI_DE: Record<string, string> = { frillish: 'frillish-male', pumpkaboo: 'pumpkaboo-average', basculin: 'basculin-white-striped' };
{
  const slugs = new Set([...porId.values()].map((p) => p.slug));
  for (const p of porId.values()) {
    const certo = p.evoluiDe && !slugs.has(p.evoluiDe) ? CORRIGIR_EVOLUI_DE[p.evoluiDe] : undefined;
    if (certo && slugs.has(certo)) p.evoluiDe = certo;
  }
}

/** Todos os Pokémon carregados (todas as regiões), em ordem da Pokédex nacional. */
// formas regionais logo depois da espécie normal (Rattata, Alolan Rattata, Raticate…)
const TODOS = [...Object.values(POKEMONS_POR_REGIAO).flat(), ...SO_CADASTRADOS].sort((a, b) => (a.numeroDex ?? a.id) - (b.numeroDex ?? b.id) || a.id - b.id);
export function todosOsPokemons(): PokemonBase[] {
  return TODOS;
}

export function pokemonsDaRegiao(regiao: string): PokemonBase[] {
  return POKEMONS_POR_REGIAO[regiao] ?? [];
}

/** Quem aparece nos mapas da região: os dela + as linhas que a staff pôs lá também (Administração → Biomas). */
export const pokemonsDosMapasDe = (regiao: string): PokemonBase[] => pokemonsDosMapas(regiao, pokemonsDaRegiao(regiao), TODOS);

export function pokemonPorId(id: number): PokemonBase {
  const p = porId.get(id);
  if (!p) throw new Error(`Pokémon ${id} não carregado`);
  return p;
}
