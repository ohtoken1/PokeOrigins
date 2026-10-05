import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, type PokemonDoJogador } from '../estado';
import { el, spritePokemon } from './dom';

export function painelTime(time: PokemonDoJogador[]): HTMLElement {
  const vagas = Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) => {
    const membro = time[i];
    if (!membro) return el('div', { class: 'vaga vazia' });
    const p = pokemonPorId(membro.especieId);
    return el(
      'div',
      { class: `vaga ${membro.shiny ? 'shiny' : ''}` },
      spritePokemon(p, { shiny: membro.shiny, animado: false }),
      el('span', {}, `${p.nome}${membro.shiny ? ' ✨' : ''}`),
      el('small', {}, `Nv. ${membro.nivel}`),
    );
  });
  return el('div', { class: 'painel-time' }, el('h2', {}, `Seu time (${time.length}/${TAMANHO_MAXIMO_TIME})`), el('div', { class: 'vagas' }, vagas));
}
