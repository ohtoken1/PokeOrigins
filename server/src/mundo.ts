// Mundo compartilhado: todos os jogadores no mesmo mapa (cidade ou bioma de uma região) se veem andando.
// Tempo real por WebSocket (/ws). Cada mapa é uma SALA ("cidade", "kanto:grama"…); o servidor só repassa
// posição e visual para quem está na mesma sala. Mapas exclusivos (instâncias) no futuro = salas com outro nome.
import { AVISO_MAX } from '../../shared/anuncios.ts';
import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import * as banco from './banco.ts';
import { contaDoToken } from './contas.ts';
import { temSkin, type ComSkins } from '../../shared/skins.ts';

const SALA_VALIDA = /^[a-z0-9:_-]{1,40}$/;
const COORD_MAX = 1000;
/** Mensagens por segundo que um jogador pode mandar (andar rápido manda ~7). */
const LIMITE_POR_SEGUNDO = 30;
const VISUAL_MAX = 2000;
/** Chat: tamanho da mensagem, anti-spam (no máximo 3 a cada 5 s) e quantas ficam guardadas para quem chega. */
const CHAT_MAX = 200;
const CHAT_RAJADA = 3;
const CHAT_JANELA_MS = 5000;
const HISTORICO_GLOBAL = 50;
const HISTORICO_LOCAL = 30;

/** 0 cima, 1 esquerda, 2 baixo, 3 direita (mesmas linhas da folha do personagem LPC). */
type Direcao = 0 | 1 | 2 | 3;
interface Visual {
  aparencia: Record<string, string | boolean> | null;
  seguidor: { especie: number; shiny: boolean } | null;
}
interface Conexao {
  ws: WebSocket;
  conta: banco.Conta | null;
  nome: string;
  sala: string | null;
  x: number;
  y: number;
  dir: Direcao;
  visual: Visual;
  mensagens: number;
  vivo: boolean;
  /** horários das últimas mensagens de chat (anti-spam) */
  chats: number[];
}
type Canal = 'local' | 'global' | 'cla';
interface MensagemChat {
  t: 'chat';
  canal: Canal;
  id: number;
  usuario: string;
  nome: string;
  texto: string;
  em: number;
}
const historicoGlobal: MensagemChat[] = [];
const historicoLocal = new Map<string, MensagemChat[]>();
const historicoCla = new Map<number, MensagemChat[]>();
const guardar = (lista: MensagemChat[], m: MensagemChat, max: number) => {
  lista.push(m);
  if (lista.length > max) lista.splice(0, lista.length - max);
};

const salas = new Map<string, Set<Conexao>>();
const porConta = new Map<number, Conexao>();

/** O jogador está com o jogo aberto agora? (perfil mostra "Online agora") */
export const estaOnline = (contaId: number) => porConta.has(contaId);
/** Manda uma mensagem para o jogo de uma conta, se estiver aberto (pedido de amizade, mensagem privada…). */
export function avisar(contaId: number, msg: unknown): void {
  const c = porConta.get(contaId);
  if (c) enviar(c, msg);
}
/** Manda uma mensagem para todos que estão com o jogo aberto (anúncio novo no mural…). */
export function avisarTodos(msg: unknown): void {
  const texto = JSON.stringify(msg);
  for (const c of porConta.values()) if (c.ws.readyState === WebSocket.OPEN) c.ws.send(texto);
}
// ---- letreiro: avisos que passam na barrinha embaixo do cabeçalho de todos (capturas raras, prêmios raros de
// ticket, avisos da staff e banimentos) ----
// A captura ainda é calculada no navegador, então quem avisa é o jogo de quem capturou; o servidor só confere o
// formato, segura a pressa (um aviso a cada 2 s por conta) e repassa. Muda quando as batalhas forem no servidor.
const LETREIRO_GUARDADOS = 12;
const LETREIRO_INTERVALO_MS = 2000;
const CATEGORIAS_RARAS = ['lendario', 'mitico', 'ultra', 'inicial'];
export type AvisoLetreiro =
  | { id: number; quando: number; tipo: 'captura'; jogador: string; especieId: number; shiny: boolean; categoria: string | null }
  | { id: number; quando: number; tipo: 'premio'; jogador: string; raridade: string; ticket: string }
  | { id: number; quando: number; tipo: 'staff'; texto: string }
  | { id: number; quando: number; tipo: 'banido'; jogador: string };
const letreiro: AvisoLetreiro[] = [];
const ultimoAvisoDeCaptura = new Map<number, number>();
let proximoAviso = 1;

