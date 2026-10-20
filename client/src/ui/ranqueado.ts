// PvP ranqueado no navegador: janela (Arena → PvP Ranqueado), selo da fila no canto, elo no perfil e no Ranking.
// Tudo é decidido pelo servidor (server/src/ranqueado.ts): fila, pareamento, batalha e pontos.
import {
  ABRIR_BUSCA_MS, DIVISOES, DURACAO_JANELA_MS, ELOS, FORMATOS_RANQUEADO, JANELAS_RANQUEADO, MECANICAS_RANQUEADO, NOME_FORMATO, PONTOS_BEAST,
  PONTOS_DERROTA, PONTOS_POR_DISTANCIA, PONTOS_POR_DIVISAO, PONTOS_VITORIA, VAGAS_MASTER, alcanceDaBusca, melhorElo, nomeDoDegrau, nomeDoElo, regrasDoFormato,
  type EloCalculado, type FormatoRanqueado, type IdElo,
} from '../../../shared/ranqueado';
import { NOME_MECANICA } from '../../../shared/torneioRegras';
import { problemasDoTime } from '../../../shared/torneioTime';
import { api, ErroApi } from '../conta';
import { ehAdministrador } from '../bonificacao';
import { pokemonPorId } from '../dados';
import { carregarSave, salvarAgora } from '../estado';
import { aoAvisoDoServidor } from '../online';
import { caixaDeAvisos } from '../outbreak';
import { avisar } from './avisos';
import { el } from './dom';
import { abrirJanela } from './janela';
import { bannerEvento, classeTematica } from './temaEvento';
import { urlDoElo } from './simboloElo';
import { definirMeuElo } from '../eloMapa';

export type EloComPlacar = EloCalculado & { vitorias: number; derrotas: number };
export type ElosDoJogador = Record<FormatoRanqueado, EloComPlacar>;
interface EstadoRanqueado {
  agora: number;
  aberta: boolean;
  fimEm: number | null;
  proximaEm: number;
  fila: { formato: FormatoRanqueado; desde: number } | null;
  naFila: Record<FormatoRanqueado, number>;
  elos: ElosDoJogador;
}
export interface LinhaRankingRanqueado extends EloCalculado { usuario: string; nome: string; vitorias: number; derrotas: number }

const CHAVE_FORMATO = 'jogo-claude:formato-ranqueado';
const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const relogio = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function formatoGuardado(): FormatoRanqueado {
  try {
    const f = localStorage.getItem(CHAVE_FORMATO) as FormatoRanqueado;
    if (FORMATOS_RANQUEADO.includes(f)) return f;
  } catch {
    // sem armazenamento: fica o OU
  }
  return 'OU';
}
export function guardarFormato(f: FormatoRanqueado): void {
  try {
    localStorage.setItem(CHAVE_FORMATO, f);
  } catch {
    // tudo bem
  }
}

/** Símbolo do elo (ui/simboloElo.ts): com a divisão na fita e a tier no selo, quando dados. */
export function iconeElo(elo: IdElo, tamanho = 32, opcoes: { divisao?: number | null; tier?: FormatoRanqueado | null } = {}): HTMLElement {
  return el('img', { class: `icone-elo elo-${elo}`, alt: ELOS.find((e) => e.id === elo)!.nome, width: String(tamanho), height: String(tamanho), src: urlDoElo(elo, opcoes) });
}

/** Linha de texto dos pontos: "45/100 pontos" nas divisões, "1.620 pontos" na Beast/Master. */
export const textoPontos = (e: EloCalculado) => (e.divisao ? `${e.naDivisao}/${PONTOS_POR_DIVISAO} pontos` : `${e.pontos.toLocaleString('pt-BR')} pontos`);

