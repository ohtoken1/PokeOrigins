// Comunidade → Ranking: geral, capturas, shiny, lendários, nível, missões do quadro, medalhas de torneio, silver
// e gold. A lista com todos os jogadores vem do servidor (GET /api/ranking, refeita a cada 30 s); a sua linha usa
// o seu save de agora. Sem conexão, só você aparece.
import type { Tela } from '../main';
import { CATEGORIAS_RANKING, ordenarRanking, type CategoriaRanking, type DadosRanking } from '../../../shared/ranking';
import { nivelTreinador } from '../../../shared/treinador';
import { api, conta } from '../conta';
import { carregarSave, type Save } from '../estado';
import { el } from '../ui/dom';

type Linha = DadosRanking & { usuario: string };
/** Quantas posições a tabela mostra (a sua aparece sempre, mesmo fora delas). */
const POSICOES = 100;

function dadosDoJogador(save: Save): Linha {
  const e = save.estatisticas!;
  return {
    usuario: conta()?.usuario ?? '',
    nome: save.aparencia?.nome || 'Você',
    capturas: e.capturas,
    capturasShiny: e.capturasShiny,
    capturasLendarios: e.capturasLendarios,
    nivel: nivelTreinador(save.xpTreinador),
    xp: save.xpTreinador,
    medalhas: e.medalhas,
    missoes: e.missoesQuadro ?? 0,
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
  /** Os outros jogadores (null = ainda buscando ou sem conexão). */
  let outros: Linha[] | null = null;
  let semConexao = false;
  let aberta = true;

  function desenhar() {
    const c = CATEGORIAS_RANKING.find((x) => x.id === categoria)!;
    const eu = save ? dadosDoJogador(save) : null;
    const todos = [...(outros ?? []).filter((d) => d.usuario !== eu?.usuario), ...(eu ? [eu] : [])];
    const lista = ordenarRanking(todos, categoria) as Linha[];
    const minha = eu ? lista.indexOf(eu) : -1;
    const linha = (d: Linha, i: number) =>
      el('tr', { class: d === eu ? 'eu' : '' }, el('td', { class: `posicao p${i + 1}` }, String(i + 1)), el('td', {}, d.nome), el('td', { class: 'valor' }, c.valor(d).toLocaleString('pt-BR')));
    const abas = el('div', { class: 'ranking-abas' },
      ...CATEGORIAS_RANKING.map((x) => el('button', { class: `aba ${x.id === categoria ? 'ativa' : ''}`, onclick: () => ((categoria = x.id), desenhar()) }, x.nome)));
    const tabela = c.emBreve
      ? el('section', { class: 'em-breve' }, el('span', { class: 'selo-em-breve' }, 'Em breve'), el('p', {}, 'Os torneios online ainda vão ser feitos. Quando existirem, as medalhas aparecem aqui.'))
      : lista.length
        ? el('table', { class: 'ranking-tabela' },
            el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Treinador'), el('th', {}, c.coluna))),
            el('tbody', {},
              ...lista.slice(0, POSICOES).map(linha),
              // a sua posição aparece mesmo fora das primeiras
              ...(minha >= POSICOES ? [linha(lista[minha], minha)] : [])))
        : el('p', { class: 'meta' }, 'Comece um jogo para entrar no ranking.');
    corpo.replaceChildren(
      abas,
      el('p', { class: 'ranking-descricao' }, c.descricao),
      tabela,
      el('small', { class: 'meta' }, semConexao ? 'Sem conexão com o servidor: mostrando só você.' : outros ? `${lista.length.toLocaleString('pt-BR')} treinadores no ranking. Os números dos outros jogadores atualizam a cada meio minuto.` : 'Buscando os outros treinadores…'),
    );
  }
  desenhar();
  tela.append(corpo);
  api<Linha[]>('GET', '/ranking').then((lista) => (outros = lista), () => (semConexao = true)).finally(() => {
    if (aberta) desenhar();
  });
  return () => void (aberta = false);
};
