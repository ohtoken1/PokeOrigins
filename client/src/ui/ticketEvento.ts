// Ticket de evento: o MODELO de todo ticket de entrada do jogo (escolha do dono, a partir do Ticket Safari).
// Bilhete dourado com os picotes nas laterais, uma faixa colorida e UMA LETRA no meio: mecânica nova que precise
// de ticket usa este desenho e só troca a letra (e, se quiser, a cor da faixa).
import { el } from './dom';

/** Cores da faixa: [fundo, contorno, sombra da letra]. */
export const FAIXA_SAFARI: [string, string, string] = ['#3f7a3a', '#234a22', '#1c3a1b'];

/** Papel do bilhete: [claro, meio, escuro, contorno]. O dourado é o dos tickets de entrada. */
type Papel = [string, string, string, string];
const PAPEL_DOURADO: Papel = ['#f6d77a', '#e9b949', '#c98f24', '#5a3d0c'];

/** Clareia (f > 0) ou escurece (f < 0) uma cor "#rrggbb". */
function tom(cor: string, f: number): string {
  const n = parseInt(cor.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Ícone das ORBS (os antigos tickets de prêmio; pedido do dono, modelo escolhido na prévia `previa-orbs.html`): orbe de
 * vidro na cor do Pokémon, com o sprite dele dentro, numa base dourada. id do item → [número na Pokédex, cor do vidro].
 * Orb nova: acrescentar aqui. Devolve null se o item não tem orbe (a Chave Temporal usa a chave).
 */
const ORBS: Record<string, [number, string]> = {
  'ticket-kyogre': [382, '#2f6fd6'],
  'ticket-groudon': [383, '#c8322b'],
  'ticket-giratina': [487, '#6f6584'],
  'ticket-hoopa': [720, '#b0569a'],
  'ticket-dialga': [483, '#4a74b8'],
  'ticket-palkia': [484, '#c98bbd'],
  'ticket-arceus': [493, '#d6c48a'],
  'ticket-therian': [645, '#d27a35'],
  'ticket-kyurem': [646, '#6f97ad'],
  'ticket-zacian': [888, '#3f9fd2'],
  'ticket-zamazenta': [889, '#c94545'],
  'ticket-ogerpon': [1017, '#4e9d58'],
};
const SPRITE_ORB = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export function iconeTicketDoPokemon(id: string, largura = 30): HTMLElement | null {
  const v = ORBS[id];
  if (!v) return null;
  const [numero, cor] = v;
  const n = proximoId++;
  const caixa = el('span', { class: 'icone-orb', role: 'img', style: { width: `${largura}px`, height: `${largura}px` } });
  caixa.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><defs>
  <radialGradient id="orb-v-${n}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${tom(cor, 0.55)}" stop-opacity=".9"/><stop offset=".6" stop-color="${cor}" stop-opacity=".75"/><stop offset="1" stop-color="${tom(cor, -0.55)}"/></radialGradient>
  <linearGradient id="orb-b-${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d77a"/><stop offset=".5" stop-color="#e9b949"/><stop offset="1" stop-color="#8a5f14"/></linearGradient>
  <clipPath id="orb-c-${n}"><circle cx="32" cy="28" r="21"/></clipPath></defs>
  <path d="M18 50h28l4 9H14z" fill="url(#orb-b-${n})" stroke="#5a3d0c" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M20 48h24v4H20z" fill="#c98f24" stroke="#5a3d0c" stroke-width="1.2"/>
  <circle cx="32" cy="28" r="22" fill="url(#orb-v-${n})" stroke="${tom(cor, -0.55)}" stroke-width="2"/>
  <image href="${SPRITE_ORB}/${numero}.png" x="6" y="3" width="52" height="52" clip-path="url(#orb-c-${n})" style="image-rendering: pixelated"/>
  <circle cx="32" cy="28" r="21" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>
  <ellipse cx="23" cy="16" rx="7" ry="3.6" fill="#fff" opacity=".6" transform="rotate(-30 23 16)"/></svg>`;
  return caixa;
}

let proximoId = 0;

/** Desenho do ticket (proporção 3 × 2). `letra`: uma letra só ("S" = Safari). */
export function iconeTicketEvento(letra: string, nome: string, [fundo, contorno, sombra]: [string, string, string] = FAIXA_SAFARI, largura = 30, [claro, meio, escuro, borda]: Papel = PAPEL_DOURADO): HTMLElement {
  const id = `ticket-papel-${proximoId++}`;
  const caixa = el('span', { class: 'ticket-evento', role: 'img', 'aria-label': nome || 'Ticket', title: nome, style: { width: `${largura}px`, height: `${Math.round((largura * 2) / 3)}px` } });
  const texto = `<text x="19" y="23.2" text-anchor="middle" font-family="'Arial Black', 'Segoe UI Black', system-ui, sans-serif" font-weight="900" font-size="20"`;
  caixa.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="100%" height="100%" aria-hidden="true">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${claro}"/><stop offset="0.5" stop-color="${meio}"/><stop offset="1" stop-color="${escuro}"/></linearGradient></defs>
  <path d="M5 3h38a3 3 0 0 1 3 3v6a4 4 0 0 0 0 8v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-6a4 4 0 0 0 0-8V6a3 3 0 0 1 3-3z" fill="url(#${id})" stroke="${borda}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M7 7h24v18H7z" fill="${fundo}" stroke="${contorno}" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M36 6v20" stroke="${borda}" stroke-width="1.5" stroke-dasharray="2 2.4" stroke-linecap="round"/>
  <circle cx="41" cy="16" r="2" fill="${borda}"/>
  ${texto} fill="none" stroke="${sombra}" stroke-width="3.2" stroke-linejoin="round"></text>
  ${texto} fill="#fff6d8"></text>
</svg>`;
  // a letra entra como texto (nunca como HTML)
  caixa.querySelectorAll('text').forEach((t) => (t.textContent = letra.slice(0, 1).toUpperCase()));
  return caixa;
}
