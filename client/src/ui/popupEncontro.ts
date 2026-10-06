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
    el('div', { class: 'palco' }, spritePokemon(pokemon, { shiny, alturaAlvo: 96, chao: 0.9 })),
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
  return fechar;
}