function porNoLetreiro(aviso: AvisoLetreiro): void {
  letreiro.push(aviso);
  if (letreiro.length > LETREIRO_GUARDADOS) letreiro.shift();
  avisarTodos({ t: 'letreiro', aviso });
}
/** Aviso de banimento para todos (para o sistema de banir, quando existir). */
export const avisarBanimento = (jogador: string) => porNoLetreiro({ id: proximoAviso++, quando: Date.now(), tipo: 'banido', jogador });

/** Aviso escrito pela staff (Administração → Anúncios → Publicar aviso). Devolve o texto que foi para a barra. */
export function avisarDaStaff(bruto: unknown): string {
  const texto = typeof bruto === 'string' ? bruto.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, AVISO_MAX) : '';
  if (texto) porNoLetreiro({ id: proximoAviso++, quando: Date.now(), tipo: 'staff', texto });
  return texto;
}

/** Um aviso a cada 2 s por conta (captura ou prêmio). */
function semPressa(contaId: number): boolean {
  const agora = Date.now();
  if (agora - (ultimoAvisoDeCaptura.get(contaId) ?? 0) < LETREIRO_INTERVALO_MS) return false;
  ultimoAvisoDeCaptura.set(contaId, agora);
  return true;
}

/** Prêmio lendário ou mítico tirado num ticket (o sorteio ainda é do navegador, como a captura). */
function avisarPremio(c: Conexao, msg: Record<string, unknown>): void {
  if (!c.conta || (msg.raridade !== 'lendario' && msg.raridade !== 'mitico')) return;
  const ticket = typeof msg.ticket === 'string' ? msg.ticket.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  if (!ticket || !semPressa(c.conta.id)) return;
  porNoLetreiro({ id: proximoAviso++, quando: Date.now(), tipo: 'premio', jogador: c.nome, raridade: msg.raridade, ticket });
}

function avisarCaptura(c: Conexao, msg: Record<string, unknown>): void {
  if (!c.conta) return;
  const especieId = msg.especieId;
  const categoria = typeof msg.categoria === 'string' && CATEGORIAS_RARAS.includes(msg.categoria) ? msg.categoria : null;
  const shiny = msg.shiny === true;
  if (typeof especieId !== 'number' || !Number.isSafeInteger(especieId) || especieId < 1 || especieId > 99999) return;
  if (!shiny && !categoria) return;
  if (!semPressa(c.conta.id)) return;
  porNoLetreiro({ id: proximoAviso++, quando: Date.now(), tipo: 'captura', jogador: c.nome, especieId, shiny, categoria });
}

/** Texto de chat limpo: sem caracteres de controle e espaços repetidos, no tamanho máximo. */
export const limparTexto = (bruto: unknown) => (typeof bruto === 'string' ? bruto.replace(/\p{Cc}|\p{Cf}/gu, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX) : '');
/** Manda o histórico do chat do clã da conta (vazio se saiu do clã): ao conectar e ao entrar/sair de um clã. */
export function mandarHistoricoDoCla(contaId: number): void {
  const cla = banco.claDaConta(contaId);
  avisar(contaId, { t: 'chat-historico', canal: 'cla', lista: cla ? (historicoCla.get(cla.id) ?? []) : [] });
}
/** O clã acabou: o histórico do chat dele não precisa mais ficar na memória. */
export const esquecerChatDoCla = (claId: number) => void historicoCla.delete(claId);
const ouvintesPresenca = new Set<(contaId: number) => void>();
/** Chamado quando uma conta entra ou sai do jogo (os amigos atualizam o "online"). */
export const aoMudarPresenca = (f: (contaId: number) => void) => void ouvintesPresenca.add(f);
const presencaMudou = (contaId: number) => ouvintesPresenca.forEach((f) => f(contaId));

const enviar = (c: Conexao, msg: unknown) => c.ws.readyState === WebSocket.OPEN && c.ws.send(JSON.stringify(msg));
const publico = (c: Conexao) => ({ id: c.conta!.id, usuario: c.conta!.usuario, nome: c.nome, x: c.x, y: c.y, dir: c.dir, visual: c.visual });
function paraSala(sala: string, msg: unknown, menos?: Conexao): void {
  const texto = JSON.stringify(msg);
  for (const c of salas.get(sala) ?? []) if (c !== menos && c.ws.readyState === WebSocket.OPEN) c.ws.send(texto);
}

function sairDaSala(c: Conexao): void {
  if (!c.sala) return;
  const sala = salas.get(c.sala);
  sala?.delete(c);
  if (sala && !sala.size) salas.delete(c.sala);
  paraSala(c.sala, { t: 'saiu', id: c.conta!.id });
  c.sala = null;
}

