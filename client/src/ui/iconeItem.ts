// Imagens oficiais dos itens: folha de ícones do Pokémon Showdown (todos os itens de batalha,
// bolas, pedras e frutas) e sprites da PokéAPI (remédios e discos de TM/TR por tipo).
import { Dex } from '@pkmn/sim';
import type { ItemLoja } from '../../../shared/loja';
import { el } from './dom';

const FOLHA_SHOWDOWN = 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png';
const ITENS_POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
/** A folha tem 16 ícones de 24×24 por linha. */
const TAMANHO = 24;
const POR_LINHA = 16;

/** Remédios do jogo que não existem no Showdown: nome do arquivo na PokéAPI. */
const REMEDIOS: Record<string, string> = {
  potion: 'potion',
  superpotion: 'super-potion',
  hyperpotion: 'hyper-potion',
  revive: 'revive',
  fullheal: 'full-heal',
};

export function iconeItem(item: Pick<ItemLoja, 'id' | 'categoria' | 'golpe'>): HTMLElement {
  const reserva = () => el('div', { class: `icone-item ${item.id} cat-${item.categoria}` });

  const sd = Dex.items.get(item.id);
  if (sd.exists && sd.spritenum) {
    const n = sd.spritenum;
    return el('div', {
      class: 'icone-sd',
      style: { backgroundImage: `url(${FOLHA_SHOWDOWN})`, backgroundPosition: `-${(n % POR_LINHA) * TAMANHO}px -${Math.floor(n / POR_LINHA) * TAMANHO}px` },
    });
  }

  let arquivo: string | undefined = REMEDIOS[item.id];
  // TRs não têm imagem própria na PokéAPI: usam o disco de TM do mesmo tipo
  if (item.golpe) arquivo = `tm-${Dex.moves.get(item.golpe).type.toLowerCase()}`;
  if (!arquivo) return reserva();

  const img = el('img', { class: 'icone-png', src: `${ITENS_POKEAPI}/${arquivo}.png`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(reserva()), { once: true });
  return el('div', { class: 'icone-caixa' }, img);
}
