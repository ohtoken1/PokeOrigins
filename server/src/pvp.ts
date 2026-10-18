// Batalhas PvP (jogador contra jogador), calculadas NO SERVIDOR com o motor do jogo (shared/batalha/pvp.ts).
// O navegador só manda a escolha do turno; o servidor confere, roda o turno e manda a cada um o que ele pode ver.
// Os times saem do save GUARDADO no servidor (curados; o save de ninguém muda). Base do Torneio e do ranqueado:
// `criarBatalha` aceita regras e um aviso de fim (`aoFim`) para quem organizar as partidas.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar, estaOnline } from './mundo.ts';
import { nomeDaEspecie, novaBatalhaPvp, type BatalhaPvp, type EscolhaPvp, type JogadorPvp, type MecanicasPvp } from './motorDoJogo.ts';

/** Tempo para escolher cada turno (regra do dono para o Torneio; vale para todo PvP). */
export const TEMPO_TURNO_PVP_MS = 60_000;
/** Folga para as animações do turno anterior tocarem antes do relógio do jogador começar. */
const FOLGA_ANIMACAO_MS = 20_000;
const VALIDADE_CONVITE_MS = 60_000;

interface Sala {
  id: number;
  batalha: BatalhaPvp;
  contas: [number, number];
  nomes: [string, string];
  prazo: number;
  tipo: 'amistoso' | 'torneio';
  aoFim?: (vencedor: number | null) => void;
  /** Tudo o que cada lado já viu (começo + turnos): quem recarrega a página volta para a batalha com isto. */
  historico: [unknown[], unknown[]];
  /** Dados fixos da mensagem `pvp-inicio` de cada lado (adversário, título, time da batalha). */
  abertura: [Record<string, unknown>, Record<string, unknown>];
}
const salas = new Map<number, Sala>();
const salaDaConta = new Map<number, Sala>();
let proximaSala = 1;
const convites = new Map<number, { de: number; nome: string; usuario: string; ate: number }>();

const lerJson = (contaId: number): Record<string, unknown> | null => {
  const s = banco.lerSave(contaId);
  return s ? (JSON.parse(s.dados) as Record<string, unknown>) : null;
};
function nomeDe(conta: { id: number; usuario: string }): string {
  const n = (lerJson(conta.id)?.aparencia as { nome?: unknown } | undefined)?.nome;
  return typeof n === 'string' && n.trim() ? n.trim().slice(0, 16) : conta.usuario;
}

/** Time do save guardado (sem ovos). */
function jogadorDe(conta: { id: number; usuario: string }): JogadorPvp {
  const save = lerJson(conta.id);
  const time = (Array.isArray(save?.time) ? save.time : []).filter((p: { ovo?: unknown }) => p && !p.ovo) as Record<string, unknown>[];
  if (!time.length) throw new ErroConta('Sem Pokémon no time.');
  return { nome: nomeDe(conta), time, nomes: time.map((p) => nomeDaEspecie(Number(p.especieId))) };
}

/** O que o outro jogador pode saber do seu time: só espécie, nível, shiny e gênero (golpes, IVs e item ficam escondidos). */
const timeVisivel = (time: Record<string, unknown>[]) =>
  time.map((p) => ({
    especieId: p.especieId, nivel: p.nivel, shiny: p.shiny === true, genero: p.genero, natureza: '', habilidade: '', exp: 0, amizade: 0, status: null, hp: 1, golpes: [],
    ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  }));

/** Manda a cada lado os eventos novos e a "foto" dele. */
function enviarTurno(sala: Sala, eventos: [unknown[], unknown[]]): void {
  for (const lado of [0, 1] as const) sala.historico[lado].push(...eventos[lado]);
  for (const lado of [0, 1] as const)
    avisar(sala.contas[lado], { t: 'pvp-turno', id: sala.id, eventos: eventos[lado], foto: sala.batalha.foto(lado), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: TEMPO_TURNO_PVP_MS });
}

