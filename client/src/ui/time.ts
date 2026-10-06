import { hpMaximo, nomeGolpe } from '../../../shared/batalha/pokemon';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, type PokemonDoJogador } from '../estado';
import { abrirDetalhes } from './detalhes';
import { el, spritePokemon } from './dom';

export function barraHp(hp: number, hpMax: number): HTMLElement {
  const fracao = hpMax > 0 ? hp / hpMax : 0;
  const cor = fracao > 0.5 ? 'verde' : fracao > 0.2 ? 'amarela' : 'vermelha';
  return el('div', { class: 'barra-hp' }, el('div', { class: `preenchido ${cor}`, style: { width: `${fracao * 100}%` } }));
}

/** Cartãozinho de um Pokémon (time, PC, escolha de alvo de item). */
export function cartaoPokemon(p: PokemonDoJogador, atributos: Record<string, unknown> = {}): HTMLElement {
  const dados = pokemonPorId(p.especieId);
  const max = hpMaximo(p);
  return el(
    'button',
    {
      class: `vaga ${p.shiny ? 'shiny' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`,
      title: `${p.golpes.map((g) => nomeGolpe(g.id)).join(', ')}\nHP ${p.hp}/${max}${p.status ? ` · ${p.status.toUpperCase()}` : ''}`,
      ...atributos,
    },
    spritePokemon(dados, { shiny: p.shiny, animado: false }),
    el('span', {}, `${dados.nome}${p.shiny ? ' ✨' : ''}`),
    el('small', {}, `Nv. ${p.nivel}`),
    barraHp(p.hp, max),
  );
}

export function painelTime(time: PokemonDoJogador[]): HTMLElement {
  const vagas = Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) =>
    time[i] ? cartaoPokemon(time[i], { onclick: () => abrirDetalhes(time[i]) }) : el('div', { class: 'vaga vazia' }),
  );
  return el('div', { class: 'painel-time' }, el('h2', {}, `Seu time (${time.length}/${TAMANHO_MAXIMO_TIME})`), el('div', { class: 'vagas' }, vagas));
}
