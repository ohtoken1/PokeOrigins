// Janela da Liga Pokémon (Arena → Liga Pokémon). Duas Ligas: a normal (Elite 4 + Campeão) e a Nightmare (18 tipos).
// O servidor (server/src/liga.ts) entrega o próximo time e guarda o progresso da semana; o time do jogador NÃO é
// curado entre as batalhas. Perdeu = só na semana seguinte.
import { NOME_LIGA, type TipoLiga } from '../../../shared/liga';
import { hpMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { api, ErroApi } from '../conta';
import type { Save } from '../estado';
import { confirmar } from './confirmar';
import { el } from './dom';
import { abrirJanela } from './janela';
import { valorEmMoeda } from './moeda';
import { avisar } from './avisos';

interface EstadoLiga {
  liga: TipoLiga; nome: string; pronta: boolean; etapas: string[]; etapa: number; estado: 'jogando' | 'perdeu' | 'venceu' | null;
  premio: { silver: number; nomeMoeda: string; quantidade: number };
}
type Lutar = (equipe: PokemonIndividual[], nome: string, titulo: string, aoFim: (venceu: boolean) => void) => void;

const quando = (ms: number) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit' });

export function abrirLiga(save: Save, lutar: Lutar): void {
  let dados: { ligas: EstadoLiga[]; viraEm: number } | null = null;
  let aviso = '';
  const carregar = () => api<{ ligas: EstadoLiga[]; viraEm: number }>('GET', '/liga')
    .then((r) => ((dados = r), janela.redesenhar()))
    .catch((e) => ((aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'), janela.redesenhar()));

  async function batalhar(l: EstadoLiga): Promise<void> {
    if (l.estado === null && !(await confirmar(l.nome, `Começar a ${l.nome}? São ${l.etapas.length} batalhas seguidas, sem curar o time entre elas. Se perder, só tenta de novo na semana que vem.`))) return;
    try {
      const r = await api<{ etapa: number; total: number; nome: string; equipe: PokemonIndividual[] }>('POST', '/liga/entrar', { liga: l.liga });
      const equipe = r.equipe.map((p) => ({ ...p, hp: hpMaximo(p), status: null }));
      janela.fechar();
      lutar(equipe, r.nome, `${NOME_LIGA[l.liga]} (${r.etapa + 1}/${r.total})`, async (venceu) => {
        try {
          await api('POST', '/liga/resultado', { liga: l.liga, venceu });
        } catch (e) {
          avisar(e instanceof ErroApi ? e.message : 'Sem conexão: o resultado não foi registrado.', 'erro');
        }
        abrirLiga(save, lutar);
      });
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
      void carregar();
    }
  }

  const cartao = (l: EstadoLiga) => {
    const situacao = !l.pronta ? 'A staff ainda está preparando os times.'
      : l.estado === 'venceu' ? '🏆 Você venceu esta semana!'
      : l.estado === 'perdeu' ? 'Derrotado nesta semana. Volte na semana que vem.'
      : l.estado === 'jogando' ? `Próxima batalha: ${l.etapas[l.etapa]}`
      : 'Uma tentativa por semana.';
    return el('section', { class: `liga-cartao liga-${l.liga}` },
      el('h3', {}, l.nome),
      el('ol', { class: 'liga-etapas-jogador' }, ...l.etapas.map((nome, i) =>
        el('li', { class: i < l.etapa || l.estado === 'venceu' ? 'vencida' : i === l.etapa && l.estado === 'jogando' ? 'atual' : '' }, nome))),
      el('p', { class: 'meta' }, 'Prêmio: ', valorEmMoeda('silver', l.premio.silver), ` + ${l.premio.quantidade} ${l.premio.nomeMoeda}`),
      el('p', {}, situacao),
      l.pronta && (l.estado === null || l.estado === 'jogando')
        ? el('button', { class: 'botao', onclick: () => void batalhar(l) }, l.estado === null ? 'Começar' : 'Próxima batalha')
        : null);
  };

  const janela = abrirJanela('Liga Pokémon', () => {
    if (!dados) return el('p', { class: 'meta' }, aviso || 'Carregando…');
    return el('div', { class: 'liga-janela' },
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      el('p', { class: 'meta' }, `O time não é curado entre as batalhas: use a bolsa entre uma e outra. A semana vira ${quando(dados.viraEm)}.`),
      el('p', { class: 'meta' }, `Suas moedas: ${save.leagueCoins ?? 0} League Coins · ${save.leagueCoinsNightmare ?? 0} League Coins Nightmare (a loja vem depois).`),
      el('div', { class: 'liga-cartoes' }, ...dados.ligas.map(cartao)));
  }, { classe: 'janela-liga' });
  void carregar();
}