function encerrar(sala: Sala): void {
  if (!salas.has(sala.id)) return;
  salas.delete(sala.id);
  for (const c of sala.contas) if (salaDaConta.get(c) === sala) salaDaConta.delete(c);
  const v = sala.batalha.vencedor;
  sala.aoFim?.(v === null ? null : sala.contas[v]);
}

/**
 * Começa uma batalha entre duas contas (amistoso, ou partida do Torneio/ranqueado com `regras` e `aoFim`).
 * Os dois recebem `pvp-inicio` e o jogo abre a tela de batalha.
 */
export function criarBatalha(a: banco.Conta, b: banco.Conta, opcoes: { tipo: Sala['tipo']; titulo?: string; regras?: string[]; mecanicas?: MecanicasPvp; aoFim?: Sala['aoFim'] } = { tipo: 'amistoso' }): number {
  if (salaDaConta.has(a.id) || salaDaConta.has(b.id)) throw new ErroConta('Um dos jogadores já está numa batalha.', 409);
  const ja = jogadorDe(a);
  const jb = jogadorDe(b);
  const batalha = novaBatalhaPvp(ja, jb, opcoes.regras ?? [], opcoes.mecanicas);
  const sala: Sala = { id: proximaSala++, batalha, contas: [a.id, b.id], nomes: [ja.nome, jb.nome], prazo: Date.now() + TEMPO_TURNO_PVP_MS + FOLGA_ANIMACAO_MS, tipo: opcoes.tipo, aoFim: opcoes.aoFim, historico: [[], []], abertura: [{}, {}] };
  salas.set(sala.id, sala);
  salaDaConta.set(a.id, sala).set(b.id, sala);
  const inicio = batalha.iniciar();
  for (const [lado, outro] of [[0, 1], [1, 0]] as const) {
    sala.historico[lado].push(...inicio[lado]);
    // meuTime: o time com que o lado está lutando (a ordem precisa casar com a do servidor, mesmo que o save mude)
    sala.abertura[lado] = { tipo: sala.tipo, titulo: opcoes.titulo ?? 'Duelo', adversario: { nome: sala.nomes[outro], time: timeVisivel([ja, jb][outro].time) }, nomes: [ja, jb][lado].nomes, meuTime: [ja, jb][lado].time };
    avisar(sala.contas[lado], { t: 'pvp-inicio', id: sala.id, eventos: inicio[lado], foto: batalha.foto(lado), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: TEMPO_TURNO_PVP_MS, ...sala.abertura[lado] });
  }
  return sala.id;
}

function lerEscolha(v: unknown): EscolhaPvp {
  const e = (v ?? {}) as Record<string, unknown>;
  const especiais = ['z', 'tera', 'mega', 'dynamax'];
  if (e.tipo === 'golpe' && Number.isInteger(e.indice)) return { tipo: 'golpe', indice: e.indice as number, especial: especiais.includes(e.especial as string) ? (e.especial as 'z') : null };
  if (e.tipo === 'troca' && Number.isInteger(e.posicao)) return { tipo: 'troca', posicao: e.posicao as number };
  throw new ErroConta('Escolha inválida.');
}

/** Depois de uma escolha (ou desistência): se o turno andou, manda para os dois; se acabou, fecha a sala. */
function depoisDaEscolha(sala: Sala): void {
  const eventos: [unknown[], unknown[]] = [sala.batalha.eventos(0), sala.batalha.eventos(1)];
  // só um escolheu: o turno ainda não rodou (o outro está pensando)
  if (!eventos[0].length && !eventos[1].length && !sala.batalha.terminou) return;
  sala.prazo = Date.now() + TEMPO_TURNO_PVP_MS + FOLGA_ANIMACAO_MS;
  enviarTurno(sala, eventos);
  if (sala.batalha.terminou) encerrar(sala);
}

export function escolher(conta: banco.Conta, dados: Record<string, unknown>) {
  const sala = salaDaConta.get(conta.id);
  if (!sala || sala.id !== dados.id) throw new ErroConta('Você não está nesta batalha.', 409);
  const lado = sala.contas[0] === conta.id ? 0 : 1;
  if (!sala.batalha.escolher(lado, lerEscolha(dados.escolha))) throw new ErroConta('Escolha inválida.');
  depoisDaEscolha(sala);
  return { ok: true };
}