/** Nome de treinador vem do save guardado (o jogo não escolhe o próprio nome aqui). */
function nomeDe(conta: banco.Conta): string {
  try {
    const nome = (JSON.parse(banco.lerSave(conta.id)?.dados ?? '{}') as { aparencia?: { nome?: string } }).aparencia?.nome;
    return typeof nome === 'string' && nome.trim() ? nome.slice(0, 16) : conta.usuario;
  } catch {
    return conta.usuario;
  }
}

/** Skin que a conta veste, pelo save guardado: só vale a escolhida em `skinVisual` e só se o item ainda está na bolsa. */
function skinDe(conta: banco.Conta): string | null {
  try {
    const save = JSON.parse(banco.lerSave(conta.id)?.dados ?? '{}') as Partial<ComSkins>;
    return save.itens && typeof save.itens === 'object' && temSkin(save as ComSkins, save.skinVisual) ? save.skinVisual : null;
  } catch {
    return null;
  }
}

/** O visual vem do jogo (aparência + seguidor), menos a skin: essa é sempre a do save guardado (ninguém mostra skin que não tem). */
function lerVisual(v: unknown, conta: banco.Conta): Visual {
  const visual = lerVisualDoJogo(v);
  const skin = skinDe(conta);
  if (visual.aparencia) delete visual.aparencia.skin;
  if (skin) visual.aparencia = { ...(visual.aparencia ?? {}), skin };
  return visual;
}

function lerVisualDoJogo(v: unknown): Visual {
  const vazio: Visual = { aparencia: null, seguidor: null };
  if (!v || typeof v !== 'object' || JSON.stringify(v).length > VISUAL_MAX) return vazio;
  const { aparencia, seguidor } = v as Record<string, unknown>;
  const ap: Record<string, string | boolean> = {};
  if (aparencia && typeof aparencia === 'object')
    for (const [k, x] of Object.entries(aparencia)) if (/^[a-zA-Z]{1,20}$/.test(k) && (typeof x === 'boolean' || (typeof x === 'string' && x.length <= 40))) ap[k] = x;
  const s = seguidor as { especie?: unknown; shiny?: unknown } | null;
  const seg = s && Number.isSafeInteger(s.especie) && (s.especie as number) > 0 && (s.especie as number) < 20000 ? { especie: s.especie as number, shiny: s.shiny === true } : null;
  return { aparencia: Object.keys(ap).length ? ap : null, seguidor: seg };
}

const coord = (v: unknown) => (Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) < COORD_MAX ? (v as number) : null);
const direcao = (v: unknown): Direcao => (v === 0 || v === 1 || v === 2 || v === 3 ? v : 2);

function receber(c: Conexao, texto: string): void {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(texto);
  } catch {
    return;
  }
  if (!c.conta) {
    // primeira mensagem: o token da sessão (não vai na URL para não aparecer em registros)
    if (msg.t !== 'entrar' || typeof msg.token !== 'string') return void c.ws.close(4001, 'Sem sessão');
    const conta = contaDoToken(msg.token);
    if (!conta) return void c.ws.close(4001, 'Sessão expirada');
    // uma conexão por conta: a mais nova fica (a outra aba é avisada e para de reconectar)
    const antiga = porConta.get(conta.id);
    if (antiga) {
      sairDaSala(antiga);
      antiga.ws.close(4000, 'Aberto em outra aba');
    }
    c.conta = conta;
    c.nome = nomeDe(conta);
    porConta.set(conta.id, c);
    if (!antiga) presencaMudou(conta.id);
    enviar(c, { t: 'ok', id: conta.id });
    enviar(c, { t: 'chat-historico', canal: 'global', lista: historicoGlobal });
    enviar(c, { t: 'letreiro-historico', lista: letreiro });
    return mandarHistoricoDoCla(conta.id);
  }
  if (++c.mensagens > LIMITE_POR_SEGUNDO) return;

  if (msg.t === 'sala') {
    const sala = typeof msg.sala === 'string' && SALA_VALIDA.test(msg.sala) ? msg.sala : null;
    const x = coord(msg.x);
    const y = coord(msg.y);
    if (!sala || x === null || y === null) return;
    sairDaSala(c);
    Object.assign(c, { sala, x, y, dir: direcao(msg.dir), visual: lerVisual(msg.visual, c.conta), nome: nomeDe(c.conta) });
    const lista = salas.get(sala) ?? new Set<Conexao>();
    salas.set(sala, lista);
    // quem chega recebe quem já está; quem já está fica sabendo de quem chegou
    enviar(c, { t: 'jogadores', sala, lista: [...lista].map(publico) });
    lista.add(c);
    paraSala(sala, { t: 'entrou', jogador: publico(c) }, c);
    enviar(c, { t: 'chat-historico', canal: 'local', lista: historicoLocal.get(sala) ?? [] });
  } else if (msg.t === 'sair') {
    sairDaSala(c);
  } else if (msg.t === 'pos' && c.sala) {
    const x = coord(msg.x);
    const y = coord(msg.y);
    if (x === null || y === null) return;
    Object.assign(c, { x, y, dir: direcao(msg.dir) });
    paraSala(c.sala, { t: 'moveu', id: c.conta.id, x, y, dir: c.dir }, c);
  } else if (msg.t === 'chat') {
    falar(c, msg.canal, msg.texto);
  } else if (msg.t === 'captura') {
    avisarCaptura(c, msg);
  } else if (msg.t === 'premio') {
    avisarPremio(c, msg);
  } else if (msg.t === 'visual' && c.sala) {
    c.visual = lerVisual(msg.visual, c.conta);
    paraSala(c.sala, { t: 'visual', id: c.conta.id, visual: c.visual }, c);
  }
}

