// Comunidade → Ranking: geral, capturas, shiny, lendários, nível, missões do quadro, medalhas de torneio, silver
// e gold, e o PvP ranqueado (um ranking por tier: Ubers, OU, UU e RU, com o elo de cada um). A lista com todos os jogadores vem do servidor (GET /api/ranking, refeita a cada 30 s); a sua linha usa
// o seu save de agora. Sem conexão, só você aparece.
import { comMenuLateral, menuLateral } from '../ui/menuLateral';
import type { Navegar } from '../main';
import { CATEGORIAS_RANKING, ordenarRanking, type CategoriaRanking, type DadosRanking } from '../../../shared/ranking';
import { nivelTreinador } from '../../../shared/treinador';
import { api, conta } from '../conta';
import { carregarSave, type Save } from '../estado';
import { el } from '../ui/dom';
import { abasFormato, formatoGuardado, guardarFormato, tabelaRanqueado, type LinhaRankingRanqueado } from '../ui/ranqueado';
import { NOME_FORMATO, type FormatoRanqueado } from '../../../shared/ranqueado';

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
    // as medalhas que o Torneio entrega (ouro, prata e bronze somadas)
    medalhas: (e.medalhasOuro ?? 0) + (e.medalhasPrata ?? 0) + (e.medalhasBronze ?? 0),
    missoes: e.missoesQuadro ?? 0,
    silver: save.silver,
    gold: save.gold,
  };
}

export function telaRanking(raiz: HTMLElement, _navegar: Navegar, inicial?: 'ranqueado'): () => void {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-ranking' }, el('h1', {}, 'Ranking'));
  raiz.append(tela);
  let categoria: CategoriaRanking | 'ranqueado' = inicial ?? 'geral';
  let formato = formatoGuardado();
  /** Ranking ranqueado de cada formato (buscado ao abrir a aba). */
  const ranqueado = new Map<FormatoRanqueado, LinhaRankingRanqueado[] | 'erro'>();
  const corpo = el('div', { class: 'ranking-corpo' });
  /** Os outros jogadores (null = ainda buscando ou sem conexão). */
  let outros: Linha[] | null = null;
  let semConexao = false;
  let aberta = true;

  // menu na lateral, em grupos (modelo 3 escolhido pelo dono)
  const opcao = (id: string, icone: string) => ({ id, icone, nome: CATEGORIAS_RANKING.find((x) => x.id === id)?.nome ?? id });
  const GRUPOS = [
    { titulo: 'Geral', opcoes: [opcao('geral', '🏆')] },
    { titulo: 'Capturas', opcoes: [opcao('capturas', '🎯'), opcao('shiny', '✨'), opcao('lendarios', '👑')] },
    { titulo: 'Progresso', opcoes: [opcao('nivel', '⭐'), opcao('missoes', '📋'), opcao('medalhas', '🏅')] },
    { titulo: 'Riqueza', opcoes: [opcao('silver', '💰'), opcao('gold', '🪙')] },
    { titulo: 'PvP', opcoes: [{ id: 'ranqueado', icone: '⚔️', nome: 'PvP Ranqueado' }] },
  ];
  const abas = () => menuLateral(GRUPOS, categoria, (id) => {
    categoria = id as typeof categoria;
    if (id === 'ranqueado') ranqueado.clear();
    desenhar();
  });

  function desenharRanqueado() {
    const f = formato;
    const lista = ranqueado.get(f);
    if (!lista)
      api<{ lista: LinhaRankingRanqueado[] }>('GET', `/ranqueado/ranking?formato=${f}`).then((r) => ranqueado.set(f, r.lista), () => ranqueado.set(f, 'erro')).finally(() => {
        if (aberta && categoria === 'ranqueado') desenhar();
      });
    corpo.replaceChildren(comMenuLateral(
      abas(),
      abasFormato(f, (novo) => ((formato = novo), guardarFormato(novo), ranqueado.delete(novo), desenhar())),
      el('p', { class: 'ranking-descricao' }, `Elo de cada treinador no PvP ranqueado ${NOME_FORMATO[f]} (só quem já jogou neste formato). Os 3 primeiros da Beast Ball são Master Ball.`),
      !lista ? el('p', { class: 'meta' }, 'Buscando…') : lista === 'erro' ? el('p', { class: 'meta' }, 'Sem conexão com o servidor.') : tabelaRanqueado(lista, conta()?.usuario ?? '')));
  }

  function desenhar() {
    if (categoria === 'ranqueado') return desenharRanqueado();
    const c = CATEGORIAS_RANKING.find((x) => x.id === categoria)!;
    const eu = save ? dadosDoJogador(save) : null;
    const todos = [...(outros ?? []).filter((d) => d.usuario !== eu?.usuario), ...(eu ? [eu] : [])];
    const lista = ordenarRanking(todos, categoria) as Linha[];
    const minha = eu ? lista.indexOf(eu) : -1;
    const linha = (d: Linha, i: number) =>
      el('tr', { class: d === eu ? 'eu' : '' }, el('td', { class: `posicao p${i + 1}` }, String(i + 1)), el('td', {}, d.nome), el('td', { class: 'valor' }, c.valor(d).toLocaleString('pt-BR')));
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
    corpo.replaceChildren(comMenuLateral(
      abas(),
      el('p', { class: 'ranking-descricao' }, c.descricao),
      tabela,
      el('small', { class: 'meta' }, semConexao ? 'Sem conexão com o servidor: mostrando só você.' : outros ? `${lista.length.toLocaleString('pt-BR')} treinadores no ranking. Os números dos outros jogadores atualizam a cada meio minuto.` : 'Buscando os outros treinadores…'),
    ));
  }
  desenhar();
  tela.append(corpo);
  api<Linha[]>('GET', '/ranking').then((lista) => (outros = lista), () => (semConexao = true)).finally(() => {
    if (aberta && categoria !== 'ranqueado') desenhar();
  });
  return () => void (aberta = false);
}
