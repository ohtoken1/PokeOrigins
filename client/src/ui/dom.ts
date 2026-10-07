import type { PokemonIndividual } from '../../../shared/batalha/pokemon';
import { faixaDoTier, tierIv } from '../../../shared/tierIv';
import type { PokemonBase } from '../../../shared/tipos';

type Filho = Node | string | null | undefined | false;

/** Cria um elemento HTML: el('button', { class: 'x', onclick: fn }, 'texto'). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Record<string, unknown> = {},
  ...filhos: (Filho | Filho[])[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (nome.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(nome.slice(2), valor as EventListener);
    } else if (nome === 'style' && typeof valor === 'object') {
      // setProperty aceita também variáveis CSS (--cor-bioma)
      for (const [prop, v] of Object.entries(valor as Record<string, string>)) {
        elemento.style.setProperty(prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`), v);
      }
    } else {
      elemento.setAttribute(nome, valor === true ? '' : String(valor));
    }
  }
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    elemento.append(filho);
  }
  return elemento;
}

const TIPOS: Record<string, { nome: string; cor: string }> = {
  normal: { nome: 'Normal', cor: '#9fa19f' },
  fire: { nome: 'Fire', cor: '#e62829' },
  water: { nome: 'Water', cor: '#2980ef' },
  grass: { nome: 'Grass', cor: '#3fa129' },
  electric: { nome: 'Electric', cor: '#d6a800' },
  ice: { nome: 'Ice', cor: '#3dcef3' },
  fighting: { nome: 'Fighting', cor: '#ff8000' },
  poison: { nome: 'Poison', cor: '#9141cb' },
  ground: { nome: 'Ground', cor: '#915121' },
  flying: { nome: 'Flying', cor: '#81b9ef' },
  psychic: { nome: 'Psychic', cor: '#ef4179' },
  bug: { nome: 'Bug', cor: '#91a119' },
  rock: { nome: 'Rock', cor: '#afa981' },
  ghost: { nome: 'Ghost', cor: '#704170' },
  dragon: { nome: 'Dragon', cor: '#5060e1' },
  dark: { nome: 'Dark', cor: '#624d4e' },
  steel: { nome: 'Steel', cor: '#60a1b8' },
  fairy: { nome: 'Fairy', cor: '#ef70ef' },
};

/** Aceita o tipo da PokéAPI ("fire") ou do Showdown ("Fire"). */
/** Símbolo do gênero colorido (♂ azul, ♀ rosa); nada para quem não tem gênero. */
export function seloGenero(g: 'M' | 'F' | 'N'): HTMLElement | null {
  if (g === 'N') return null;
  // ︎: força o símbolo como texto (sem virar emoji)
  return el('span', { class: `genero ${g}`, title: g === 'M' ? 'Macho' : 'Fêmea' }, g === 'M' ? '♂︎' : '♀︎');
}

/** Selo "NT" (inegociável): o Pokémon não pode ser trocado com outros jogadores. */
export function seloNT(p: { inegociavel?: boolean }): HTMLElement | null {
  return p.inegociavel ? el('span', { class: 'selo-nt', title: 'NT · Inegociável: não pode ser trocado com outros jogadores' }, '🔒 NT') : null;
}

/** Selo do tier pela soma dos IVs (S+ … F). */
export function seloTier(p: Pick<PokemonIndividual, 'ivs'>): HTMLElement {
  const tier = tierIv(p);
  const [min, max] = faixaDoTier(tier);
  const classe = tier === 'S+' ? 'sp' : tier.toLowerCase();
  return el('span', { class: `selo-tier tier-${classe}`, title: `Tier ${tier} · soma dos IVs entre ${min} e ${max} (de 186)` }, tier);
}

export function corTipo(tipo: string): string {
  return TIPOS[tipo.toLowerCase()]?.cor ?? '#777';
}

export function seloTipo(tipo: string): HTMLElement {
  const info = TIPOS[tipo.toLowerCase()] ?? { nome: tipo, cor: '#777' };
  return el('span', { class: 'tipo', style: { background: info.cor } }, info.nome);
}

export function selosTipos(p: PokemonBase): HTMLElement {
  return el('div', { class: 'tipos' }, p.tipos.map(seloTipo));
}

/** Parte desenhada (não transparente) do primeiro quadro da imagem. */
function areaVisivel(img: HTMLImageElement): { x0: number; y0: number; x1: number; y1: number } | null {
  const [w, h] = [img.naturalWidth, img.naturalHeight];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  let dados: Uint8ClampedArray;
  try {
    dados = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // imagem sem CORS: fica como está
  }
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (dados[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/**
 * Os GIFs do Showdown têm sobra transparente desigual: desloca a imagem (propriedade `translate`,
 * que não atrapalha as animações com `transform`) para o Pokémon ficar no meio na horizontal.
 * `chao` (0 a 1): altura do palco onde ficam os pés; sem ele, só centraliza na horizontal.
 */
function centralizar(img: HTMLImageElement, zoom: number, chao?: number) {
  const area = areaVisivel(img);
  if (!area) return;
  const dx = Math.round(img.naturalWidth / 2 - (area.x0 + area.x1) / 2);
  let dy = 0;
  const palco = img.parentElement;
  if (chao !== undefined && palco) {
    // imagem centralizada no palco: o pé está em (altura do palco − altura da imagem)/2 + y1
    const alturaPalco = palco.clientHeight / zoom;
    const pe = (alturaPalco - img.naturalHeight) / 2 + area.y1;
    // não deixa a cabeça sair por cima
    dy = Math.round(Math.max(alturaPalco * chao - pe, -((alturaPalco - img.naturalHeight) / 2 + area.y0)));
  }
  img.style.translate = `${dx}px ${dy}px`;
}

/**
 * Sprite do Pokémon: GIF animado quando existe, senão a imagem parada.
 * `palco`: centraliza no palco pela parte desenhada, todos na MESMA escala (pedido do dono: Mew
 * pequeno, Mewtwo grande, como no Showdown). `escala` só por fator INTEIRO: fator quebrado (1,5×)
 * deixa os pixels de tamanhos diferentes e o sprite fica "mal pixelado".
 */
export function spritePokemon(
  p: PokemonBase,
  opcoes: { shiny?: boolean; animado?: boolean; costas?: boolean; palco?: boolean; escala?: number; chao?: number } = {},
): HTMLImageElement {
  const { shiny = false, animado = true, costas = false, palco = false, escala = 1, chao } = opcoes;
  const s = p.sprites;
  const parado = costas ? (shiny ? s.costasShiny : s.costas) : shiny ? s.frenteShiny : s.frente;
  const gif = costas ? (shiny ? s.gifCostasShiny : s.gifCostas) : shiny ? s.gifShiny : s.gif;
  const img = el('img', {
    class: 'sprite',
    alt: p.nome,
    src: (animado && gif) || parado || '',
    loading: 'lazy',
    // permite ler os pixels para centralizar (PokéAPI no GitHub libera CORS)
    crossorigin: palco ? 'anonymous' : undefined,
  });
  if (animado && gif && parado) img.addEventListener('error', () => (img.src = parado), { once: true });
  if (escala !== 1) img.style.zoom = String(escala);
  // os GIFs do Showdown já têm o tamanho relativo certo (Onix grande, Caterpie pequeno)
  if (palco) img.addEventListener('load', () => centralizar(img, escala, chao));
  return img;
}
