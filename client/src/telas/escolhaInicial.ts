import type { Tela } from '../main';
import { regiaoPorId } from '../../../shared/regioes';
import { pokemonPorId } from '../dados';
import { novoSave, salvar } from '../estado';
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
          salvar(novoSave(regiao.id, id));
          navegar({ tela: 'regiao' });
        },
      },
      el('div', { class: 'palco-inicial' }, spritePokemon(p, { alturaAlvo: 120 })),
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
