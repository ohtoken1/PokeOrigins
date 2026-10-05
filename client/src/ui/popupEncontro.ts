import type { Encontro } from '../../../shared/encontros';
import { el, selosTipos, spritePokemon } from './dom';

export interface AcoesEncontro {
  capturar(): void;
  fugir(): void;
  podeCapturar: boolean;
}

/** Mostra o pop-up "Um Pokémon selvagem apareceu!". Devolve uma função que fecha o pop-up. */
export function mostrarEncontro(raiz: HTMLElement, encontro: Encontro, acoes: AcoesEncontro): () => void {
  const { pokemon, nivel, shiny } = encontro;

  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Escape') acoes.fugir();
  };
  const fechar = () => {
    window.removeEventListener('keydown', aoTeclar);
    fundo.remove();
  };

  const fundo = el(
    'div',
    { class: 'popup-fundo' },
    el(
      'div',
      { class: `popup ${shiny ? 'shiny' : ''}`, role: 'dialog', 'aria-label': `${pokemon.nome} selvagem` },
      el('p', { class: 'aviso' }, shiny ? '✨ Um Pokémon SHINY apareceu! ✨' : 'Um Pokémon selvagem apareceu!'),
      el('div', { class: 'palco' }, spritePokemon(pokemon, { shiny })),
      el('h2', {}, pokemon.nome, el('small', {}, ` Nv. ${nivel}`)),
      selosTipos(pokemon),
      el(
        'div',
        { class: 'acoes' },
        el('button', { class: 'botao', disabled: true, title: 'O sistema de batalha é a próxima etapa' }, 'Lutar'),
        el(
          'button',
          { class: 'botao', disabled: !acoes.podeCapturar, title: acoes.podeCapturar ? 'Temporário até existir batalha e Pokébola' : 'Time cheio', onclick: acoes.capturar },
          'Capturar (teste)',
        ),
        el('button', { class: 'botao secundario', onclick: acoes.fugir }, 'Fugir'),
      ),
    ),
  );

  window.addEventListener('keydown', aoTeclar);
  raiz.append(fundo);
  return fechar;
}
