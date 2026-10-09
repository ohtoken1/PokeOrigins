// Mundo compartilhado: todos os jogadores no mesmo mapa (cidade ou bioma de uma região) se veem andando.
// Tempo real por WebSocket (/ws). Cada mapa é uma SALA ("cidade", "kanto:grama"…); o servidor só repassa
// posição e visual para quem está na mesma sala. Mapas exclusivos (instâncias) no futuro = salas com outro nome.
import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import * as banco from './banco.ts';
import { contaDoToken } from './contas.ts';

const SALA_VALIDA = /^[a-z0-9:_-]{1,40}$/;
const COORD_MAX = 1000;
/** Mensagens por segundo que um jogador pode mandar (andar rápido manda ~7). */
const LIMITE_POR_SEGUNDO = 30;
const VISUAL_MAX = 2000;

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
}

const salas = new Map<string, Set<Conexao>>();
const porConta = new Map<number, Conexao>();

/** O jogador está com o jogo aberto agora? (perfil mostra "Online agora") */
export const estaOnline = (contaId: number) => porConta.has(contaId);

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

function lerVisual(v: unknown): Visual {
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
    return void enviar(c, { t: 'ok', id: conta.id });
  }
  if (++c.mensagens > LIMITE_POR_SEGUNDO) return;

  if (msg.t === 'sala') {
    const sala = typeof msg.sala === 'string' && SALA_VALIDA.test(msg.sala) ? msg.sala : null;
    const x = coord(msg.x);
    const y = coord(msg.y);
    if (!sala || x === null || y === null) return;
    sairDaSala(c);
    Object.assign(c, { sala, x, y, dir: direcao(msg.dir), visual: lerVisual(msg.visual), nome: nomeDe(c.conta) });
    const lista = salas.get(sala) ?? new Set<Conexao>();
    salas.set(sala, lista);
    // quem chega recebe quem já está; quem já está fica sabendo de quem chegou
    enviar(c, { t: 'jogadores', sala, lista: [...lista].map(publico) });
    lista.add(c);
    paraSala(sala, { t: 'entrou', jogador: publico(c) }, c);
  } else if (msg.t === 'sair') {
    sairDaSala(c);
  } else if (msg.t === 'pos' && c.sala) {
    const x = coord(msg.x);
    const y = coord(msg.y);
    if (x === null || y === null) return;
    Object.assign(c, { x, y, dir: direcao(msg.dir) });
    paraSala(c.sala, { t: 'moveu', id: c.conta.id, x, y, dir: c.dir }, c);
  } else if (msg.t === 'visual' && c.sala) {
    c.visual = lerVisual(msg.visual);
    paraSala(c.sala, { t: 'visual', id: c.conta.id, visual: c.visual }, c);
  }
}

export function ligarMundo(servidor: Server): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  servidor.on('upgrade', (req: IncomingMessage, socket, cabeca) => {
    if (new URL(req.url ?? '/', 'http://x').pathname !== '/ws') return void socket.destroy();
    wss.handleUpgrade(req, socket, cabeca, (ws) => wss.emit('connection', ws, req));
  });
  wss.on('connection', (ws: WebSocket) => {
    const c: Conexao = { ws, conta: null, nome: '', sala: null, x: 0, y: 0, dir: 2, visual: { aparencia: null, seguidor: null }, mensagens: 0, vivo: true };
    // sem se identificar em 10 s: fecha
    const prazo = setTimeout(() => !c.conta && ws.close(4001, 'Sem sessão'), 10_000);
    ws.on('message', (dados) => receber(c, String(dados)));
    ws.on('pong', () => (c.vivo = true));
    ws.on('close', () => {
      clearTimeout(prazo);
      sairDaSala(c);
      if (c.conta && porConta.get(c.conta.id) === c) porConta.delete(c.conta.id);
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
