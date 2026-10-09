// Conexão em tempo real com o servidor (server/src/mundo.ts): entra na sala do mapa aberto, avisa cada passo e
// recebe os outros jogadores da mesma sala. Reconecta sozinha se cair (menos quando o jogo foi aberto em outra aba).
import { tokenAtual } from './conta';
import type { Aparencia } from './personagem/lpc';

/** 0 cima, 1 esquerda, 2 baixo, 3 direita (linhas da folha do personagem LPC). */
export type DirecaoOnline = 0 | 1 | 2 | 3;
export interface VisualOnline {
  aparencia: Partial<Aparencia> | null;
  seguidor: { especie: number; shiny: boolean } | null;
}
export interface JogadorOnline {
  id: number;
  usuario: string;
  nome: string;
  x: number;
  y: number;
  dir: DirecaoOnline;
  visual: VisualOnline;
}
/** O que a cena do mapa ouve. */
export interface OuvinteSala {
  todos(lista: JogadorOnline[]): void;
  entrou(j: JogadorOnline): void;
  saiu(id: number): void;
  moveu(id: number, x: number, y: number, dir: DirecaoOnline): void;
  visual(id: number, visual: VisualOnline): void;
}

let ws: WebSocket | null = null;
let pronto = false;
let espera = 1000;
let desistiu = false;
let minhaId = 0;
let salaAtual: { sala: string; x: number; y: number; dir: DirecaoOnline; visual: VisualOnline; ouvinte: OuvinteSala } | null = null;

export const meuIdOnline = () => minhaId;
const mandar = (msg: unknown) => pronto && ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

function entrarDeNovo(): void {
  if (!salaAtual) return;
  const { sala, x, y, dir, visual } = salaAtual;
  mandar({ t: 'sala', sala, x, y, dir, visual });
}

/** Liga a conexão (depois do login). */
export function conectarOnline(): void {
  if (ws || desistiu || !tokenAtual()) return;
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const sock = new WebSocket(url);
  ws = sock;
  sock.addEventListener('open', () => sock.send(JSON.stringify({ t: 'entrar', token: tokenAtual() })));
  sock.addEventListener('message', (e) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(e.data));
    } catch {
      return;
    }
    if (msg.t === 'ok') {
      pronto = true;
      espera = 1000;
      minhaId = msg.id as number;
      return entrarDeNovo();
    }
    const ouvinte = salaAtual?.ouvinte;
    if (!ouvinte) return;
    if (msg.t === 'jogadores' && msg.sala === salaAtual!.sala) ouvinte.todos(msg.lista as JogadorOnline[]);
    else if (msg.t === 'entrou') ouvinte.entrou(msg.jogador as JogadorOnline);
    else if (msg.t === 'saiu') ouvinte.saiu(msg.id as number);
    else if (msg.t === 'moveu') ouvinte.moveu(msg.id as number, msg.x as number, msg.y as number, msg.dir as DirecaoOnline);
    else if (msg.t === 'visual') ouvinte.visual(msg.id as number, msg.visual as VisualOnline);
  });
  sock.addEventListener('close', (e) => {
    ws = null;
    pronto = false;
    // a cena some com todos os outros (vão voltar na reconexão)
    salaAtual?.ouvinte.todos([]);
    // 4000 = o jogo foi aberto em outra aba; 4001 = sessão vencida: não fica tentando
    if (e.code === 4000 || e.code === 4001) return void (desistiu = true);
    setTimeout(conectarOnline, espera);
    espera = Math.min(espera * 2, 15000);
  });
}

/** A cena entrou num mapa: entra na sala dele. */
export function entrarNaSala(sala: string, x: number, y: number, dir: DirecaoOnline, visual: VisualOnline, ouvinte: OuvinteSala): void {
  salaAtual = { sala, x, y, dir, visual, ouvinte };
  entrarDeNovo();
}

export function sairDaSalaOnline(ouvinte: OuvinteSala): void {
  // só sai se a sala ainda for desta cena (a próxima cena pode já ter entrado em outra)
  if (salaAtual?.ouvinte !== ouvinte) return;
  salaAtual = null;
  mandar({ t: 'sair' });
}

export function moverOnline(x: number, y: number, dir: DirecaoOnline): void {
  if (!salaAtual) return;
  Object.assign(salaAtual, { x, y, dir });
  mandar({ t: 'pos', x, y, dir });
}

export function visualOnline(visual: VisualOnline): void {
  if (!salaAtual) return;
  salaAtual.visual = visual;
  mandar({ t: 'visual', visual });
}
