// Categorias de Pokémon para filtros (Pokédex e Database): raridade pela taxa de captura oficial
// (mais fácil de capturar = mais comum, a mesma regra do sorteio dos encontros) e grupos especiais.
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

export function categoriasDoPokemon(p: PokemonBase): string[] {
  const tags = especie(p.id).tags ?? [];
  const lista: string[] = [];
  if (p.lendario) lista.push('lendario');
  if (p.mitico) lista.push('mitico');
  if (tags.includes('Ultra Beast')) lista.push('ultra');
  if (tags.includes('Paradox')) lista.push('paradoxo');
  if (p.bebe) lista.push('bebe');
  if (REGIOES.some((r) => r.iniciais.includes(p.id))) lista.push('inicial');
  // raridade só para os "normais"
  if (!p.lendario && !p.mitico && !tags.includes('Ultra Beast') && !tags.includes('Paradox'))
    lista.push(p.taxaCaptura >= 120 ? 'comum' : p.taxaCaptura >= 60 ? 'incomum' : 'raro');
  return lista;
}
