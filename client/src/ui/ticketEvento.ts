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
 * Tickets de PRÊMIO (os que se abrem na bolsa): o mesmo bilhete, na cor do Pokémon e com a inicial dele (pedido do
 * dono: Kyogre = K azul, Groudon = G vermelho). id do ticket → [letra, cor do bilhete, cor da faixa].
 */
const TICKETS_DE_POKEMON: Record<string, [string, string, string]> = {
  'ticket-kyogre': ['K', '#3f7fe0', '#b3262b'],
  'ticket-groudon': ['G', '#d8453a', '#3a3a44'],
  'ticket-giratina': ['G', '#8f889c', '#a8222a'],
  'ticket-hoopa': ['H', '#d06fb4', '#6a3f8f'],
  'ticket-dialga': ['D', '#5d8fc8', '#27457a'],
  'ticket-palkia': ['P', '#e2aed2', '#8a4f86'],
  'ticket-arceus': ['A', '#f1ede0', '#b98f22'],
  'ticket-therian': ['T', '#e08a3a', '#3f7f45'],
  'ticket-kyurem': ['K', '#aecbd9', '#4a5560'],
  'ticket-zacian': ['Z', '#45aee0', '#b8324f'],
  'ticket-zamazenta': ['Z', '#d24a4a', '#2f4f9a'],
  'ticket-ogerpon': ['O', '#58ad62', '#2d6b3a'],
};
/** Ícone do ticket de prêmio, ou null se o ticket não tem desenho próprio (a Chave Temporal usa a chave). */
export function iconeTicketDoPokemon(id: string, largura = 30): HTMLElement | null {
  const v = TICKETS_DE_POKEMON[id];
  if (!v) return null;
  const [letra, cor, faixa] = v;
  return iconeTicketEvento(letra, '', [faixa, tom(faixa, -0.4), tom(faixa, -0.55)], largura, [tom(cor, 0.35), cor, tom(cor, -0.25), tom(cor, -0.65)]);
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