/** Mensagem de chat: local (quem está no mesmo mapa), global (todos online) ou clã (quando existir). */
function falar(c: Conexao, canal: unknown, bruto: unknown): void {
  if (canal !== 'local' && canal !== 'global' && canal !== 'cla') return;
  const erro = (texto: string) => void enviar(c, { t: 'chat-erro', canal, texto });
  const texto = limparTexto(bruto);
  if (!texto) return;
  const cla = canal === 'cla' ? banco.claDaConta(c.conta!.id) : undefined;
  if (canal === 'cla' && !cla) return erro('Você ainda não está em uma guilda.');
  if (canal === 'local' && !c.sala) return erro('Entre num mapa para falar no chat local.');
  const agora = Date.now();
  c.chats = c.chats.filter((t) => agora - t < CHAT_JANELA_MS);
  if (c.chats.length >= CHAT_RAJADA) return erro('Calma! Espere um pouco para mandar outra mensagem.');
  c.chats.push(agora);
  const m: MensagemChat = { t: 'chat', canal, id: c.conta!.id, usuario: c.conta!.usuario, nome: c.nome, texto, em: agora };
  if (cla) {
    const lista = historicoCla.get(cla.id) ?? [];
    historicoCla.set(cla.id, lista);
    guardar(lista, m, HISTORICO_LOCAL);
    for (const membro of banco.membrosDoCla(cla.id)) avisar(membro.id, m);
  } else if (canal === 'global') {
    guardar(historicoGlobal, m, HISTORICO_GLOBAL);
    const json = JSON.stringify(m);
    for (const outra of porConta.values()) if (outra.ws.readyState === WebSocket.OPEN) outra.ws.send(json);
  } else {
    const lista = historicoLocal.get(c.sala!) ?? [];
    historicoLocal.set(c.sala!, lista);
    guardar(lista, m, HISTORICO_LOCAL);
    paraSala(c.sala!, m);
  }
}

export function ligarMundo(servidor: Server): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  servidor.on('upgrade', (req: IncomingMessage, socket, cabeca) => {
    if (new URL(req.url ?? '/', 'http://x').pathname !== '/ws') return void socket.destroy();
    wss.handleUpgrade(req, socket, cabeca, (ws) => wss.emit('connection', ws, req));
  });
  wss.on('connection', (ws: WebSocket) => {
    const c: Conexao = { ws, conta: null, nome: '', sala: null, x: 0, y: 0, dir: 2, visual: { aparencia: null, seguidor: null }, mensagens: 0, vivo: true, chats: [] };
    // sem se identificar em 10 s: fecha
    const prazo = setTimeout(() => !c.conta && ws.close(4001, 'Sem sessão'), 10_000);
    ws.on('message', (dados) => receber(c, String(dados)));
    ws.on('pong', () => (c.vivo = true));
    ws.on('close', () => {
      clearTimeout(prazo);
      sairDaSala(c);
      if (c.conta && porConta.get(c.conta.id) === c) {
        porConta.delete(c.conta.id);
        presencaMudou(c.conta.id);
      }
    });
    (ws as WebSocket & { conexao?: Conexao }).conexao = c;
  });
  // zera o limite de mensagens a cada segundo e derruba conexões mortas (sem pong) a cada 30 s
  setInterval(() => {
    for (const ws of wss.clients) {
      const c = (ws as WebSocket & { conexao?: Conexao }).conexao;
      if (c) c.mensagens = 0;
    }
  }, 1000).unref();
  setInterval(() => {
    for (const ws of wss.clients) {
      const c = (ws as WebSocket & { conexao?: Conexao }).conexao;
      if (!c) continue;
      if (!c.vivo) ws.terminate();
      else {
        c.vivo = false;
        ws.ping();
      }
    }
  }, 30_000).unref();
}
