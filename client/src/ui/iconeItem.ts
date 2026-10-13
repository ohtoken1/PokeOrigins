// Imagens oficiais dos itens: folha de ícones do Pokémon Showdown (todos os itens de batalha,
// bolas, pedras e frutas) e sprites da PokéAPI (remédios e discos de TM/TR por tipo).
import { Dex } from '@pkmn/sim';
import type { ItemLoja } from '../../../shared/loja';
import { ITENS } from '../../../shared/itens';
import { corTipo, el, spritePokemon } from './dom';
import { ovoPorId } from '../../../shared/ovos';
import { pokemonPorId } from '../dados';
import { iconeTicketDoPokemon } from './ticketEvento';

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
 * Ícone de charm: a imagem ORIGINAL do Shiny Charm dos jogos (client/public/itens/shinycharm.png, da PokéAPI)
 * repintada na cor do tipo (pedido do dono: pintar o item, não desenhar outro). A parte colorida troca de matiz e
 * mantém o claro/escuro do desenho; branco, cinza e contorno ficam como são.
 */
const charmsPintados = new Map<string, Promise<string>>();
let charmOriginal: Promise<HTMLImageElement> | null = null;
function hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function rgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
/** Pixel da parte colorida do desenho (o que troca de cor). */
const colorido = (s: number, l: number) => s > 0.2 && l > 0.15 && l < 0.93;
function pintarCharm(cor: string): Promise<string> {
  charmOriginal ??= new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = 'itens/shinycharm.png';
  });
  return charmOriginal.then((img) => {
    const tela = document.createElement('canvas');
    tela.width = img.naturalWidth;
    tela.height = img.naturalHeight;
    const ctx = tela.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const dados = ctx.getImageData(0, 0, tela.width, tela.height);
    const px = dados.data;
    const n = parseInt(cor.slice(1), 16);
    const [h, s, l] = hsl(n >> 16, (n >> 8) & 255, n & 255);
    // claridade média da parte colorida: ela vira a cor do tipo, e o resto fica mais claro ou mais escuro em volta
    let soma = 0, quantos = 0;
    for (let i = 0; i < px.length; i += 4) {
      const [, sp, lp] = hsl(px[i], px[i + 1], px[i + 2]);
      if (px[i + 3] && colorido(sp, lp)) (soma += lp), quantos++;
    }
    const media = quantos ? soma / quantos : 0.5;
    for (let i = 0; i < px.length; i += 4) {
      const [, sp, lp] = hsl(px[i], px[i + 1], px[i + 2]);
      if (!px[i + 3] || !colorido(sp, lp)) continue;
      [px[i], px[i + 1], px[i + 2]] = rgb(h, Math.max(s, 0.25), Math.min(0.92, Math.max(0.12, l + (lp - media))));
    }
    ctx.putImageData(dados, 0, 0);
    return tela.toDataURL();
  });
}
export function iconeCharm(tipo: string): HTMLElement {
  const cor = corTipo(tipo);
  const img = el('img', { class: 'icone-png', alt: '' });
  if (!charmsPintados.has(cor)) charmsPintados.set(cor, pintarCharm(cor));
  void charmsPintados.get(cor)!.then((src) => (img.src = src), () => (img.src = 'itens/shinycharm.png'));
  return el('div', { class: 'icone-charm', style: { '--cor-tipo': cor } }, img);
}

/** Ícone de Energy: uma esfera brilhando na cor do tipo, com uma centelha no meio (desenho por CSS). */
export function iconeEnergia(tipo: string): HTMLElement {
  return el('div', { class: 'icone-energia', style: { '--cor-tipo': corTipo(tipo) } }, el('i', {}));
}

/** Ícone de cubo: o Pokémon dentro de um cubo (âmbar = passado, ciano = futuro, laranja = lendário). */
export function iconeCubo(especie: number, era: string): HTMLElement {
  return el('div', { class: `icone-cubo cubo-${era}` }, spritePokemon(pokemonPorId(especie), { animado: false }));
}

type ItemDoIcone = Pick<ItemLoja, 'id' | 'categoria' | 'golpe' | 'sprite' | 'imagem'> & { skin?: ItemLoja['skin']; cubo?: ItemLoja['cubo']; simbolo?: string; charm?: string; energia?: string };

/** O ícone de um item. Sai marcado com `data-item` (o id): é o que faz o cartão de descrição aparecer ao passar o mouse. */
export function iconeItem(item: ItemDoIcone): HTMLElement {
  const icone = desenharIcone(item);
  icone.dataset.item = item.id;
  return icone;
}

function desenharIcone(item: ItemDoIcone): HTMLElement {
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
  if (item.energia) return iconeEnergia(item.energia);
  if (item.categoria === 'tickets') {
    const ticket = iconeTicketDoPokemon(item.id);
    if (ticket) return el('div', { class: 'icone-caixa' }, ticket);
  }
  if (item.imagem) {
    const img = el('img', { class: 'icone-png icone-imagem', src: item.imagem, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(reserva()), { once: true });
    return el('div', { class: 'icone-caixa' }, img);
  }

  // versão NT (Kit iniciante): o mesmo ícone do item normal
  const sd = Dex.items.get(item.id.replace(/-nt$/, ''));
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