/** Cartão do elo (janela e perfil): imagem, nome, pontos, barra até a próxima divisão e placar. */
export function cartaoElo(e: EloComPlacar, tier: FormatoRanqueado, compacto = false): HTMLElement {
  const jogou = e.vitorias + e.derrotas > 0;
  return el('div', { class: `cartao-elo elo-${e.elo} ${compacto ? 'compacto' : ''}` },
    iconeElo(e.elo, compacto ? 56 : 88, { divisao: e.divisao, tier }),
    el('div', { class: 'cartao-elo-texto' },
      el('strong', {}, nomeDoElo(e)),
      el('small', {}, textoPontos(e)),
      e.divisao ? el('span', { class: 'barra-exp elo-barra' }, el('span', { class: 'preenchido', style: { width: `${(e.naDivisao / PONTOS_POR_DIVISAO) * 100}%` } })) : '',
      el('small', { class: 'meta' }, jogou ? `${e.vitorias} vitórias · ${e.derrotas} derrotas` : 'Nenhuma partida ainda')));
}

/** Escolha do formato (abas Ubers / OU / UU / RU). */
export function abasFormato(atual: FormatoRanqueado, aoEscolher: (f: FormatoRanqueado) => void): HTMLElement {
  return el('div', { class: 'ranqueado-abas', role: 'tablist' },
    ...FORMATOS_RANQUEADO.map((f) => el('button', { class: `aba ${f === atual ? 'ativa' : ''}`, type: 'button', onclick: () => aoEscolher(f) }, NOME_FORMATO[f])));
}

/** Painel do perfil: elo do jogador no formato escolhido. 'meu' = busca os meus no servidor. */
export function painelEloDoPerfil(elos: ElosDoJogador | null | 'meu'): HTMLElement {
  const caixa = el('div', { class: 'perfil-pvp' });
  let formato = formatoGuardado();
  let dados: ElosDoJogador | null = elos === 'meu' ? null : elos;
  const desenhar = () => {
    const seletor = el('select', { class: 'perfil-pvp-formato', 'aria-label': 'Tier do PvP ranqueado', onchange: (ev: Event) => ((formato = (ev.target as HTMLSelectElement).value as FormatoRanqueado), desenhar()) },
      ...FORMATOS_RANQUEADO.map((f) => el('option', { value: f, selected: f === formato }, NOME_FORMATO[f])));
    caixa.replaceChildren(
      el('div', { class: 'perfil-pvp-topo' }, el('small', {}, 'PvP ranqueado'), seletor),
      dados ? cartaoElo(dados[formato], formato, true) : el('small', { class: 'meta' }, elos === 'meu' ? 'Carregando…' : 'Sem classificação'));
  };
  desenhar();
  if (elos === 'meu')
    api<{ elos: ElosDoJogador }>('GET', '/ranqueado').then((r) => ((dados = r.elos), desenhar()), () => {
      caixa.replaceChildren(el('small', {}, 'PvP ranqueado'), el('small', { class: 'meta' }, 'Sem conexão com o servidor.'));
    });
  return caixa;
}

/** Ranking de um formato (Comunidade → Ranking → PvP Ranqueado). */
export function tabelaRanqueado(lista: LinhaRankingRanqueado[], meuUsuario: string): HTMLElement {
  if (!lista.length) return el('p', { class: 'meta' }, 'Ninguém jogou este formato ainda.');
  return el('table', { class: 'ranking-tabela ranking-ranqueado' },
    el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Treinador'), el('th', {}, 'Elo'), el('th', {}, 'Pontos'), el('th', {}, 'V / D'))),
    el('tbody', {}, ...lista.map((d, i) =>
      el('tr', { class: d.usuario === meuUsuario ? 'eu' : '' },
        el('td', { class: `posicao p${i + 1}` }, String(i + 1)),
        el('td', {}, d.nome),
        el('td', { class: 'ranking-elo' }, iconeElo(d.elo, 30), nomeDoElo(d)),
        el('td', { class: 'valor' }, d.pontos.toLocaleString('pt-BR')),
        el('td', { class: 'valor' }, `${d.vitorias} / ${d.derrotas}`)))));
}

