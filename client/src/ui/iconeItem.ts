// Imagens oficiais dos itens: folha de ícones do Pokémon Showdown (todos os itens de batalha,
// bolas, pedras e frutas) e sprites da PokéAPI (remédios e discos de TM/TR por tipo).
import { Dex } from '@pkmn/sim';
import type { ItemLoja } from '../../../shared/loja';
import { ITENS } from '../../../shared/itens';
import { corTipo, el, spritePokemon } from './dom';
import { ovoPorId } from '../../../shared/ovos';
import { pokemonPorId } from '../dados';

/** Ícone de skin: o Pokémon pequeno numa moldura dourada (prateada no shiny). */
export function iconeSkin(especie: number, shiny: boolean): HTMLElement {
  return el('div', { class: `icone-skin ${shiny ? 'skin-shiny' : ''}` }, spritePokemon(pokemonPorId(especie), { shiny, animado: false }));
}

const FOLHA_SHOWDOWN = 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png';
const ITENS_POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
/** A folha tem 16 ícones de 24×24 por linha. */
const TAMANHO = 24;
const POR_LINHA = 16;


/** Ícone do Ovo Misterioso (desenho próprio, cor do tier como os discos de TM têm a cor do tipo). */
const CORES_OVO: Record<string, [string, string, string, string]> = {
  S: ['#ffd23a', '#e09a12', '#fff4c0', '#7a4a00'],
  A: ['#b57cff', '#7a3ad8', '#ecd9ff', '#2e0a5e'],
  L: ['#ff8a3d', '#d4471a', '#ffe0b8', '#5e1600'],
  I: ['#6fdc7a', '#2e9e45', '#e2ffd9', '#0f4a1c'],
  C: ['#c9d3e0', '#8b97a8', '#f4f7fb', '#2f3a4a'],
  // Ovo Comum
  N: ['#5cc8e8', '#2a8fb8', '#dff6ff', '#0c3f58'],
};

export function iconeOvo(letra: string, rotulo = letra, nt = false): HTMLElement {
  const tier = rotulo;
  const [base, sombra, pinta, contorno] = CORES_OVO[letra] ?? CORES_OVO.A;
  const caixa = el('div', { class: `icone-ovo ovo-${letra.toLowerCase()}${nt ? ' ovo-nt' : ''}`, title: nt ? 'NT · não pode ser trocado' : '' });
  caixa.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M12 2.5c4.2 0 7.5 6.2 7.5 11.2 0 4.6-3.4 7.8-7.5 7.8s-7.5-3.2-7.5-7.8C4.5 8.7 7.8 2.5 12 2.5z" fill="${base}" stroke="${contorno}" stroke-width="1.4"/>
    <path d="M6.2 15.5c.6 3 3 4.9 5.8 4.9s5.2-1.9 5.8-4.9c-1.6 1.6-3.6 2.4-5.8 2.4s-4.2-.8-5.8-2.4z" fill="${sombra}"/>
    <circle cx="9.3" cy="9" r="1.7" fill="${pinta}"/><circle cx="14.6" cy="12.2" r="2.1" fill="${pinta}"/><circle cx="9.6" cy="15" r="1.2" fill="${pinta}"/>
    <path d="M8.2 5.6c.8-1 1.8-1.6 2.7-1.8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".8"/>
    <text x="12" y="23.4" text-anchor="middle" font-size="6.5" font-weight="900" font-family="Arial Black, sans-serif" fill="#fff" stroke="${contorno}" stroke-width="1.6" paint-order="stroke">${tier}</text>
  </svg>`;
  return caixa;
}

/**
 * Ícone de charm: o desenho do Shiny Charm dos jogos (pingente arredondado com argola e brilhos) pintado na cor do
 * tipo (pedido do dono).
 */
export function iconeCharm(tipo: string): HTMLElement {
  const cor = corTipo(tipo);
  const caixa = el('div', { class: 'icone-charm', style: { '--cor-tipo': cor } });
  const g = `charm-${tipo}`;
  caixa.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="${cor}"/><stop offset="1" stop-color="${cor}"/></linearGradient></defs>
    <circle cx="12" cy="4.2" r="2.4" fill="none" stroke="#e8c45a" stroke-width="1.5"/><circle cx="12" cy="4.2" r="2.4" fill="none" stroke="#7a5a10" stroke-width=".5"/>
    <path d="M12 6.4c4.6 0 7.6 3.2 7.6 7.6 0 4.6-3.3 8-7.6 8s-7.6-3.4-7.6-8c0-4.4 3-7.6 7.6-7.6z" fill="${cor}" stroke="#1d2433" stroke-width="1.3"/>
    <path d="M12 7.4c3.9 0 6.5 2.7 6.5 6.6 0 4-2.8 7-6.5 7s-6.5-3-6.5-7c0-3.9 2.6-6.6 6.5-6.6z" fill="url(#${g})"/>
    <path d="M5.6 15.5c.8 3.2 3.3 5.5 6.4 5.5s5.600-2.300 6.400-5.500c-1.700 1.900-3.900 2.900-6.400 2.900s-4.700-1-6.400-2.900z" fill="#000" opacity=".22"/>
    <path d="M12 9.300l1.100 3.200 3.200 1.100-3.200 1.100-1.100 3.200-1.100-3.200-3.200-1.100 3.200-1.100z" fill="#fff" stroke="#1d2433" stroke-width=".5" stroke-linejoin="round"/>
    <path d="M16.300 9.200l.4 1.200 1.200.4-1.200.4-.4 1.200-.4-1.200-1.200-.4 1.200-.4zM8 15.600l.35 1 1 .35-1 .35-.35 1-.35-1-1-.35 1-.35z" fill="#fff"/>
  </svg>`;
  return caixa;
}

/** Ícone de cubo: o Pokémon dentro de um cubo (âmbar = passado, ciano = futuro, laranja = lendário). */
export function iconeCubo(especie: number, era: string): HTMLElement {
  return el('div', { class: `icone-cubo cubo-${era}` }, spritePokemon(pokemonPorId(especie), { animado: false }));
}

export function iconeItem(item: Pick<ItemLoja, 'id' | 'categoria' | 'golpe' | 'sprite' | 'imagem'> & { skin?: ItemLoja['skin']; cubo?: ItemLoja['cubo']; simbolo?: string; charm?: string }): HTMLElement {
  const reserva = () => el('div', { class: `icone-item ${item.id} cat-${item.categoria}` });
  if (item.categoria === 'ovos') {
    const ovo = ovoPorId(item.id);
    return iconeOvo(ovo?.letra ?? 'A', ovo?.rotulo, ovo?.nt);
  }
  // itens nossos ainda sem arte: um símbolo provisório numa moldura
  if (item.simbolo) return el('div', { class: `icone-simbolo cat-${item.categoria}` }, item.simbolo);
  if (item.skin) return iconeSkin(item.skin.especie, item.skin.shiny);
  if (item.cubo) return iconeCubo(item.cubo.especie, item.cubo.era);
  if (item.charm) return iconeCharm(item.charm);
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
