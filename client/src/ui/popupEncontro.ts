import { digitando } from './digitando';
import type { Encontro } from '../../../shared/encontros';
import { el, seloGenero, selosTipos, spritePokemon } from './dom';

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
export function mostrarEncontro(raiz: HTMLElement, encontro: Encontro, acoes: AcoesEncontro, genero: 'M' | 'F' | 'N' = 'N'): () => void {
  const { pokemon, nivel, shiny } = encontro;
  const lendario = pokemon.lendario || pokemon.mitico;

  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || acoes.bloqueio || digitando()) return;
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
      el('h2', {}, el('span', { class: 'nome' }, pokemon.nome), seloGenero(genero), el('small', {}, ` Nv. ${nivel}`)),
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
const [MIN_ESCALA, MAX_ESCALA] = [0.6, 2];

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

/** Arrastar o cartão pelo mapa e mudar o tamanho pela alça do canto. */
function permitirArrastar(cartao: HTMLElement, raiz: HTMLElement) {
  let escala = ler(CHAVE_TAMANHO, 1);
  if (!(escala >= MIN_ESCALA && escala <= MAX_ESCALA)) escala = 1;
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

  // alça no canto de baixo à direita: arrastar muda o tamanho do cartão
  const alca = el('div', { class: 'encontro-alca', title: 'Arraste para mudar o tamanho' });
  cartao.append(alca);
  alca.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const [x0, escala0] = [e.clientX, escala];
    const largura = cartao.offsetWidth;
    alca.setPointerCapture(e.pointerId);
    const mover = (ev: PointerEvent) => {
      escala = Math.max(MIN_ESCALA, Math.min(MAX_ESCALA, escala0 + (ev.clientX - x0) / largura));
      posicionar(x, y);
    };
    alca.addEventListener('pointermove', mover);
    alca.addEventListener(
      'pointerup',
      () => {
        alca.removeEventListener('pointermove', mover);
        gravar(CHAVE_TAMANHO, escala);
      },
      { once: true },
    );
  });

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
