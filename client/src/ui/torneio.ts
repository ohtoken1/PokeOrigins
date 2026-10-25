// Janela do Torneio (Arena → Torneio): próximo torneio, regras, inscrição (10k), inscritos e a chave do mata-mata.
// Tudo é decidido pelo servidor (server/src/torneio.ts); as partidas abrem sozinhas na hora (batalha PvP).
import { ENTRADA_TORNEIO, NOMES_RODADAS, roletaTorneio, textoDasRegras, type RegrasTorneio } from '../../../shared/torneioRegras';
import { problemasDoTime } from '../../../shared/torneioTime';
import { api, ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from '../estado';
import { aoAvisoDoServidor } from '../online';
import { confirmar } from './confirmar';
import { el } from './dom';
import { bannerEvento, classeTematica } from './temaEvento';
import { abrirJanela } from './janela';
import { girarRoleta } from './roleta';
import { valorEmMoeda } from './moeda';
import { avisar } from './avisos';
import { tutorialFez } from '../tutorialEventos';

interface PartidaFora { a: string | null; b: string | null; vencedor: string | null; wo: boolean }
interface EstadoTorneio {
  torneio: {
    tipo: 'aleatorio' | 'staff'; horario: number; fase: 'inscricao' | 'aguardando' | 'disputa' | 'fim' | 'cancelado';
    fechaEm: number; comecaEm: number | null; regras: RegrasTorneio; inscritos: string[]; inscrito: boolean;
    rodada: number; rodadaComecaEm: number | null; chave: PartidaFora[][]; podio: string[] | null;
  } | null;
  proximo: { horario: number; tipo: 'aleatorio' | 'staff' };
  vagas: number;
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const minutos = (ms: number) => Math.max(0, Math.ceil((ms - Date.now()) / 60_000));

export function abrirTorneio(): void {
  tutorialFez('torneio');
  let dados: EstadoTorneio | null = null;
  let aviso = '';
  const carregar = () => api<EstadoTorneio>('GET', '/torneio').then((r) => ((dados = r), janela.redesenhar())).catch(() => ((aviso = 'Sem conexão com o servidor.'), janela.redesenhar()));

  async function mudar(caminho: string, pergunta: string): Promise<void> {
    if (!(await confirmar('Torneio', pergunta))) return;
    try {
      await salvarAgora();
      const r = await api<EstadoTorneio & { save: Save; versao: number }>('POST', caminho);
      adotarSaveDoServidor(r.save, r.versao);
      dados = r;
      aviso = '';
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    janela.redesenhar();
  }

  const partida = (p: PartidaFora) =>
    el('div', { class: 'torneio-partida' },
      ...[p.a, p.b].map((n) => el('span', { class: p.vencedor && p.vencedor === n ? 'ganhou' : p.vencedor ? 'perdeu' : '' }, n ?? '—')),
      p.wo ? el('small', { class: 'meta' }, 'W.O.') : '');

  const janela = abrirJanela('Torneio', () => {
    if (!dados) return el('p', { class: 'meta' }, aviso || 'Carregando…');
    const t = dados.torneio;
    const ativo = t && t.fase !== 'fim' && t.fase !== 'cancelado';
    const save = carregarSave();
    const problemas = ativo && save ? problemasDoTime(save.time, t.regras, (p) => pokemonPorId(p.especieId).nome) : [];
    const situacao = !ativo
      ? `Próximo torneio: ${hora(dados.proximo.horario)} (${dados.proximo.tipo === 'staff' ? 'regras da staff' : 'regras sorteadas'}). A inscrição abre 10 minutos antes.`
      : t.fase === 'inscricao' ? `Inscrições abertas: ${t.inscritos.length}/${dados.vagas}. Fecham em ${minutos(t.fechaEm)} min.`
      : t.fase === 'aguardando' ? `Inscrições fechadas. A disputa começa em ${minutos(t.comecaEm ?? 0)} min.`
      : t.rodadaComecaEm ? `Próxima rodada (${NOMES_RODADAS[t.rodada]}) em ${minutos(t.rodadaComecaEm)} min.`
      : `Em disputa: ${NOMES_RODADAS[t.rodada]}.`;
    return el('div', { class: 'torneio-janela' },
      bannerEvento('torneio', {
        subtitulo: situacao,
        selo: !ativo ? { texto: `Próximo às ${hora(dados.proximo.horario)}`, estado: 'espera' } : t.fase === 'inscricao' ? { texto: 'Inscrições abertas', estado: 'ativo' } : { texto: '● AO VIVO', estado: 'ativo' },
      }),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      t && !ativo && t.podio ? el('p', { class: 'meta' }, `Último torneio: 🥇 ${t.podio[0]} · 🥈 ${t.podio[1]} · 🥉 ${t.podio[2]}`) : '',
      ativo ? el('ul', { class: 'torneio-regras' }, ...textoDasRegras(t.regras).map((r) => el('li', {}, r))) : '',
      el('div', { class: 'torneio-premios' },
        el('p', {}, el('strong', {}, 'Entrada: '), valorEmMoeda('silver', ENTRADA_TORNEIO)),
        el('p', {}, el('strong', {}, 'Prêmios:')),
        el('ul', {},
          el('li', {}, '🥇 1º lugar: 150.000 Poké Dólares + 15 Origin Coins + Roleta do Torneio'),
          el('li', {}, '🥈 2º lugar: 100.000 Poké Dólares + 10 Origin Coins'),
          el('li', {}, '🥉 3º lugar: 50.000 Poké Dólares'))),
      el('p', { class: 'meta' }, 'As partidas abrem sozinhas na hora: fique com o jogo aberto. Quem não estiver online (ou estiver com o time fora das regras) perde por W.O.'),
      ativo && t.fase === 'inscricao'
        ? t.inscrito
          ? el('button', { class: 'botao secundario', onclick: () => void mudar('/torneio/sair', 'Sair do torneio? A entrada é devolvida.') }, 'Sair do torneio')
          : el('button', { class: 'botao', disabled: problemas.length > 0, onclick: () => void mudar('/torneio/inscrever', 'Inscrever-se no torneio? A entrada é de 10.000 Poké Dólares.') }, 'Inscrever-se')
        : '',
      problemas.length && !t?.inscrito ? el('ul', { class: 'torneio-problemas' }, ...problemas.map((p) => el('li', {}, p))) : '',
      problemas.length && t?.inscrito ? el('p', { class: 'aviso-bolsa' }, `Atenção: seu time atual está fora das regras (${problemas.join(' ')}). Arrume antes da sua partida, senão perde por W.O.`) : '',
      // situação do time agora, sempre à vista enquanto houver torneio
      ativo && save ? el('p', { class: problemas.length ? 'torneio-time ruim' : 'torneio-time bom' }, problemas.length ? '❌ Seu time de agora está fora das regras deste torneio.' : '✅ Seu time de agora está dentro das regras deste torneio.') : '',
      ativo && t.inscritos.length ? el('details', {}, el('summary', {}, `Inscritos (${t.inscritos.length})`), el('p', { class: 'meta' }, t.inscritos.join(', '))) : '',
      t && t.chave.length ? el('div', { class: 'torneio-chave' }, ...t.chave.map((r, i) => el('section', {}, el('h4', {}, NOMES_RODADAS[i]), ...r.map(partida)))) : '');
  }, { classe: `janela-torneio ${classeTematica('torneio')}`, aoFechar: () => (parar(), clearInterval(relogio)) });
  const parar = aoAvisoDoServidor((msg) => msg.t === 'torneio' && void carregar());
  const relogio = setInterval(() => janela.redesenhar(), 20_000);
  void carregar();
}

let ligado = false;
/** Avisos do torneio em qualquer tela: W.O. e a roleta do campeão. */
export function vigiarTorneio(): void {
  if (ligado) return;
  ligado = true;
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'torneio-aviso') avisar(String(msg.texto), msg.erro ? 'erro' : 'info', 12_000);
    // o prêmio já foi sorteado e vai por entrega; a roleta só gira até ele (depois que a tela da final fecha)
    else if (msg.t === 'torneio-roleta') {
      const girar = () => (document.querySelector('.batalha-fundo') ? setTimeout(girar, 1000) : void girarRoleta('🏆 Roleta do Torneio', roletaTorneio(), Number(msg.fatia)));
      girar();
    }
  });
}
