// Bandeira do clã desenhada por código (SVG): forma do pano, padrão de duas cores e um símbolo com tema Pokémon.
// O editor (criar clã / editar bandeira) mostra a bandeira grande e as opções em miniatura.
import { BANDEIRA_PADRAO, CORES_BANDEIRA, FORMAS_BANDEIRA, lerBandeira, PADROES_BANDEIRA, SIMBOLOS_BANDEIRA, type Bandeira } from '../../../shared/cla';
import { el } from './dom';

// pano de 60 × 80
const FORMAS = [
  'M0 0H60V80H0Z',
  'M0 0H60V58L30 80L0 58Z',
  'M0 0H60V80L30 62L0 80Z',
  'M0 0H60V44C60 64 46 74 30 80C14 74 0 64 0 44Z',
];
const PADROES: ((cor: string) => string)[] = [
  () => '',
  (c) => `<rect x="30" width="30" height="80" fill="${c}"/>`,
  (c) => `<rect y="38" width="60" height="42" fill="${c}"/>`,
  (c) => `<path d="M0 80L60 0V80Z" fill="${c}"/>`,
  (c) => `<rect x="10" width="10" height="80" fill="${c}"/><rect x="40" width="10" height="80" fill="${c}"/>`,
  (c) => `<rect y="24" width="60" height="28" fill="${c}"/>`,
  (c) => `<rect width="30" height="38" fill="${c}"/><rect x="30" y="38" width="30" height="42" fill="${c}"/>`,
  (c) => `<path d="M0 0H60V80H0Z" fill="none" stroke="${c}" stroke-width="14"/>`,
  (c) => `<path d="M0 0L30 20L60 0V16L30 36L0 16Z" fill="${c}"/><path d="M0 28L30 48L60 28V44L30 64L0 44Z" fill="${c}"/>`,
];
// símbolos numa caixa de 24 × 24 (c = cor)
const traco = (d: string, c: string, largura: number) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${largura}" stroke-linecap="round"/>`;
const cheio = (d: string, c: string) => `<path d="${d}" fill="${c}" fill-rule="evenodd"/>`;
const SIMBOLOS: ((c: string) => string)[] = [
  (c) => `<circle cx="12" cy="12" r="9.5" fill="none" stroke="${c}" stroke-width="2.2"/>${cheio('M2.5 12a9.5 9.5 0 0 1 19 0h-5.7a3.8 3.8 0 0 0-7.6 0Z', c)}<circle cx="12" cy="12" r="2.2" fill="${c}"/>`,
  (c) => cheio('M12 1.5c1 4.2 6.5 6.4 6.5 12.5a6.5 6.5 0 0 1-13 0c0-2.2 1-3.9 2.2-5 .4 2 1.4 2.8 2.1 2.9C8.8 7.700 11 4.500 12 1.500Z', c),
  (c) => cheio('M12 1.500c4.200 5.800 7.200 9.300 7.200 13.300a7.200 7.200 0 0 1-14.400 0c0-4 3-7.500 7.200-13.300Z', c),
  (c) => cheio('M21 2.500C10.500 2.500 4 7.500 4 14.500c0 1.700.400 3.200 1.200 4.400L2.500 21.600l1.500 1.400 2.800-2.700c1.300.800 2.900 1.200 4.700 1.200 7.500 0 10.500-8.500 9.500-19Z', c),
  (c) => cheio('M14.500 1L4 13.500h6.300L8 23 19.500 9.500h-6.300Z', c),
  (c) => traco('M12 2v20M3.300 7l17.400 10M3.300 17l17.400-10M9.500 3.500L12 6l2.500-2.500M9.500 20.500L12 18l2.500 2.500', c, 2),
  (c) => cheio('M12 1.500l3.100 6.600 7.200.900-5.300 5 1.400 7.100L12 17.600l-6.400 3.500L7 14 1.700 9l7.200-.900Z', c),
  (c) => cheio('M2.500 7.500l5 4.500L12 4l4.500 8 5-4.500L19.500 20h-15Z', c),
  (c) => cheio('M15 2a10 10 0 1 0 7 15.500A9 9 0 0 1 15 2Z', c),
  (c) => traco('M6.500 3c.300 7-.800 12-3.200 17M12.500 2.500c.300 7.500-.800 13-3.200 18.500M18.500 3c.300 7-.800 12-3.200 17', c, 2.800),
  (c) => cheio('M1 21L9 5.500l4.200 7.300 2.800-3.800L23 21Z', c),
  (c) => cheio('M1 12c3.200-5.200 7-8 11-8s7.800 2.800 11 8c-3.200 5.200-7 8-11 8S4.200 17.200 1 12Zm11-4.200a4.200 4.200 0 1 0 0 8.400 4.200 4.200 0 0 0 0-8.400Z', c),
  (c) => `<ellipse cx="12" cy="16" rx="6" ry="5" fill="${c}"/><circle cx="4.500" cy="10.500" r="2.400" fill="${c}"/><circle cx="9" cy="5.500" r="2.500" fill="${c}"/><circle cx="15" cy="5.500" r="2.500" fill="${c}"/><circle cx="19.500" cy="10.500" r="2.400" fill="${c}"/>`,
];

