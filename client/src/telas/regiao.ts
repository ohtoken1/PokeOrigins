import { FUNDOS_BATALHA } from '../batalha/telaBatalha';
import { tempoRestanteVip, vipAtivo } from '../../../shared/vip';
import type { Tela } from '../main';
import { REGIOES, regiaoPorId } from '../../../shared/regioes';
import { BIOMAS } from '../../../shared/biomas';
import { faixaDosEncontros, montarTabela, probabilidades } from '../../../shared/encontros';
import { progressoTreinador } from '../../../shared/treinador';
import { pokemonsDaRegiao, todosOsPokemons } from '../dados';
import { apagarSave, carregarSave, salvar, usarSave } from '../estado';
import { icone } from '../ui/icones';
import { ehAdministrador } from '../bonificacao';
import { viagemAtual } from '../viagem';
import { el, spritePokemon } from '../ui/dom';
import { acompanharTime, painelTime } from '../ui/time';
import { confirmar } from '../ui/confirmar';

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;

export const telaRegiao: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  usarSave(save);
  const regiao = regiaoPorId(save.regiao);
  const pokemons = pokemonsDaRegiao(regiao.id);
  const treinador = progressoTreinador(save.xpTreinador);
  // time ao lado: acompanha o PC e a bolsa (aparece na hora)
  const caixaTime = el('div', {});
  const desenharTime = () => caixaTime.replaceChildren(painelTime(save.time, () => salvar(save)));
  desenharTime();
  acompanharTime(caixaTime, desenharTime);

  // trocar de região pelas abas é só para administradores: jogadores viajam de trem (estação da cidade)
  const admin = ehAdministrador();
  const viagem = admin ? null : viagemAtual();
  const abas = !admin ? [] : REGIOES.map((r) =>
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
      admin ? el('nav', { class: 'abas' }, abas) : null,
      el(
        'div',
        { class: 'layout-regiao' },
        el(
          'section',
          {},
          el('h1', {}, `Região de ${regiao.nome}`),
          el('p', { class: 'sub' }, `Pokédex: ${save.vistos.filter((n) => n >= regiao.pokedex[0] && n <= regiao.pokedex[1]).length} de ${regiao.pokedex[1] - regiao.pokedex[0] + 1} vistos · ${save.passos} passos`),
          viagem
            ? el('p', { class: 'aviso-mapas-viagem' }, `Você está viajando para ${regiaoPorId(viagem.para).nome}. Os mapas abrem quando o trem chegar; enquanto isso, aproveite a cidade.`)
            : el('div', { class: 'grade-biomas' }, cartoesBiomas),
          admin ? null : el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'cidade' }) }, '← Voltar para a cidade'),
        ),
        el(
          'aside',
          {},
          // moedas separadas: silver (ganha jogando) e gold (moeda paga, futuramente)
          el(
            'div',
            { class: 'carteira' },
            el('div', { class: 'moeda moeda-silver', title: 'Poké Dólar: ganho jogando' }, el('span', { class: 'moeda-icone' }), el('small', {}, 'Poké Dólar'), el('strong', {}, save.silver.toLocaleString('pt-BR'))),
            el('div', { class: 'moeda moeda-gold', title: 'Origin Coin: moeda paga (por enquanto, pelo painel Admin)' }, el('span', { class: 'moeda-icone' }), el('small', {}, 'Origin Coin'), el('strong', {}, save.gold.toLocaleString('pt-BR'))),
            vipAtivo(save)
              ? el('div', { class: 'selo-vip-conta', title: 'VIP: bônus na conta por um tempo (os bônus ainda vão ser definidos)' }, el('span', { class: 'icone-vip' }, 'VIP'), el('small', {}, `ativo · acaba em ${tempoRestanteVip(save)}`))
              : null,
          ),
          el(
            'div',
            { class: 'painel-treinador' },
            el('div', { class: 'linha-treinador' }, el('strong', {}, `Treinador Nv. ${treinador.nivel}`)),
            el('small', {}, treinador.necessario ? `${treinador.atual.toLocaleString('pt-BR')} / ${treinador.necessario.toLocaleString('pt-BR')} XP` : 'Nível máximo!'),
            el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${treinador.necessario ? (treinador.atual / treinador.necessario) * 100 : 100}%` } })),
          ),
          caixaTime,
          // Curar time, PC, Bolsa e Loja saíram desta tela (pedido do dono: os jogadores usam o Centro Pokémon e
          // os atalhos do cabeçalho); "Recomeçar" ficou só para a staff (testes)
          ...(admin ? [
          el(
            'button',
            {
              class: 'botao secundario',
              onclick: async () => {
                if ((await confirmar('Confirmar', 'Apagar seu progresso e escolher outro inicial?'))) {
                  apagarSave();
                  navegar({ tela: 'inicial' });
                }
              },
            },
            'Recomeçar',
          ),
          ] : []),
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
