// Categorias de Pokémon para filtros (Pokédex e Database): raridade pela taxa de captura oficial
// (mais fácil de capturar = mais comum, a mesma regra do sorteio dos encontros) e grupos especiais.
import { Dex } from '@pkmn/sim';
import { especie } from './batalha/pokemon';
import { REGIOES } from './regioes';
import type { PokemonBase } from './tipos';

export const CATEGORIAS_POKEMON: [id: string, nome: string][] = [
  ['comum', 'Comum'],
  ['incomum', 'Incomum'],
  ['raro', 'Raro'],
  ['inicial', 'Inicial'],
  ['bebe', 'Bebê'],
  ['lendario', 'Lendário'],
  ['mitico', 'Mítico'],
  ['ultra', 'Ultra Beast'],
  ['paradoxo', 'Paradoxo'],
];

/** Número da primeira forma da linha evolutiva (Charizard → Charmander). */
function formaBase(numero: number): number {
  let s = especie(numero);
  while (s.prevo) {
    const anterior = Dex.species.get(s.prevo);
    if (!anterior.exists) break;
    s = anterior;
  }
  return s.num;
}

export function categoriasDoPokemon(p: PokemonBase): string[] {
  const tags = especie(p.id).tags ?? [];
  const lista: string[] = [];
  if (p.lendario) lista.push('lendario');
  if (p.mitico) lista.push('mitico');
  if (tags.includes('Ultra Beast')) lista.push('ultra');
  if (tags.includes('Paradox')) lista.push('paradoxo');
  if (p.bebe) lista.push('bebe');
  // inicial = os 3 de cada região e as evoluções deles (Ivysaur, Venusaur…)
  if (REGIOES.some((r) => r.iniciais.includes(formaBase(p.id)))) lista.push('inicial');
  // raridade só para os "normais"
  if (!p.lendario && !p.mitico && !tags.includes('Ultra Beast') && !tags.includes('Paradox'))
    lista.push(p.taxaCaptura >= 120 ? 'comum' : p.taxaCaptura >= 60 ? 'incomum' : 'raro');
  return lista;
}
