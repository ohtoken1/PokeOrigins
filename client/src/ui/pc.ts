import { pokemonPorId } from '../dados';
import { salvar, TAMANHO_MAXIMO_TIME, type PokemonDoJogador, type Save } from '../estado';
import { fichaPokemon } from './detalhes';
import { abrirJanela } from './janela';
import { el } from './dom';
import { cartaoPokemon } from './time';

type Selecao = { onde: 'time' | 'caixa'; indice: number } | null;

/** PC: mover Pokémon entre o time e o PC, reordenar o time, soltar e ver a ficha. */
export function abrirPC(save: Save, aoMudar: () => void): void {
  let selecao: Selecao = null;
  let verFicha = false;

  const mudou = () => {
    salvar(save);
    aoMudar();
  };

  abrirJanela(
    'PC de Pokémon',
    (janela) => {
      const lista = (onde: 'time' | 'caixa') => (onde === 'time' ? save.time : save.caixa);
      const selecionado: PokemonDoJogador | null = selecao ? lista(selecao.onde)[selecao.indice] ?? null : null;
      const refazer = () => janela.redesenhar();

      const grade = (onde: 'time' | 'caixa') =>
        lista(onde).map((p, indice) =>
          cartaoPokemon(p, {
            class: `vaga ${selecao?.onde === onde && selecao.indice === indice ? 'selecionada' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`,
            onclick: () => {
              selecao = { onde, indice };
              verFicha = false;
              refazer();
            },
          }),
        );

      const acoes: HTMLElement[] = [];
      if (selecao && selecionado) {
        const { onde, indice } = selecao;
        const nome = pokemonPorId(selecionado.especieId).nome;
        acoes.push(el('button', { class: 'botao secundario', onclick: () => ((verFicha = !verFicha), refazer()) }, verFicha ? 'Esconder ficha' : 'Ver ficha'));
        if (onde === 'time') {
          acoes.push(
            el(
              'button',
              {
                class: 'botao',
                disabled: save.time.length <= 1,
                title: save.time.length <= 1 ? 'O time precisa de pelo menos 1 Pokémon' : '',
                onclick: () => {
                  save.caixa.push(...save.time.splice(indice, 1));
                  selecao = { onde: 'caixa', indice: save.caixa.length - 1 };
                  mudou();
                  refazer();
                },
              },
              'Guardar no PC',
            ),
            el(
              'button',
              {
                class: 'botao secundario',
                disabled: indice === 0,
                onclick: () => {
                  [save.time[indice - 1], save.time[indice]] = [save.time[indice], save.time[indice - 1]];
                  selecao = { onde, indice: indice - 1 };
                  mudou();
                  refazer();
                },
              },
              '◀ Mover para frente',
            ),
          );
        } else {
          acoes.push(
            el(
              'button',
              {
                class: 'botao',
                disabled: save.time.length >= TAMANHO_MAXIMO_TIME,
                title: save.time.length >= TAMANHO_MAXIMO_TIME ? 'Time cheio' : '',
                onclick: () => {
                  save.time.push(...save.caixa.splice(indice, 1));
                  selecao = { onde: 'time', indice: save.time.length - 1 };
                  mudou();
                  refazer();
                },
              },
              'Levar para o time',
            ),
          );
        }
        acoes.push(
          el(
            'button',
            {
              class: 'botao perigo',
              disabled: onde === 'time' && save.time.length <= 1,
              onclick: () => {
                if (!confirm(`Soltar ${nome}? Ele não volta mais.`)) return;
                lista(onde).splice(indice, 1);
                selecao = null;
                mudou();
                refazer();
              },
            },
            'Soltar',
          ),
        );
      }

      return el(
        'div',
        { class: 'pc' },
        el('section', {}, el('h4', {}, `Time (${save.time.length}/${TAMANHO_MAXIMO_TIME})`), el('div', { class: 'vagas vagas-time' }, grade('time'))),
        el(
          'section',
          {},
          el('h4', {}, `PC (${save.caixa.length})`),
          save.caixa.length ? el('div', { class: 'vagas vagas-caixa' }, grade('caixa')) : el('p', { class: 'meta' }, 'Nenhum Pokémon guardado.'),
        ),
        el(
          'div',
          { class: 'acoes-pc' },
          selecionado ? [el('strong', {}, `${pokemonPorId(selecionado.especieId).nome} Nv. ${selecionado.nivel}`), ...acoes] : el('span', { class: 'meta' }, 'Clique num Pokémon para ver as opções.'),
        ),
        verFicha && selecionado ? fichaPokemon(selecionado) : null,
      );
    },
    { classe: 'janela-pc' },
  );
}
