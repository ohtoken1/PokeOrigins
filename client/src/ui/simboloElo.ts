// Símbolo dos elos do PvP ranqueado (modelo 3 escolhido pelo dono, 20/10/2026: "estrela de cristal"): estrela
// facetada no metal do elo (4 pontas na Poké Ball até 10 na Master Ball, com coroa), a Pokébola do elo no meio,
// a divisão numa fita embaixo e a tier num selo colorido no canto. Tudo desenhado em SVG por código
// (prévia original em client/public/previa-elos.html). Usado nas janelas, no ranking, no perfil e no mapa.
import type { FormatoRanqueado, IdElo } from '../../../shared/ranqueado';

const METAL: Record<IdElo, [string, string, string]> = {
  pokebola: ['#6b3f1a', '#c98a4b', '#f6d3a0'],
  greatball: ['#56606c', '#c9d3dd', '#ffffff'],
  ultraball: ['#8a5c0a', '#e9b949', '#fff1b8'],
  beastball: ['#0f4f6e', '#4fd1ff', '#e0fbff'],
  masterball: ['#3e1166', '#b67cff', '#ffe6ff'],
};
const NIVEL: Record<IdElo, number> = { pokebola: 0, greatball: 1, ultraball: 2, beastball: 3, masterball: 4 };
const ROMANOS = ['', 'I', 'II', 'III'];
const COR_TIER: Record<FormatoRanqueado, [string, string]> = { Uber: ['#7a0f1c', '#e0384c'], OU: ['#7a5208', '#e9b949'], UU: ['#123f7a', '#3b8be0'], RU: ['#145a2a', '#3fbf6b'] };
const TEXTO_TIER: Record<FormatoRanqueado, string> = { Uber: 'UBERS', OU: 'OU', UU: 'UU', RU: 'RU' };

let contador = 0;
const uid = (p: string) => `elo${p}${contador++}`;
function grad(cores: string[], x2 = 0, y2 = 1): { id: string; def: string } {
  const id = uid('g');
  return { id, def: `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${cores.map((c, i) => `<stop offset="${i / (cores.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>` };
}

/** A Pokébola de cada elo (metades, faixa, botão e brilho). */
function bola(id: IdElo, cx: number, cy: number, r: number): string {
  const topo = `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`;
  const baixo = `M${cx - r} ${cy} A${r} ${r} 0 0 0 ${cx + r} ${cy} Z`;
  const clip = uid('c');
  let corTopo = '#e3342f';
  let corBaixo = '#f4f4f4';
  let extra = '';
  if (id === 'greatball') {
    corTopo = '#2f6fd6';
    extra = `<ellipse cx="${cx - r * 0.55}" cy="${cy - r * 0.45}" rx="${r * 0.32}" ry="${r * 0.16}" fill="#e3342f" transform="rotate(-35 ${cx - r * 0.55} ${cy - r * 0.45})"/>`
      + `<ellipse cx="${cx + r * 0.55}" cy="${cy - r * 0.45}" rx="${r * 0.32}" ry="${r * 0.16}" fill="#e3342f" transform="rotate(35 ${cx + r * 0.55} ${cy - r * 0.45})"/>`;
  } else if (id === 'ultraball') {
    corTopo = '#222';
    extra = `<rect x="${cx - r * 0.72}" y="${cy - r}" width="${r * 0.3}" height="${r}" fill="#f5c518"/><rect x="${cx + r * 0.42}" y="${cy - r}" width="${r * 0.3}" height="${r}" fill="#f5c518"/>`;
  } else if (id === 'beastball') {
    corTopo = '#2240a8';
    corBaixo = '#2b55c9';
    extra = `<path d="M${cx - r} ${cy - r * 0.2} L${cx - r * 0.6} ${cy - r * 0.75} L${cx - r * 0.3} ${cy - r * 0.35} L${cx} ${cy - r} L${cx + r * 0.3} ${cy - r * 0.35} L${cx + r * 0.6} ${cy - r * 0.75} L${cx + r} ${cy - r * 0.2}" fill="none" stroke="#f5d33b" stroke-width="${r * 0.1}" stroke-linejoin="round"/>`
      + `<circle cx="${cx - r * 0.5}" cy="${cy + r * 0.5}" r="${r * 0.12}" fill="#7fe3ff"/><circle cx="${cx + r * 0.5}" cy="${cy + r * 0.5}" r="${r * 0.12}" fill="#7fe3ff"/>`;
  } else if (id === 'masterball') {
    corTopo = '#7a2ea8';
    extra = `<circle cx="${cx - r * 0.55}" cy="${cy - r * 0.42}" r="${r * 0.2}" fill="#e05ab0"/><circle cx="${cx + r * 0.55}" cy="${cy - r * 0.42}" r="${r * 0.2}" fill="#e05ab0"/>`
      + `<text x="${cx}" y="${cy - r * 0.32}" text-anchor="middle" font-family="Arial Black, sans-serif" font-weight="900" font-size="${r * 0.6}" fill="#fff">M</text>`;
  }
  return `<clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
    + `<g clip-path="url(#${clip})"><path d="${topo}" fill="${corTopo}"/><path d="${baixo}" fill="${corBaixo}"/>${extra}`
    + `<rect x="${cx - r}" y="${cy - r * 0.08}" width="${r * 2}" height="${r * 0.16}" fill="#1a1a1a"/>`
    + `<ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.55}" rx="${r * 0.35}" ry="${r * 0.18}" fill="#fff" opacity="0.35" transform="rotate(-30 ${cx - r * 0.35} ${cy - r * 0.55})"/></g>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1a1a1a" stroke-width="${r * 0.08}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="#f4f4f4" stroke="#1a1a1a" stroke-width="${r * 0.09}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r * 0.13}" fill="none" stroke="#bbb" stroke-width="${r * 0.04}"/>`;
}

