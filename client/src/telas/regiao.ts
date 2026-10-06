import type { Tela } from '../main';
import { REGIOES, regiaoPorId } from '../../../shared/regioes';
import { BIOMAS } from '../../../shared/biomas';
import { montarTabela } from '../../../shared/encontros';
import { pokemonsDaRegiao } from '../dados';
import { apagarSave, carregarSave, curarTime } from '../estado';
import { botoesMenus } from '../ui/menus';
import { el, spritePokemon } from '../ui/dom';
import { painelTime } from '../ui/time';

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;

export const telaRegiao: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  const regiao = regiaoPorId(save.regiao);
  const pokemons = pokemonsDaRegiao(regiao.id);

  const abas = REGIOES.map((r) =>
    el(
      'button',
      { class: `aba ${r.id === regiao.id ? 'ativa' : ''}`, disabled: !r.disponivel, title: r.disponivel ? '' : 'Em breve' },
      r.nome,
    ),
  );

  const cartoesBiomas = BIOMAS.map((bioma) => {
    const tabela = montarTabela(bioma, pokemons, regiao.iniciais);
    const destaques = [...tabela].sort((a, b) => b.peso - a.peso).slice(0, 4);
    return el(
      'button',
      {
        class: 'cartao-bioma',
        style: { '--cor-bioma': hex(bioma.cores.zona), '--cor-chao': hex(bioma.cores.chao) },
        onclick: () => navegar({ tela: 'bioma', biomaId: bioma.id }),
      },
      el('div', { class: 'faixa' }, destaques.map((e) => spritePokemon(e.pokemon, { animado: false }))),      el('strong', {}, bioma.nome),
      el('span', { class: 'desc' }, bioma.descricao),
      el('span', { class: 'meta' }, `${tabela.length} espécies · Nv. ${bioma.nivel[0]}–${bioma.nivel[1]}+`),
    );
  });

  raiz.append(
    el(
      'main',
      { class: 'tela tela-regiao' },
      el('nav', { class: 'abas' }, abas),
      el(
        'div',
        { class: 'layout-regiao' },
        el(
          'section',
          {},
          el('h1', {}, `Região de ${regiao.nome}`),
          el('p', { class: 'sub' }, `Pokédex: ${save.vistos.length} de ${regiao.pokedex[1] - regiao.pokedex[0] + 1} vistos · ${save.passos} passos`),
          el('div', { class: 'grade-biomas' }, cartoesBiomas),
        ),
        el(
          'aside',
          {},
          painelTime(save.time),
          el(
            'button',
            {
              class: 'botao',
              onclick: () => {
                curarTime(save);
                navegar({ tela: 'regiao' });
              },
            },
            '❤ Centro Pokémon (curar time)',
          ),
          el('div', { class: 'linha-botoes' }, botoesMenus(save, () => navegar({ tela: 'regiao' }))),
          el(
            'button',
            {
              class: 'botao secundario',
              onclick: () => {
                if (confirm('Apagar seu progresso e escolher outro inicial?')) {
                  apagarSave();
                  navegar({ tela: 'inicial' });
                }
              },
            },
            'Recomeçar',
          ),
          el(
            'p',
            { class: 'creditos' },
            'Tiles: "Tuxemon Tileset" por Buch e "Pokemon-inspired 16x16 tiles" por Red_Voxel (CC-BY-SA 3.0, OpenGameArt). Dados: PokéAPI. Batalha: Pokémon Showdown.',
          ),
        ),
      ),
    ),
  );
};
