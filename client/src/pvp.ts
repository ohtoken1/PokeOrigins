// PvP no navegador: desafiar outro jogador (menu do jogador no mapa), receber o desafio (cartão no canto) e abrir
// a tela de batalha quando o servidor começa a partida. Toda a batalha é calculada no servidor (server/src/pvp.ts).
import { abrirBatalha } from './batalha/telaBatalha';
import { BatalhaRemota, type TurnoPvp } from './batalha/remota';
import { biomaPorId } from '../../shared/biomas';
import { curar, hpMaximo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { api, ErroApi } from './conta';
import { carregarSave, salvarAgora } from './estado';
import { pausarMapaAtual } from './jogo/jogoUnico';
import { aoAvisoDoServidor } from './online';
import { el } from './ui/dom';

const batalhas = new Map<number, BatalhaRemota>();

/** Desafia um jogador online (ele recebe o convite e tem 1 minuto para aceitar). */
export async function desafiarParaDuelo(usuario: string): Promise<void> {
  // o servidor monta o time pelo save guardado: manda o de agora antes
  await salvarAgora();
  await api('POST', '/pvp/desafiar', { usuario });
}

export function avisoCurto(texto: string): void {
  const aviso = el('div', { class: 'aviso-pvp', role: 'status' }, texto);
  document.body.append(aviso);
  setTimeout(() => aviso.remove(), 5000);
}

function mostrarConvite(nome: string, usuario: string, ate: number): void {
  document.querySelector('.aviso-pvp-convite')?.remove();
  const tempo = el('small', {});
  const responder = async (aceitar: boolean) => {
    clearInterval(relogio);
    cartao.remove();
    try {
      if (aceitar) await salvarAgora();
      await api('POST', '/pvp/responder', { usuario, aceitar });
    } catch (e) {
      avisoCurto(e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');
    }
  };
  const cartao = el('div', { class: 'aviso-pvp aviso-pvp-convite', role: 'alertdialog' },
    el('strong', {}, `⚔️ ${nome} desafiou você para um duelo!`),
    el('span', {}, 'Os dois lutam com o time de agora, curado. Nada muda no seu save.'),
    tempo,
    el('div', { class: 'aviso-pvp-botoes' },
      el('button', { class: 'botao', onclick: () => void responder(true) }, 'Aceitar'),
      el('button', { class: 'botao secundario', onclick: () => void responder(false) }, 'Recusar')));
  const tique = () => {
    const s = Math.ceil((ate - Date.now()) / 1000);
    if (s <= 0) {
      clearInterval(relogio);
      cartao.remove();
    }
    tempo.textContent = `Expira em ${s} s`;
  };
  const relogio = setInterval(tique, 500);
  tique();
  document.body.append(cartao);
}

function comecar(msg: TurnoPvp & { tipo?: string; titulo?: string; adversario: { nome: string; time: PokemonIndividual[] }; meuTime?: PokemonIndividual[] }): void {
  const save = carregarSave();
  if (!save || batalhas.has(msg.id)) return;
  const remota = new BatalhaRemota(msg.id, msg);
  batalhas.set(msg.id, remota);
  // cópia curada do time (o servidor também cura): nada da batalha volta para o save
  // (o time que o servidor usou, na mesma ordem: o save pode ter mudado depois que a batalha começou)
  const time = structuredClone(msg.meuTime ?? save.time.filter((p) => !p.ovo));
  // Liga: o time do desafio entra como está (o servidor não cura); no PvP, todos curados
  if (msg.tipo !== 'liga') time.forEach((p) => curar(p));
  const equipe = msg.adversario.time;
  // o servidor não manda o HP do outro (só em porcentagem, nos eventos): a barra começa cheia
  equipe.forEach((p) => (p.hp = hpMaximo(p)));
  pausarMapaAtual(true);
  abrirBatalha({
    save: { ...save, time }, bioma: biomaPorId('caverna'), selvagem: equipe[0], pvp: remota,
    treinador: { nome: msg.adversario.nome, titulo: msg.titulo ?? 'Duelo', equipe, recompensa: 0, mensagemInicio: `${msg.titulo ?? 'Duelo'} contra ${msg.adversario.nome}!` },
    aoTerminar: () => {
      batalhas.delete(msg.id);
      pausarMapaAtual(false);
    },
  });
}

/** Recarregou a página no meio de uma batalha: o servidor manda tudo o que já aconteceu e a tela volta ao turno. */
async function retomar(): Promise<void> {
  try {
    const r = await api<{ batalha: (TurnoPvp & { adversario: { nome: string; time: PokemonIndividual[] } }) | null }>('GET', '/pvp/atual');
    if (r.batalha) comecar(r.batalha);
  } catch {
    // sem conexão: o servidor encerra pelo tempo, como antes
  }
}

let ligado = false;
export function vigiarPvp(): void {
  if (ligado) return;
  ligado = true;
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'pvp-convite') mostrarConvite(String(msg.nome), String(msg.usuario), Number(msg.ate));
    else if (msg.t === 'pvp-recusado') avisoCurto(`${String(msg.nome)} recusou o duelo.`);
    else if (msg.t === 'pvp-inicio') comecar(msg as never);
    else if (msg.t === 'pvp-aviso') avisoCurto(String(msg.texto));
    else if (msg.t === 'pvp-turno') batalhas.get(Number(msg.id))?.receber(msg as never);
  });
  void retomar();
}
