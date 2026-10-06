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
  fire: { nome: 'Fogo', cor: '#e62829' },
  water: { nome: 'Água', cor: '#2980ef' },
  grass: { nome: 'Planta', cor: '#3fa129' },
  electric: { nome: 'Elétrico', cor: '#d6a800' },
  ice: { nome: 'Gelo', cor: '#3dcef3' },
  fighting: { nome: 'Lutador', cor: '#ff8000' },
  poison: { nome: 'Veneno', cor: '#9141cb' },
  ground: { nome: 'Terra', cor: '#915121' },
  flying: { nome: 'Voador', cor: '#81b9ef' },
  psychic: { nome: 'Psíquico', cor: '#ef4179' },
  bug: { nome: 'Inseto', cor: '#91a119' },
  rock: { nome: 'Pedra', cor: '#afa981' },
  ghost: { nome: 'Fantasma', cor: '#704170' },
  dragon: { nome: 'Dragão', cor: '#5060e1' },
  dark: { nome: 'Sombrio', cor: '#624d4e' },
  steel: { nome: 'Aço', cor: '#60a1b8' },
  fairy: { nome: 'Fada', cor: '#ef70ef' },
};

/** Aceita o tipo da PokéAPI ("fire") ou do Showdown ("Fire"). */
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

/**
 * Sprite do Pokémon: GIF animado quando existe, senão a imagem parada.
 * `alturaAlvo` amplia por um fator INTEIRO (2×, 3×…) até perto dessa altura: ampliar por fator
 * quebrado (1,5×) deixa os pixels de tamanhos diferentes e o sprite fica "mal pixelado".
 */
export function spritePokemon(
  p: PokemonBase,
  opcoes: { shiny?: boolean; animado?: boolean; costas?: boolean; alturaAlvo?: number } = {},
): HTMLImageElement {
  const { shiny = false, animado = true, costas = false, alturaAlvo } = opcoes;
  const s = p.sprites;
  const parado = costas ? (shiny ? s.costasShiny : s.costas) : shiny ? s.frenteShiny : s.frente;
  const gif = costas ? (shiny ? s.gifCostasShiny : s.gifCostas) : shiny ? s.gifShiny : s.gif;
  const img = el('img', {
    class: 'sprite',
    alt: p.nome,
    src: (animado && gif) || parado || '',
    loading: 'lazy',
  });
  if (animado && gif && parado) img.addEventListener('error', () => (img.src = parado), { once: true });
  if (alturaAlvo) {
    // os GIFs do Showdown já têm o tamanho relativo certo (Onix grande, Caterpie pequeno);
    // só ampliamos os pequenos, no máximo 2×, olhando a maior dimensão (Exeggcute é largo)
    img.addEventListener('load', () => {
      const maior = Math.max(img.naturalWidth, img.naturalHeight);
      img.style.zoom = String(Math.min(2, Math.max(1, Math.floor(alturaAlvo / maior))));
    });
  }
  return img;
}
