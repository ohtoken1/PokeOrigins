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
export function mostrarEncontro(raiz: HTMLElement, encontro: Encontro, acoes: AcoesEncontro): () => void {
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
      el('h2', {}, el('span', { class: 'nome' }, pokemon.nome), el('small', {}, ` Nv. ${nivel}`)),
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

/** Posição escolhida pelo jogador (canto superior esquerdo, em px dentro do mapa); vale para os próximos cartões. */
const CHAVE_POSICAO = 'jogo-claude:posicao-encontro';

function permitirArrastar(cartao: HTMLElement, raiz: HTMLElement) {
  const limitar = (x: number, y: number) => [
    Math.max(0, Math.min(raiz.clientWidth - cartao.offsetWidth, x)),
    Math.max(0, Math.min(raiz.clientHeight - cartao.offsetHeight, y)),
  ];
  const posicionar = (x: number, y: number) => {
    [x, y] = limitar(x, y);
    Object.assign(cartao.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
    return [x, y];
  };
  try {
    const salva = JSON.parse(localStorage.getItem(CHAVE_POSICAO) ?? 'null');
    if (Array.isArray(salva)) posicionar(salva[0], salva[1]);
  } catch {
    /* sem posição salva: fica no canto */
  }

  cartao.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button') || e.button !== 0) return;
    e.preventDefault();
    const [ox, oy] = [e.clientX - cartao.offsetLeft, e.clientY - cartao.offsetTop];
    cartao.setPointerCapture(e.pointerId);
    cartao.classList.add('arrastando');
    const mover = (ev: PointerEvent) => posicionar(ev.clientX - ox, ev.clientY - oy);
    const soltar = () => {
      cartao.classList.remove('arrastando');
      cartao.removeEventListener('pointermove', mover);
      try {
        localStorage.setItem(CHAVE_POSICAO, JSON.stringify([cartao.offsetLeft, cartao.offsetTop]));
      } catch {
        /* ignora */
      }
    };
    cartao.addEventListener('pointermove', mover);
    cartao.addEventListener('pointerup', soltar, { once: true });
  });
}
