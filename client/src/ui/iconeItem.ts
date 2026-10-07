// Imagens oficiais dos itens: folha de ícones do Pokémon Showdown (todos os itens de batalha,
// bolas, pedras e frutas) e sprites da PokéAPI (remédios e discos de TM/TR por tipo).
import { Dex } from '@pkmn/sim';
import type { ItemLoja } from '../../../shared/loja';
import { ITENS } from '../../../shared/itens';
import { el } from './dom';

const FOLHA_SHOWDOWN = 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png';
const ITENS_POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
/** A folha tem 16 ícones de 24×24 por linha. */
const TAMANHO = 24;
const POR_LINHA = 16;


/** Ícone do Ovo Misterioso (desenho próprio, cor do tier como os discos de TM têm a cor do tipo). */
export function iconeOvo(tier: string): HTMLElement {
  const [base, sombra, pinta, contorno] = tier === 'S' ? ['#ffd23a', '#e09a12', '#fff4c0', '#7a4a00'] : ['#b57cff', '#7a3ad8', '#ecd9ff', '#2e0a5e'];
  const caixa = el('div', { class: `icone-ovo ovo-${tier.toLowerCase()}` });
  caixa.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M12 2.5c4.2 0 7.5 6.2 7.5 11.2 0 4.6-3.4 7.8-7.5 7.8s-7.5-3.2-7.5-7.8C4.5 8.7 7.8 2.5 12 2.5z" fill="${base}" stroke="${contorno}" stroke-width="1.4"/>
    <path d="M6.2 15.5c.6 3 3 4.9 5.8 4.9s5.2-1.9 5.8-4.9c-1.6 1.6-3.6 2.4-5.8 2.4s-4.2-.8-5.8-2.4z" fill="${sombra}"/>
    <circle cx="9.3" cy="9" r="1.7" fill="${pinta}"/><circle cx="14.6" cy="12.2" r="2.1" fill="${pinta}"/><circle cx="9.6" cy="15" r="1.2" fill="${pinta}"/>
    <path d="M8.2 5.6c.8-1 1.8-1.6 2.7-1.8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".8"/>
    <text x="12" y="23.4" text-anchor="middle" font-size="6.5" font-weight="900" font-family="Arial Black, sans-serif" fill="#fff" stroke="${contorno}" stroke-width="1.6" paint-order="stroke">${tier}</text>
  </svg>`;
  return caixa;
}

export function iconeItem(item: Pick<ItemLoja, 'id' | 'categoria' | 'golpe' | 'sprite' | 'imagem'>): HTMLElement {
  const reserva = () => el('div', { class: `icone-item ${item.id} cat-${item.categoria}` });
  if (item.categoria === 'ovos') return iconeOvo(item.id.endsWith('-s') ? 'S' : 'A');
  if (item.imagem) {
    const img = el('img', { class: 'icone-png icone-imagem', src: item.imagem, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(reserva()), { once: true });
    return el('div', { class: 'icone-caixa' }, img);
  }

  const sd = Dex.items.get(item.id);
  if (sd.exists && sd.spritenum) {
    const n = sd.spritenum;
    return el('div', {
      class: 'icone-sd',
      style: { backgroundImage: `url(${FOLHA_SHOWDOWN})`, backgroundPosition: `-${(n % POR_LINHA) * TAMANHO}px -${Math.floor(n / POR_LINHA) * TAMANHO}px` },
    });
  }

  // remédios do jogo (não existem no Showdown): imagem da PokéAPI
  let arquivo: string | undefined = item.sprite ?? ITENS[item.id]?.sprite;
  // TRs não têm imagem própria na PokéAPI: usam o disco de TM do mesmo tipo
  if (item.golpe) arquivo = `tm-${Dex.moves.get(item.golpe).type.toLowerCase()}`;
  if (!arquivo) return reserva();

  const img = el('img', { class: 'icone-png', src: `${ITENS_POKEAPI}/${arquivo}.png`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(reserva()), { once: true });
  return el('div', { class: 'icone-caixa' }, img);
}