function coroa(cx: number, y: number, w: number): string {
  const g = grad(['#fff6c8', '#e9b949', '#8a5c0a']);
  return `<defs>${g.def}</defs><path d="M${cx - w / 2} ${y} L${cx - w / 2} ${y - w * 0.35} L${cx - w / 4} ${y - w * 0.15} L${cx} ${y - w * 0.5} L${cx + w / 4} ${y - w * 0.15} L${cx + w / 2} ${y - w * 0.35} L${cx + w / 2} ${y} Z" fill="url(#${g.id})" stroke="#5a3a00" stroke-width="2"/>`
    + `<circle cx="${cx}" cy="${y - w * 0.5}" r="${w * 0.06}" fill="#ff5ab8"/><circle cx="${cx - w / 2}" cy="${y - w * 0.35}" r="${w * 0.05}" fill="#ff5ab8"/><circle cx="${cx + w / 2}" cy="${y - w * 0.35}" r="${w * 0.05}" fill="#ff5ab8"/>`;
}

function fita(cx: number, y: number, texto: string, metal: string[]): string {
  const g = grad([metal[2], metal[1], metal[0]]);
  return `<defs>${g.def}</defs><path d="M${cx - 34} ${y} L${cx + 34} ${y} L${cx + 28} ${y + 9} L${cx + 34} ${y + 18} L${cx - 34} ${y + 18} L${cx - 28} ${y + 9} Z" fill="url(#${g.id})" stroke="${metal[0]}" stroke-width="1.5"/>`
    + `<text x="${cx}" y="${y + 14}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="14" fill="#1a1208">${texto}</text>`;
}

function seloTier(tier: FormatoRanqueado): string {
  const [escura, clara] = COR_TIER[tier];
  const texto = TEXTO_TIER[tier];
  const w = texto.length > 2 ? 46 : 34;
  return `<g transform="translate(${136 - w} 4)"><rect width="${w}" height="20" rx="6" fill="${clara}" stroke="${escura}" stroke-width="2"/>`
    + `<rect x="2" y="2" width="${w - 4}" height="7" rx="4" fill="#fff" opacity="0.25"/>`
    + `<text x="${w / 2}" y="15" text-anchor="middle" font-family="Arial Black, sans-serif" font-weight="900" font-size="${texto.length > 2 ? 11 : 13}" fill="#fff" stroke="${escura}" stroke-width="0.6">${texto}</text></g>`;
}

/** SVG (texto) do símbolo. `divisao` = 1 a 3 (fita embaixo); `tier` = selo no canto. */
export function svgElo(elo: IdElo, opcoes: { divisao?: number | null; tier?: FormatoRanqueado | null } = {}): string {
  const metal = METAL[elo];
  const nivel = NIVEL[elo];
  const g = grad([metal[2], metal[1], metal[0]], 1, 1);
  const halo = uid('h');
  const pontas = [4, 5, 6, 8, 10][nivel];
  let estrela = '';
  let facetas = '';
  for (let i = 0; i < pontas * 2; i++) {
    const a = (i / (pontas * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 40 : 64;
    const x = 70 + Math.cos(a) * r;
    const y = 70 + Math.sin(a) * r;
    estrela += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    if (i % 2 === 0) facetas += `<line x1="70" y1="70" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${metal[2]}" stroke-width="1" opacity="0.6"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140"><defs>${g.def}<radialGradient id="${halo}"><stop offset="0" stop-color="${metal[1]}" stop-opacity="${0.25 + nivel * 0.12}"/><stop offset="1" stop-color="${metal[1]}" stop-opacity="0"/></radialGradient></defs>`
    + `<circle cx="70" cy="70" r="70" fill="url(#${halo})"/>`
    + `<path d="${estrela}Z" fill="url(#${g.id})" stroke="${metal[0]}" stroke-width="2" stroke-linejoin="round"/>${facetas}`
    + `<circle cx="70" cy="70" r="36" fill="#0d0c0a" stroke="${metal[0]}" stroke-width="2"/>`
    + bola(elo, 70, 70, 30)
    + (elo === 'masterball' ? coroa(70, 20, 40) : '')
    + (opcoes.divisao ? fita(70, 114, ROMANOS[opcoes.divisao], metal) : '')
    + (opcoes.tier ? seloTier(opcoes.tier) : '')
    + '</svg>';
}

/** Endereço de imagem (data URL) do símbolo, para `<img>` e para as texturas do mapa. */
export const urlDoElo = (elo: IdElo, opcoes: { divisao?: number | null; tier?: FormatoRanqueado | null } = {}) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgElo(elo, opcoes))}`;
