import type { Tela } from '../main';
import { REGIOES, regiaoPorId } from '../../../shared/regioes';
import { BIOMAS } from '../../../shared/biomas';
import { faixaDosEncontros, montarTabela, probabilidades } from '../../../shared/encontros';
import { progressoTreinador } from '../../../shared/treinador';
import { pokemonsDaRegiao } from '../dados';
import { apagarSave, carregarSave, curarTime, salvar } from '../estado';
import { icone } from '../ui/icones';
import { botoesMenus } from '../ui/menus';
import { el, spritePokemon } from '../ui/dom';
import { painelTime } from '../ui/time';

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;

export const telaRegiao: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  const regiao = regiaoPorId(save.regiao);
  const pokemons = pokemonsDaRegiao(regiao.id);
  const treinador = progressoTreinador(save.xpTreinador);

  const abas = REGIOES.map((r) =>
    el(
      'button',
      { class: `aba ${r.id === regiao.id ? 'ativa' : ''}`, disabled: !r.disponivel, title: r.disponivel ? '' : 'Em breve' },
      r.nome,
    ),
  );

  const cartoesBiomas = BIOMAS.map((bioma) => {
    const tabela = montarTabela(bioma, pokemons, regiao.iniciais);
    const faixa = faixaDosEncontros(bioma, treinador.nivel);
    const chances = probabilidades(tabela, faixa);
    const possiveis = tabela.filter((_, i) => chances[i] > 0);
    const destaques = [...possiveis].sort((a, b) => b.peso - a.peso).slice(0, 4);
    return el(
      'button',
      {
        class: 'cartao-bioma',
        style: { '--cor-bioma': hex(bioma.cores.zona), '--cor-chao': hex(bioma.cores.chao) },
        onclick: () => navegar({ tela: 'bioma', biomaId: bioma.id }),
      },
      el('div', { class: 'faixa' }, destaques.map((e) => spritePokemon(e.pokemon, { animado: false }))),      el('strong', {}, bioma.nome),
      el('span', { class: 'desc' }, bioma.descricao),
      el('span', { class: 'meta' }, `${possiveis.length} espécies agora · Nv. ${faixa[0]}–${faixa[1]}`),
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
          el(
            'div',
            { class: 'painel-treinador' },
            el('div', { class: 'linha-treinador' }, el('strong', {}, `Treinador Nv. ${treinador.nivel}`), el('span', { class: 'saldo' }, `${save.silver.toLocaleString('pt-BR')} silver`)),
            el('small', {}, treinador.necessario ? `${treinador.atual.toLocaleString('pt-BR')} / ${treinador.necessario.toLocaleString('pt-BR')} XP` : 'Nível máximo!'),
            el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${treinador.necessario ? (treinador.atual / treinador.necessario) * 100 : 100}%` } })),
          ),
          painelTime(save.time, () => {
            salvar(save);
            navegar({ tela: 'regiao' });
          }),
          el(
            'button',
            {
              class: 'botao botao-com-icone',
              onclick: () => {
                curarTime(save);
                navegar({ tela: 'regiao' });
              },
            },
            icone('coracao'),
            'Centro Pokémon (curar time)',
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
            'Tiles: "Tuxemon Tileset" por Buch (CC-BY-SA 3.0) e tilesets "Core Outdoor" do projeto Tuxemon por rubberduck, George_, Buch e outros (CC-BY-SA 4.0). Dados: PokéAPI. Batalha: Pokémon Showdown.',
          ),
        ),
      ),
    ),
  );
};
