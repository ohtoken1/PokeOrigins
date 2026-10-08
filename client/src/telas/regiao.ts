import { FUNDOS_BATALHA } from '../batalha/telaBatalha';
import { tempoRestanteVip, vipAtivo } from '../../../shared/vip';
import type { Tela } from '../main';
import { REGIOES, regiaoPorId } from '../../../shared/regioes';
import { BIOMAS } from '../../../shared/biomas';
import { faixaDosEncontros, montarTabela, probabilidades } from '../../../shared/encontros';
import { progressoTreinador } from '../../../shared/treinador';
import { pokemonsDaRegiao, todosOsPokemons } from '../dados';
import { apagarSave, carregarSave, curarTime, salvar, usarSave } from '../estado';
import { icone } from '../ui/icones';
import { botoesMenus } from '../ui/menus';
import { el, spritePokemon } from '../ui/dom';
import { painelTime } from '../ui/time';

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;

export const telaRegiao: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  usarSave(save);
  const regiao = regiaoPorId(save.regiao);
  const pokemons = pokemonsDaRegiao(regiao.id);
  const treinador = progressoTreinador(save.xpTreinador);

  const abas = REGIOES.map((r) =>
    el(
      'button',
      {
        class: `aba ${r.id === regiao.id ? 'ativa' : ''}`,
        disabled: !r.disponivel,
        title: r.disponivel ? '' : 'Em breve',
        // trocar de região: o time vai junto, os biomas passam a ter os Pokémon da região escolhida
        onclick: () => {
          if (r.id === regiao.id) return;
          save.regiao = r.id;
          salvar(save);
          navegar({ tela: 'regiao' });
        },
      },
      r.nome,
    ),
  );

  const cartoesBiomas = BIOMAS.map((bioma) => {
    const tabela = montarTabela(bioma, pokemons, [], todosOsPokemons());
    const faixa = faixaDosEncontros(bioma, treinador.nivel);
    const chances = probabilidades(tabela, faixa);
    const possiveis = tabela.filter((_, i) => chances[i] > 0);
    const destaques = tabela
      .map((e, i) => ({ e, chance: chances[i] }))
      .filter(({ chance }) => chance > 0)
      .sort((a, b) => b.chance - a.chance)
      .slice(0, 4)
      .map(({ e }) => e);
    return el(
      'button',
      {
        class: 'cartao-bioma',
        // em cima, o primeiro fundo de batalha do bioma (o mesmo cenário das lutas)
        style: { '--cor-bioma': hex(bioma.cores.zona), '--cor-chao': hex(bioma.cores.chao), '--fundo-bioma': FUNDOS_BATALHA[bioma.id] ? `url(batalha/${FUNDOS_BATALHA[bioma.id][0]})` : 'none' },
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
          el('p', { class: 'sub' }, `Pokédex: ${save.vistos.filter((n) => n >= regiao.pokedex[0] && n <= regiao.pokedex[1]).length} de ${regiao.pokedex[1] - regiao.pokedex[0] + 1} vistos · ${save.passos} passos`),
          el('div', { class: 'grade-biomas' }, cartoesBiomas),
        ),
        el(
          'aside',
          {},
          // moedas separadas: silver (ganha jogando) e gold (moeda paga, futuramente)
          el(
            'div',
            { class: 'carteira' },
            el('div', { class: 'moeda moeda-silver', title: 'Silver: ganho jogando' }, el('span', { class: 'moeda-icone' }), el('small', {}, 'Silver'), el('strong', {}, save.silver.toLocaleString('pt-BR'))),
            el('div', { class: 'moeda moeda-gold', title: 'Gold: moeda paga (por enquanto, pelo painel Admin)' }, el('span', { class: 'moeda-icone' }), el('small', {}, 'Gold'), el('strong', {}, save.gold.toLocaleString('pt-BR'))),
            vipAtivo(save)
              ? el('div', { class: 'selo-vip-conta', title: 'VIP: bônus na conta por um tempo (os bônus ainda vão ser definidos)' }, el('span', { class: 'icone-vip' }, 'VIP'), el('small', {}, `ativo · acaba em ${tempoRestanteVip(save)}`))
              : null,
          ),
          el(
            'div',
            { class: 'painel-treinador' },
            el('div', { class: 'linha-treinador' }, el('strong', {}, `Treinador Nv. ${treinador.nivel}`), el('button', { class: 'botao secundario editar-personagem', title: 'Editar personagem', onclick: () => navegar({ tela: 'personagem' }) }, '✏️ Personagem')),
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
            'Tiles: "Tuxemon Tileset" por Buch (CC-BY-SA 3.0) e tilesets "Core Outdoor", "Core Buildings" e "Core City and Country" do projeto Tuxemon por rubberduck, George_, Buch, Kelvin Shadewing, ArMM1998, Isaiah658 e outros (CC-BY-SA 4.0). Dados: PokéAPI. Batalha: Pokémon Showdown.',
          ),
        ),
      ),
    ),
  );
};