export function abrirRanqueado(verRanking?: () => void): void {
  let dados: EstadoRanqueado | null = null;
  let formato = formatoGuardado();
  let aviso = '';
  let ocupado = false;
  const carregar = () => api<EstadoRanqueado>('GET', '/ranqueado').then((r) => ((dados = r), definirMeuElo(melhorElo(r.elos)), (aviso = ''), janela.redesenhar())).catch(() => ((aviso = 'Sem conexão com o servidor.'), janela.redesenhar()));

  async function mudar(caminho: string, corpo?: unknown): Promise<void> {
    if (ocupado) return;
    ocupado = true;
    try {
      // o servidor confere o time guardado: manda o de agora antes
      await salvarAgora();
      dados = await api<EstadoRanqueado>('POST', caminho, corpo);
      aviso = '';
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    ocupado = false;
    janela.redesenhar();
  }

  const janela = abrirJanela('PvP Ranqueado', () => {
    if (!dados) return el('p', { class: 'meta' }, aviso || 'Carregando…');
    const d = dados;
    const save = carregarSave();
    const admin = ehAdministrador();
    const problemas = save ? problemasDoTime(save.time, regrasDoFormato(formato), (p) => pokemonPorId(p.especieId).nome) : [];
    const minhaFila = d.fila;
    const aberta = d.aberta || admin;
    const ligadas = (Object.keys(MECANICAS_RANQUEADO) as (keyof typeof MECANICAS_RANQUEADO)[]).filter((m) => MECANICAS_RANQUEADO[m]).map((m) => NOME_MECANICA[m]);
    // até onde a busca já vai (abre uma divisão para cada lado a cada 30 s)
    const alcance = (() => {
      if (!minhaFila) return '';
      const degrau = d.elos[minhaFila.formato].degrau;
      const a = alcanceDaBusca(Date.now() - minhaFila.desde);
      const de = nomeDoDegrau(Math.max(0, degrau - a));
      const ate = nomeDoDegrau(Math.min(DIVISOES * 3 + 1, degrau + a));
      return de === ate ? `Buscando: só ${de}` : `Buscando: de ${de} até ${ate}`;
    })();
    const botao = minhaFila
      ? el('div', { class: 'ranqueado-procurando' },
          el('strong', {}, `🔎 Procurando partida no ${NOME_FORMATO[minhaFila.formato]}… ${relogio(Date.now() - minhaFila.desde)}`),
          el('small', {}, alcance),
          el('button', { class: 'botao secundario', disabled: ocupado, onclick: () => void mudar('/ranqueado/sair') }, 'Cancelar'))
      : el('button', { class: 'botao ranqueado-procurar', disabled: ocupado || !aberta || problemas.length > 0, onclick: () => void mudar('/ranqueado/fila', { formato }) },
          aberta ? `Procurar partida (${NOME_FORMATO[formato]})` : `Fila fechada · abre às ${hora(d.proximaEm)}`);
    return el('div', { class: 'ranqueado-janela' },
      bannerEvento('ranqueado', {
        subtitulo: d.aberta ? `Fila aberta até as ${hora(d.fimEm!)}.` : `Fila fechada. Próximo horário: ${hora(d.proximaEm)}.`,
        selo: d.aberta ? { texto: '● FILA ABERTA', estado: 'ativo' } : { texto: `Abre às ${hora(d.proximaEm)}`, estado: 'espera' },
      }),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      !d.aberta && admin ? el('p', { class: 'meta' }, 'Administrador: você pode entrar na fila fora do horário (para testar).') : '',
      abasFormato(formato, (f) => ((formato = f), guardarFormato(f), janela.redesenhar())),
      el('div', { class: 'ranqueado-meio' },
        cartaoElo(d.elos[formato], formato),
        el('div', { class: 'ranqueado-acao' },
          botao,
          el('small', { class: 'meta' }, `Na fila do ${NOME_FORMATO[formato]} agora: ${d.naFila[formato]}`))),
      save ? el('p', { class: problemas.length ? 'torneio-time ruim' : 'torneio-time bom' }, problemas.length ? `❌ Seu time de agora está fora das regras do ${NOME_FORMATO[formato]}.` : `✅ Seu time de agora está dentro das regras do ${NOME_FORMATO[formato]}.`) : '',
      problemas.length ? el('ul', { class: 'torneio-problemas' }, ...problemas.map((p) => el('li', {}, p))) : '',
      el('ul', { class: 'torneio-regras' },
        el('li', {}, `Horários da fila: ${JANELAS_RANQUEADO.map((j) => `${String(j.hora).padStart(2, '0')}h${String(j.minuto).padStart(2, '0')}`).join(' e ')}, ${DURACAO_JANELA_MS / 3_600_000} hora cada. Dá para jogar quantas partidas quiser no horário; a batalha que começou pode passar dele.`),
        el('li', {}, `Elos: Poké Ball, Great Ball e Ultra Ball (${DIVISOES} divisões cada, ${PONTOS_POR_DIVISAO} pontos por divisão), Beast Ball (a partir de ${PONTOS_BEAST.toLocaleString('pt-BR')} pontos, pontos corridos) e Master Ball (só os ${VAGAS_MASTER} com mais pontos da Beast Ball).`),
        el('li', {}, `A busca começa só na sua divisão e, a cada ${ABRIR_BUSCA_MS / 1000} s sem achar ninguém, abre mais uma divisão para cada lado.`),
        el('li', {}, `Mesma divisão: vitória +${PONTOS_VITORIA} pontos, derrota −${PONTOS_DERROTA}. Para cada divisão que o adversário está acima de você: +${PONTOS_POR_DISTANCIA} na vitória e −${PONTOS_POR_DISTANCIA} na derrota (abaixo de você, o contrário). Empate: nada muda.`),
        el('li', {}, `Cada tier tem o seu elo. Time de 6, sem espécie nem item repetido, Sleep Clause, 60 s por turno.`),
        el('li', {}, `Mecânicas: ${ligadas.join(', ') || 'nenhuma'}, mas só UMA por partida. Usar uma segunda diferente = derrota.`)),
      verRanking ? el('button', { class: 'botao secundario', onclick: () => (janela.fechar(), verRanking()) }, '🏆 Ver o ranking') : '');
  }, { classe: `janela-ranqueado ${classeTematica('ranqueado')}`, aoFechar: () => (parar(), clearInterval(tique)) });
  const parar = aoAvisoDoServidor((msg) => (msg.t === 'ranqueado-fila' || msg.t === 'ranqueado-resultado') && void carregar());
  // relógio da procura (e a janela de horário)
  const tique = setInterval(() => dados?.fila && janela.redesenhar(), 1000);
  void carregar();
}

let ligado = false;
/** Selo "Procurando partida" no canto (em qualquer tela) e os avisos de resultado. Uma vez, no main. */
export function vigiarRanqueado(): void {
  if (ligado) return;
  ligado = true;
  let fila: EstadoRanqueado['fila'] = null;
  const selo = el('div', { class: 'aviso-viagem aviso-ranqueado', role: 'status', hidden: true });
  caixaDeAvisos().append(selo);
  const desenhar = () => {
    selo.hidden = !fila;
    if (!fila) return;
    const f = fila;
    selo.replaceChildren(
      el('strong', {}, `🔎 Ranqueado ${NOME_FORMATO[f.formato]}: procurando partida…`),
      el('span', {}, relogio(Date.now() - f.desde), ' ',
        el('button', { class: 'botao secundario', type: 'button', onclick: () => void api('POST', '/ranqueado/sair').catch(() => undefined) }, 'Cancelar')));
  };
  setInterval(() => fila && desenhar(), 1000);
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'ranqueado-fila') {
      fila = (msg.fila as typeof fila) ?? null;
      desenhar();
      if (msg.texto) avisar(String(msg.texto), 'info', 10_000);
    } else if (msg.t === 'ranqueado-resultado') {
      // espera a tela da batalha fechar para mostrar o resultado
      atualizarMeuElo();
      const mostrar = () => (document.querySelector('.batalha-fundo') ? setTimeout(mostrar, 1000) : avisar(String(msg.texto), msg.venceu ? 'ok' : 'info', 10_000));
      mostrar();
    }
  });
  // recarregou a página com a procura em andamento: o servidor ainda guarda a fila (e o elo do nome no mapa)
  api<EstadoRanqueado>('GET', '/ranqueado').then((r) => ((fila = r.fila), definirMeuElo(melhorElo(r.elos)), desenhar()), () => undefined);
}

/** Busca de novo o meu melhor elo (depois de uma partida) para o símbolo ao lado do nome no mapa. */
function atualizarMeuElo(): void {
  api<EstadoRanqueado>('GET', '/ranqueado').then((r) => definirMeuElo(melhorElo(r.elos)), () => undefined);
}
