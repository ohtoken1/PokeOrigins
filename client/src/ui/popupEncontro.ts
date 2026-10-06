import type { Encontro } from '../../../shared/encontros';
import { el, selosTipos, spritePokemon } from './dom';

export interface AcoesEncontro {
  lutar(): void;
  /** Motivo para não poder lutar (ex.: time todo desmaiado), ou null. */
  bloqueio: string | null;
}

/**
 * Cartão "Um Pokémon selvagem apareceu!" no canto do mapa. Não trava o jogo:
 * se o jogador continuar andando, quem chamou fecha o cartão (= fugiu).
 * Enter ou o botão Lutar começam a batalha. Devolve a função que fecha o cartão.
 */
/** Símbolo do gênero (♂/♀) ou nada para quem não tem gênero. */
export const simboloGenero = (g: 'M' | 'F' | 'N') => (g === 'M' ? '♂' : g === 'F' ? '♀' : '');

export function mostrarEncontro(raiz: HTMLElement, encontro: Encontro, acoes: AcoesEncontro, genero: 'M' | 'F' | 'N' = 'N'): () => void {
  const { pokemon, nivel, shiny } = encontro;
  const lendario = pokemon.lendario || pokemon.mitico;

  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || acoes.bloqueio) return;
    e.preventDefault();
    acoes.lutar();
  };
  const fechar = () => {
    window.removeEventListener('keydown', aoTeclar);
    cartao.remove();
  };

  const cartao = el(
    'div',
    { class: `encontro ${shiny ? 'shiny' : ''} ${lendario ? 'lendario' : ''}`, role: 'status', 'aria-live': 'polite' },
    el('div', { class: 'palco' }, spritePokemon(pokemon, { shiny, palco: true, chao: 0.9 })),
    el(
      'div',
      { class: 'info' },
      el('p', { class: 'aviso' }, lendario && shiny ? '★ Lendário shiny' : lendario ? '★ Lendário' : shiny ? '✨ Shiny' : 'Pokémon selvagem!'),
      el('h2', {}, el('span', { class: 'nome' }, pokemon.nome), genero !== 'N' ? el('span', { class: `genero ${genero}` }, ` ${simboloGenero(genero)}`) : null, el('small', {}, ` Nv. ${nivel}`)),
      selosTipos(pokemon),
      el(
        'button',
        { class: 'botao', disabled: !!acoes.bloqueio, title: acoes.bloqueio ?? 'Atalho: Enter', onclick: acoes.lutar },
        'Lutar ',
        el('kbd', {}, 'Enter'),
      ),
      el('p', { class: 'dica' }, acoes.bloqueio ?? 'Continue andando para fugir'),
    ),
  );

  window.addEventListener('keydown', aoTeclar);
  raiz.append(cartao);
  permitirArrastar(cartao, raiz);
  return fechar;
}

/** Posição (canto superior esquerdo, em px dentro do mapa) e tamanho escolhidos pelo jogador; valem para os próximos cartões. */
const CHAVE_POSICAO = 'jogo-claude:posicao-encontro';
const CHAVE_TAMANHO = 'jogo-claude:tamanho-encontro';
const TAMANHOS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

const ler = <T,>(chave: string, padrao: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(chave) ?? 'null') as T) ?? padrao;
  } catch {
    return padrao;
  }
};
const gravar = (chave: string, valor: unknown) => {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* ignora */
  }
};

/** Arrastar o cartão pelo mapa e aumentar/diminuir com os botões + e − do canto. */
function permitirArrastar(cartao: HTMLElement, raiz: HTMLElement) {
  let escala = ler(CHAVE_TAMANHO, 1);
  if (!TAMANHOS.includes(escala)) escala = 1;
  let [x, y] = [0, 0];

  // `scale` não mexe no layout: o tamanho visível é o do cartão × escala, a partir do canto de cima à esquerda
  const posicionar = (nx: number, ny: number) => {
    x = Math.max(0, Math.min(raiz.clientWidth - cartao.offsetWidth * escala, nx));
    y = Math.max(0, Math.min(raiz.clientHeight - cartao.offsetHeight * escala, ny));
    Object.assign(cartao.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto', scale: String(escala) });
  };
  const salva = ler<number[] | null>(CHAVE_POSICAO, null);
  if (Array.isArray(salva)) posicionar(salva[0], salva[1]);
  // padrão: canto de baixo à direita
  else posicionar(raiz.clientWidth - cartao.offsetWidth * escala - 12, raiz.clientHeight - cartao.offsetHeight * escala - 12);

  const mudarTamanho = (passo: number) => {
    const i = TAMANHOS.indexOf(escala) + passo;
    if (i < 0 || i >= TAMANHOS.length) return;
    escala = TAMANHOS[i];
    posicionar(x, y);
    gravar(CHAVE_TAMANHO, escala);
  };
  cartao.append(
    el('div', { class: 'encontro-tamanho' },
      el('button', { title: 'Diminuir', 'aria-label': 'Diminuir', onclick: () => mudarTamanho(-1) }, '−'),
      el('button', { title: 'Aumentar', 'aria-label': 'Aumentar', onclick: () => mudarTamanho(1) }, '+'),
    ),
  );

  cartao.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button') || e.button !== 0) return;
    e.preventDefault();
    const [ox, oy] = [e.clientX - x, e.clientY - y];
    cartao.setPointerCapture(e.pointerId);
    cartao.classList.add('arrastando');
    const mover = (ev: PointerEvent) => posicionar(ev.clientX - ox, ev.clientY - oy);
    cartao.addEventListener('pointermove', mover);
    cartao.addEventListener(
      'pointerup',
      () => {
        cartao.classList.remove('arrastando');
        cartao.removeEventListener('pointermove', mover);
        gravar(CHAVE_POSICAO, [x, y]);
      },
      { once: true },
    );
  });
}
