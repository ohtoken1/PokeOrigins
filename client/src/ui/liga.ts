// Janela da Liga Pokémon (Arena → Liga Pokémon). Duas Ligas: a normal (Elite 4) e a Nightmare (18 tipos).
// O desafio é feito de uma vez (pedido do dono, 20/10/2026): o time de 6 é travado no começo e não é curado (só
// remédios entre as batalhas, aqui); as batalhas são calculadas no servidor (server/src/liga.ts + pvp.ts, 180 s por
// turno) e a próxima começa sozinha depois de uma vitória. Sair do jogo não para nada; perdeu = só na semana seguinte.
import { abrirLojaDaLiga } from './lojaLiga';
import { NOME_LIGA, type TipoLiga } from '../../../shared/liga';
import { hpMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { ITENS } from '../../../shared/itens';
import { api, ErroApi } from '../conta';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from '../estado';
import { pokemonPorId } from '../dados';
import { aoAvisoDoServidor } from '../online';
import { confirmar } from './confirmar';
import { el, spritePokemon } from './dom';
import { bannerEvento, classeTematica } from './temaEvento';
import { abrirJanela } from './janela';
import { valorEmMoeda } from './moeda';

interface EstadoLiga {
  liga: TipoLiga; nome: string; pronta: boolean; etapas: string[]; etapa: number; estado: 'jogando' | 'perdeu' | 'venceu' | null;
  premio: { silver: number; nomeMoeda: string; quantidade: number; porVitoria: number; bonus: number };
  /** desafio em andamento: o time travado (HP/PP de agora), se está numa batalha e quando a próxima começa sozinha */
  time: PokemonIndividual[] | null; lutando: boolean; proximaEm: number | null;
}
interface Dados { ligas: EstadoLiga[]; viraEm: number; agora: number; tempoTurno: number }

const quando = (ms: number) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit' });
const relogio = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let aberta: { redesenhar: () => void; recarregar: () => void } | null = null;

export function abrirLiga(save: Save): void {
  if (aberta) return aberta.recarregar();
  let dados: Dados | null = null;
  let diferenca = 0;
  let aviso = '';
  const carregar = () => api<Dados>('GET', '/liga')
    .then((r) => ((dados = r), (diferenca = r.agora - Date.now()), janela.redesenhar()))
    .catch((e) => ((aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'), janela.redesenhar()));

  async function batalhar(l: EstadoLiga): Promise<void> {
    if (l.estado === null && !(await confirmar(l.nome, `Começar a ${l.nome}? Seu time de agora (6 Pokémon) fica travado até o fim: ${l.etapas.length} batalhas seguidas, sem curar (só remédios entre uma e outra), ${dados!.tempoTurno / 1000} s por turno. Depois de cada vitória a próxima começa sozinha. Se sair do jogo, a batalha continua e o tempo corre. Perdeu, só na semana que vem.`))) return;
    try {
      await salvarAgora();
      dados = await api<Dados>('POST', '/liga/entrar', { liga: l.liga });
      aviso = '';
      // a batalha abre sozinha (o servidor manda o começo dela)
      janela.fechar();
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
      void carregar();
    }
  }

  async function usarRemedio(l: EstadoLiga, posicao: number, item: string): Promise<void> {
    try {
      await salvarAgora();
      const r = await api<Dados & { save: Save; versao: number; mensagem: string }>('POST', '/liga/item', { liga: l.liga, posicao, item });
      adotarSaveDoServidor(r.save, r.versao);
      dados = r;
      aviso = r.mensagem;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    janela.redesenhar();
  }

  /** O time travado do desafio, com HP e um seletor de remédio para cada um. */
  function painelDoTime(l: EstadoLiga): HTMLElement {
    const atual = carregarSave();
    const remedios = Object.entries(atual?.itens ?? {}).filter(([id, q]) => q > 0 && ITENS[id]?.categoria === 'remedio');
    return el('div', { class: 'liga-time' }, ...(l.time ?? []).map((p, i) => {
      const max = hpMaximo(p);
      const escolha = el('select', { class: 'db-busca', 'aria-label': 'Remédio' },
        el('option', { value: '' }, 'Usar remédio…'),
        ...remedios.map(([id, q]) => el('option', { value: id }, `${ITENS[id].nome} (${q})`))) as HTMLSelectElement;
      escolha.addEventListener('change', () => escolha.value && void usarRemedio(l, i, escolha.value));
      return el('div', { class: `liga-membro ${p.hp <= 0 ? 'desmaiado' : ''}` },
        spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }),
        el('div', {},
          el('strong', {}, `${pokemonPorId(p.especieId).nome} Nv. ${p.nivel}`),
          el('span', { class: 'barra-exp liga-hp' }, el('span', { class: 'preenchido', style: { width: `${(Math.max(0, p.hp) / max) * 100}%` } })),
          el('small', { class: 'meta' }, p.hp <= 0 ? 'Desmaiado' : `${p.hp}/${max} HP${p.status ? ` · ${p.status.toUpperCase()}` : ''}`),
          l.lutando ? '' : escolha));
    }));
  }

  const cartao = (l: EstadoLiga) => {
    const agora = Date.now() + diferenca;
    const situacao = !l.pronta ? 'A staff ainda está preparando os times.'
      : l.estado === 'venceu' ? '🏆 Você venceu esta semana!'
      : l.estado === 'perdeu' ? 'Derrotado nesta semana. Volte na semana que vem.'
      : l.estado === 'jogando' && l.lutando ? `Batalha em andamento: ${l.etapas[l.etapa]}.`
      : l.estado === 'jogando' ? `Próxima: ${l.etapas[l.etapa]}. Começa sozinha em ${relogio((l.proximaEm ?? agora) - agora)}.`
      : 'Uma tentativa por semana, com o time de 6 travado do começo ao fim.';
    const tema = l.liga === 'normal' ? 'liga' : 'nightmare';
    const moedaDaLiga = l.liga === 'normal' ? 'leagueCoins' : 'leagueCoinsNightmare';
    const selo = !l.pronta ? { texto: 'Em preparação', estado: 'fechado' as const }
      : l.estado === 'venceu' ? { texto: '🏆 Vencida', estado: 'ativo' as const }
      : l.estado === 'perdeu' ? { texto: 'Semana que vem', estado: 'fechado' as const }
      : l.estado === 'jogando' ? { texto: `Etapa ${l.etapa + 1}/${l.etapas.length}`, estado: 'ativo' as const }
      : { texto: 'Aberta', estado: 'espera' as const };
    return el('section', { class: `liga-cartao liga-${l.liga} tema-${tema}` },
      bannerEvento(tema, { titulo: l.nome, selo }),
      el('ol', { class: 'liga-etapas-jogador' }, ...l.etapas.map((nome, i) =>
        el('li', { class: i < l.etapa || l.estado === 'venceu' ? 'vencida' : i === l.etapa && l.estado === 'jogando' ? 'atual' : '' }, nome))),
      el('p', { class: 'meta' }, 'Prêmio: ', valorEmMoeda(moedaDaLiga, l.premio.porVitoria), ' por vitória. Vencendo todos: + ', valorEmMoeda(moedaDaLiga, l.premio.bonus), ` (${l.premio.quantidade} no total) + `, valorEmMoeda('silver', l.premio.silver)),
      el('p', {}, situacao),
      l.estado === 'jogando' && l.time ? painelDoTime(l) : '',
      l.pronta && (l.estado === null || (l.estado === 'jogando' && !l.lutando))
        ? el('button', { class: 'botao', onclick: () => void batalhar(l) }, l.estado === null ? 'Começar' : 'Próxima batalha agora')
        : null);
  };

  const janela = abrirJanela('Liga Pokémon', () => {
    if (!dados) return el('p', { class: 'meta' }, aviso || 'Carregando…');
    const atual = carregarSave() ?? save;
    return el('div', { class: 'liga-janela' },
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      el('p', { class: 'meta' }, `O desafio é feito de uma vez: o time de 6 fica travado e não é curado (use remédios entre as batalhas). ${dados.tempoTurno / 1000} s por turno. A semana vira ${quando(dados.viraEm)}.`),
      el('div', { class: 'liga-lojas' },
        el('span', { class: 'meta liga-saldos' }, 'Suas moedas: ', valorEmMoeda('leagueCoins', atual.leagueCoins ?? 0), ' ', valorEmMoeda('leagueCoinsNightmare', atual.leagueCoinsNightmare ?? 0)),
        el('button', { class: 'botao secundario', onclick: () => abrirLojaDaLiga('liga') }, '🛒 Loja da Liga'),
        el('button', { class: 'botao secundario', onclick: () => abrirLojaDaLiga('nightmare') }, '🛒 Loja Nightmare')),
      el('div', { class: 'liga-cartoes' }, ...dados.ligas.map(cartao)));
  }, { classe: `janela-liga ${classeTematica('liga')}`, aoFechar: () => (parar(), clearInterval(tique), (aberta = null)) });
  // o servidor avisa quando o desafio muda (fim de batalha, item usado); a contagem anda a cada segundo
  const parar = aoAvisoDoServidor((msg) => msg.t === 'liga' && void carregar());
  const tique = setInterval(() => dados?.ligas.some((l) => l.estado === 'jogando' && !l.lutando) && janela.redesenhar(), 1000);
  aberta = { redesenhar: () => janela.redesenhar(), recarregar: () => void carregar() };
  void carregar();
}

let ligado = false;
/** Fim de uma batalha da Liga em qualquer tela: reabre a janela da Liga (próxima batalha, remédios). Uma vez, no main. */
export function vigiarLiga(): void {
  if (ligado) return;
  ligado = true;
  aoAvisoDoServidor((msg) => {
    if (msg.t !== 'liga') return;
    const abrir = () => (document.querySelector('.batalha-fundo') ? setTimeout(abrir, 1000) : abrirLiga(carregarSave()!));
    if (carregarSave()) setTimeout(abrir, 500);
  });
}
