// Como cada espécie surge a partir da forma anterior, em português (Pokédex e lista do bioma).
import type { PokemonBase } from './tipos';
import { especie, nivelDeEvolucao } from './batalha/pokemon';

const CONDICOES: Record<string, string> = { 'during the day': 'de dia', 'at night': 'à noite' };

export function comoEvolui(p: Pick<PokemonBase, 'id'>): string {
  const s = especie(p.id);
  const nivel = nivelDeEvolucao(p.id);
  if (nivel) return `Nv. ${nivel}`;
  const condicao = s.evoCondition ? ` (${CONDICOES[s.evoCondition] ?? s.evoCondition})` : '';
  switch (s.evoType) {
    case 'useItem':
      return `Usar ${s.evoItem}`;
    case 'trade':
      return s.evoItem ? `Troca segurando ${s.evoItem}` : 'Troca';
    case 'levelFriendship':
      return `Amizade${condicao}`;
    case 'levelMove':
      return `Sabendo ${s.evoMove}`;
    default:
      return s.evoLevel ? `Nv. ${s.evoLevel}${condicao}` : s.evoItem ? `Usar ${s.evoItem}` : 'Condição especial';
  }
}
