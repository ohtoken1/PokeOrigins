// Aba "Ranking": geral, capturas, shiny, lendários, nível, medalhas de torneio, silver e gold.
// Sem servidor ainda, a lista tem só o próprio jogador.
import type { Tela } from '../main';
import { CATEGORIAS_RANKING, ordenarRanking, type CategoriaRanking, type DadosRanking } from '../../../shared/ranking';
import { nivelTreinador } from '../../../shared/treinador';
import { carregarSave, type Save } from '../estado';
import { el } from '../ui/dom';

function dadosDoJogador(save: Save): DadosRanking {
  const e = save.estatisticas!;
  return {
    nome: save.aparencia?.nome || 'Você',
    capturas: e.capturas,
    capturasShiny: e.capturasShiny,
    capturasLendarios: e.capturasLendarios,
    nivel: nivelTreinador(save.xpTreinador),
    xp: save.xpTreinador,
    medalhas: e.medalhas,
    silver: save.silver,
    gold: save.gold,
  };
}

export const telaRanking: Tela = (raiz) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-ranking' }, el('h1', {}, 'Ranking'));
  raiz.append(tela);
  let categoria: CategoriaRanking = 'geral';
  const corpo = el('div', { class: 'ranking-corpo' });

  function desenhar() {
    const c = CATEGORIAS_RANKING.find((x) => x.id === categoria)!;
    const lista = save ? ordenarRanking([dadosDoJogador(save)], categoria) : [];
    const abas = el('div', { class: 'ranking-abas' },
      ...CATEGORIAS_RANKING.map((x) => el('button', { class: `aba ${x.id === categoria ? 'ativa' : ''}`, onclick: () => ((categoria = x.id), desenhar()) }, x.nome)));
    const tabela = c.emBreve
      ? el('section', { class: 'em-breve' }, el('span', { class: 'selo-em-breve' }, 'Em breve'), el('p', {}, 'Os torneios online ainda vão ser feitos. Quando existirem, as medalhas aparecem aqui.'))
      : lista.length
        ? el('table', { class: 'ranking-tabela' },
            el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Treinador'), el('th', {}, c.coluna))),
            el('tbody', {}, ...lista.map((d, i) => el('tr', { class: 'eu' }, el('td', { class: `posicao p${i + 1}` }, String(i + 1)), el('td', {}, d.nome), el('td', { class: 'valor' }, c.valor(d).toLocaleString('pt-BR'))))))
        : el('p', { class: 'meta' }, 'Comece um jogo para entrar no ranking.');
    corpo.replaceChildren(
      abas,
      el('p', { class: 'ranking-descricao' }, c.descricao),
      tabela,
      el('small', { class: 'meta' }, 'Por enquanto só você aparece: o ranking com todos os jogadores precisa do servidor online, que ainda vai ser feito.'),
    );
  }
  desenhar();
  tela.append(corpo);
};
