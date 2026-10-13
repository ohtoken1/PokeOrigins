// Como cada espécie surge a partir da forma anterior, em português (Pokédex e lista do bioma).
import { Dex } from '@pkmn/sim';
import type { PokemonBase } from './tipos';
import { especie, nivelDeEvolucao } from './batalha/pokemon';
import { CONDICAO_SYLVEON } from './evolucoesEspeciais';
import { NOME_DO_ITEM_DE_EVOLUCAO, itensQueEvoluemPara } from './formasPorItem';

const CONDICOES: Record<string, string> = {
  'during the day': 'de dia',
  'at night': 'à noite',
  'with an Atk stat > its Def stat': 'Attack maior que Defense',
  'with an Atk stat < its Def stat': 'Attack menor que Defense',
  'with an Atk stat equal to its Def stat': 'Attack igual a Defense',
};

export function comoEvolui(p: Pick<PokemonBase, 'id'>): string {
  const s = especie(p.id);
  const condicao = CONDICOES[s.evoCondition ?? ''] ? ` (${CONDICOES[s.evoCondition!]})` : '';
  const nivel = nivelDeEvolucao(p.id);
  if (nivel) return `Nv. ${nivel}${condicao}`;
  // itens nossos (Peat Block, Temporal Stone…) e os Sweets do Milcery
  const itens = itensQueEvoluemPara(p.id);
  if (itens.length > 1 && itens.every((i) => i.endsWith('sweet'))) return 'Usar um Sweet';
  if (itens.length) return `Usar ${itens.map((i) => NOME_DO_ITEM_DE_EVOLUCAO[i] ?? Dex.items.get(i).name).join(' ou ')}`;
  if (s.evoCondition === CONDICAO_SYLVEON) return 'Amizade + golpe Fairy';
  switch (s.evoType) {
    case 'useItem':
    case 'levelHold':
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