let serie = 0;
/** A bandeira pendurada na haste (largura em px; a altura acompanha). */
export function desenharBandeira(b: Bandeira | null, largura = 60): HTMLElement {
  // confere de novo o que veio do servidor: cada campo é uma posição nas listas daqui (nada de fora entra no desenho)
  const { forma, padrao, cor1, cor2, simbolo, corSimbolo } = lerBandeira(b) ?? BANDEIRA_PADRAO;
  const id = `bandeira-${++serie}`;
  const caixa = el('span', { class: 'bandeira', style: { width: `${largura}px` } });
  caixa.innerHTML = `<svg viewBox="-4 -7 68 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="${id}"><path d="${FORMAS[forma]}"/></clipPath>
      <linearGradient id="${id}-luz" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/>
      </linearGradient>
    </defs>
    <path d="${FORMAS[forma]}" transform="translate(1.500 2)" fill="#000" opacity="0.3"/>
    <g clip-path="url(#${id})">
      <rect width="60" height="80" fill="${CORES_BANDEIRA[cor1]}"/>
      ${PADROES[padrao](CORES_BANDEIRA[cor2])}
      <g transform="translate(13 16) scale(1.420)" stroke="#000" stroke-opacity="0.35" stroke-width="0.500" paint-order="stroke">${SIMBOLOS[simbolo](CORES_BANDEIRA[corSimbolo])}</g>
      <rect width="60" height="80" fill="url(#${id}-luz)"/>
    </g>
    <path d="${FORMAS[forma]}" fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="1.200"/>
    <rect x="-4" y="-6" width="68" height="6.500" rx="3" fill="#c9a227" stroke="#6b5310" stroke-width="1"/>
    <circle cx="-2.500" cy="-2.800" r="3.600" fill="#f0cf5a" stroke="#6b5310" stroke-width="1"/><circle cx="62.500" cy="-2.800" r="3.600" fill="#f0cf5a" stroke="#6b5310" stroke-width="1"/>
  </svg>`;
  return caixa;
}

/** Só o símbolo (miniaturas do editor). */
function desenharSimbolo(i: number, cor: string): HTMLElement {
  const caixa = el('span', { class: 'bandeira-simbolo' });
  caixa.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${SIMBOLOS[i](cor)}</svg>`;
  return caixa;
}

/** Editor da bandeira: muda `bandeira` no lugar e chama `aoMudar` a cada escolha. */
export function editorDeBandeira(bandeira: Bandeira, aoMudar: () => void = () => {}): HTMLElement {
  const previa = el('div', { class: 'bandeira-previa' });
  const opcoes = el('div', { class: 'bandeira-opcoes' });
  const desenhar = () => {
    previa.replaceChildren(desenharBandeira(bandeira, 150));
    const grupo = (titulo: string, campo: keyof Bandeira, nomes: string[], miniatura: (i: number) => HTMLElement, classe = '') =>
      el('fieldset', { class: `bandeira-grupo ${classe}` }, el('legend', {}, titulo),
        el('div', { class: 'bandeira-escolhas' }, ...nomes.map((nome, i) =>
          el('button', {
            type: 'button', class: `bandeira-escolha${bandeira[campo] === i ? ' ativa' : ''}`, title: nome, 'aria-label': nome, 'aria-pressed': String(bandeira[campo] === i),
            onclick: () => {
              bandeira[campo] = i;
              desenhar();
              aoMudar();
            },
          }, miniatura(i)))));
    const cores = (titulo: string, campo: keyof Bandeira) =>
      grupo(titulo, campo, CORES_BANDEIRA, (i) => el('span', { class: 'bandeira-cor', style: { background: CORES_BANDEIRA[i] } }), 'grupo-cores');
    opcoes.replaceChildren(
      grupo('Formato', 'forma', FORMAS_BANDEIRA, (i) => desenharBandeira({ ...bandeira, forma: i }, 30)),
      grupo('Padrão', 'padrao', PADROES_BANDEIRA, (i) => desenharBandeira({ ...bandeira, padrao: i }, 30)),
      cores('Cor principal', 'cor1'),
      cores('Segunda cor', 'cor2'),
      grupo('Símbolo', 'simbolo', SIMBOLOS_BANDEIRA, (i) => desenharSimbolo(i, '#f5f5f5')),
      cores('Cor do símbolo', 'corSimbolo'));
  };
  desenhar();
  return el('div', { class: 'bandeira-editor' }, previa, opcoes);
}
