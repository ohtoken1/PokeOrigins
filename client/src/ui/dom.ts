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

export function seloTipo(tipo: string): HTMLElement {
  const info = TIPOS[tipo] ?? { nome: tipo, cor: '#777' };
  return el('span', { class: 'tipo', style: { background: info.cor } }, info.nome);
}

export function selosTipos(p: PokemonBase): HTMLElement {
  return el('div', { class: 'tipos' }, p.tipos.map(seloTipo));
}

/** Sprite do Pokémon: GIF animado quando existe, senão a imagem parada. */
export function spritePokemon(p: PokemonBase, opcoes: { shiny?: boolean; animado?: boolean } = {}): HTMLImageElement {
  const { shiny = false, animado = true } = opcoes;
  const parado = shiny ? p.sprites.frenteShiny : p.sprites.frente;
  const gif = shiny ? p.sprites.gifShiny : p.sprites.gif;
  const img = el('img', {
    class: 'sprite',
    alt: p.nome,
    src: (animado && gif) || parado || '',
    loading: 'lazy',
  });
  if (animado && gif && parado) img.addEventListener('error', () => (img.src = parado), { once: true });
  return img;
}
