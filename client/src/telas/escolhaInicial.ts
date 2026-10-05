import type { Tela } from '../main';
import { regiaoPorId } from '../../../shared/regioes';
import { pokemonPorId } from '../dados';
import { salvar } from '../estado';
import { el, selosTipos, spritePokemon } from '../ui/dom';

export const telaEscolhaInicial: Tela = (raiz, navegar) => {
  const regiao = regiaoPorId('kanto');

  const cartoes = regiao.iniciais.map((id) => {
    const p = pokemonPorId(id);
    return el(
      'button',
      {
        class: 'cartao-inicial',
        onclick: () => {
          salvar({ regiao: regiao.id, time: [{ especieId: id, nivel: 5, shiny: false }], passos: 0, vistos: [id] });
          navegar({ tela: 'regiao' });
        },
      },
      spritePokemon(p),
      el('strong', {}, p.nome),
      selosTipos(p),
    );
  });

  raiz.append(
    el(
      'main',
      { class: 'tela tela-inicial' },
      el('h1', {}, 'Escolha seu Pokémon inicial'),
      el('p', { class: 'sub' }, `Sua jornada começa em ${regiao.nome}.`),
      el('div', { class: 'grade-iniciais' }, cartoes),
    ),
  );
};