export function desistir(conta: banco.Conta, dados: Record<string, unknown>) {
  const sala = salaDaConta.get(conta.id);
  if (!sala || sala.id !== dados.id) throw new ErroConta('Você não está nesta batalha.', 409);
  sala.batalha.desistir(sala.contas[0] === conta.id ? 0 : 1);
  depoisDaEscolha(sala);
  return { ok: true };
}

/**
 * Batalha em andamento da conta (o jogo pergunta ao abrir: recarregou a página no meio de uma partida). Mesmo
 * formato do `pvp-inicio`, com TODOS os eventos que o lado já viu; a tela toca tudo depressa e volta ao turno.
 */
export function atual(conta: banco.Conta) {
  const sala = salaDaConta.get(conta.id);
  if (!sala) return { batalha: null };
  const lado = sala.contas[0] === conta.id ? 0 : 1;
  return { batalha: { id: sala.id, eventos: sala.historico[lado], foto: sala.batalha.foto(lado), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: TEMPO_TURNO_PVP_MS, retomada: true, ...sala.abertura[lado] } };
}

/** A conta está numa batalha PvP agora? */
export const emBatalha = (contaId: number) => salaDaConta.has(contaId);

/** Tempo esgotado: quem não escolheu perde; se os dois não escolheram, ninguém vence. */
function conferirPrazos(agora = Date.now()): void {
  for (const sala of [...salas.values()]) {
    if (agora < sala.prazo) continue;
    const atrasados = ([0, 1] as const).filter((l) => sala.batalha.precisaEscolher(l));
    if (atrasados.length === 2) sala.batalha.empatar();
    else if (atrasados.length === 1) sala.batalha.desistir(atrasados[0]);
    else continue;
    depoisDaEscolha(sala);
  }
}
setInterval(conferirPrazos, 2000).unref();

// ---- desafio amistoso (clicar no outro jogador no mapa → Desafiar para duelo) ----
export function desafiar(conta: banco.Conta, dados: Record<string, unknown>) {
  const alvo = typeof dados.usuario === 'string' ? banco.contaPorUsuario(dados.usuario.trim()) : undefined;
  if (!alvo || alvo.id === conta.id) throw new ErroConta('Jogador não encontrado.', 404);
  if (!estaOnline(alvo.id)) throw new ErroConta('Este jogador não está online.', 409);
  if (salaDaConta.has(conta.id)) throw new ErroConta('Você já está numa batalha.', 409);
  if (salaDaConta.has(alvo.id)) throw new ErroConta('Este jogador já está numa batalha.', 409);
  if (lerJson(alvo.id)?.aceitarDuelos === false) throw new ErroConta('Este jogador não aceita desafios.', 409);
  jogadorDe(conta);
  const nome = nomeDe(conta);
  convites.set(alvo.id, { de: conta.id, nome, usuario: conta.usuario, ate: Date.now() + VALIDADE_CONVITE_MS });
  avisar(alvo.id, { t: 'pvp-convite', nome, usuario: conta.usuario, ate: Date.now() + VALIDADE_CONVITE_MS });
  return { ok: true };
}

export function responder(conta: banco.Conta, dados: Record<string, unknown>) {
  const c = convites.get(conta.id);
  if (!c || c.usuario !== dados.usuario || Date.now() > c.ate) throw new ErroConta('O desafio não vale mais.', 409);
  convites.delete(conta.id);
  const de = banco.contaPorId(c.de);
  if (!de) throw new ErroConta('Jogador não encontrado.', 404);
  if (dados.aceitar !== true) {
    avisar(de.id, { t: 'pvp-recusado', nome: nomeDe(conta) });
    return { ok: true };
  }
  if (!estaOnline(de.id)) throw new ErroConta('Quem desafiou já saiu do jogo.', 409);
  criarBatalha(de, conta);
  return { ok: true };
}
