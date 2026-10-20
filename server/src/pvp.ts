// Batalhas PvP (jogador contra jogador), calculadas NO SERVIDOR com o motor do jogo (shared/batalha/pvp.ts).
// O navegador só manda a escolha do turno; o servidor confere, roda o turno e manda a cada um o que ele pode ver.
// Os times saem do save GUARDADO no servidor (curados; o save de ninguém muda). Base do Torneio e do ranqueado:
// `criarBatalha` aceita regras e um aviso de fim (`aoFim`) para quem organizar as partidas.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar, estaOnline } from './mundo.ts';
import { NOME_MECANICA } from '../../shared/torneioRegras.ts';
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
  tipo: 'amistoso' | 'torneio' | 'ranqueado' | 'liga';
  aoFim?: (vencedor: number | null) => void;
  /** Tempo de cada turno (PvP 60 s; Liga 180 s). */
  tempo: number;
  /** Lado 1 é um treinador NPC (Liga): o servidor escolhe por ele (`escolherIa`). `contas[1]` = 0. */
  npc: boolean;
  /** Tudo o que cada lado já viu (começo + turnos): quem recarrega a página volta para a batalha com isto. */
  historico: [unknown[], unknown[]];
  /** Só uma mecânica especial (Mega, Z-Move ou Tera) por lado; usar uma segunda diferente = derrota (ranqueado). */
  umaMecanica: boolean;
  mecanicaUsada: [Especial | null, Especial | null];
  /** Dados fixos da mensagem `pvp-inicio` de cada lado (adversário, título, time da batalha). */
  abertura: [Record<string, unknown>, Record<string, unknown>];
}
type Especial = 'z' | 'tera' | 'mega';
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
  for (const lado of (sala.npc ? [0] : [0, 1]) as (0 | 1)[])
    avisar(sala.contas[lado], { t: 'pvp-turno', id: sala.id, eventos: eventos[lado], foto: sala.batalha.foto(lado), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: sala.tempo });
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
export function criarBatalha(a: banco.Conta, b: banco.Conta, opcoes: { tipo: Sala['tipo']; titulo?: string; regras?: string[]; mecanicas?: MecanicasPvp; umaMecanica?: boolean; aoFim?: Sala['aoFim'] } = { tipo: 'amistoso' }): number {
  if (salaDaConta.has(a.id) || salaDaConta.has(b.id)) throw new ErroConta('Um dos jogadores já está numa batalha.', 409);
  const ja = jogadorDe(a);
  const jb = jogadorDe(b);
  const batalha = novaBatalhaPvp(ja, jb, opcoes.regras ?? [], opcoes.mecanicas);
  const sala: Sala = { id: proximaSala++, batalha, contas: [a.id, b.id], nomes: [ja.nome, jb.nome], prazo: Date.now() + TEMPO_TURNO_PVP_MS + FOLGA_ANIMACAO_MS, tipo: opcoes.tipo, aoFim: opcoes.aoFim, tempo: TEMPO_TURNO_PVP_MS, npc: false, umaMecanica: !!opcoes.umaMecanica, mecanicaUsada: [null, null], historico: [[], []], abertura: [{}, {}] };
  salas.set(sala.id, sala);
  salaDaConta.set(a.id, sala).set(b.id, sala);
  const inicio = batalha.iniciar();
  for (const [lado, outro] of [[0, 1], [1, 0]] as const) {
    sala.historico[lado].push(...inicio[lado]);
    // meuTime: o time com que o lado está lutando (a ordem precisa casar com a do servidor, mesmo que o save mude)
    sala.abertura[lado] = { tipo: sala.tipo, titulo: opcoes.titulo ?? 'Duelo', adversario: { nome: sala.nomes[outro], time: timeVisivel([ja, jb][outro].time) }, nomes: [ja, jb][lado].nomes, meuTime: [ja, jb][lado].time, umaMecanica: sala.umaMecanica };
    avisar(sala.contas[lado], { t: 'pvp-inicio', id: sala.id, eventos: inicio[lado], foto: batalha.foto(lado), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: sala.tempo, ...sala.abertura[lado] });
  }
  return sala.id;
}

/**
 * Batalha contra um treinador NPC, calculada aqui como o PvP (Liga Pokémon): o lado 1 é o NPC e o servidor escolhe
 * por ele. O time do jogador entra COMO ESTÁ (sem curar); `aoFim` recebe se o jogador venceu e o time como terminou.
 * Recarregar a página volta para a batalha (`atual`) e o relógio do turno não para.
 */
export function criarBatalhaPve(conta: banco.Conta, jogador: JogadorPvp, npc: JogadorPvp, opcoes: { titulo: string; tempo: number; aoFim: (venceu: boolean, time: Record<string, unknown>[]) => void }): number {
  if (salaDaConta.has(conta.id)) throw new ErroConta('Você já está numa batalha.', 409);
  const batalha = novaBatalhaPvp(jogador, npc, [], undefined, [false, true]);
  const sala: Sala = {
    id: proximaSala++, batalha, contas: [conta.id, 0], nomes: [jogador.nome, npc.nome], prazo: Date.now() + opcoes.tempo + FOLGA_ANIMACAO_MS, tipo: 'liga', tempo: opcoes.tempo, npc: true,
    historico: [[], []], abertura: [{}, {}], umaMecanica: false, mecanicaUsada: [null, null],
    aoFim: (v) => opcoes.aoFim(v === conta.id, batalha.timeFinal(0)),
  };
  salas.set(sala.id, sala);
  salaDaConta.set(conta.id, sala);
  const inicio = batalha.iniciar();
  vezDoNpc(sala);
  sala.historico[0].push(...inicio[0]);
  sala.abertura[0] = { tipo: 'liga', titulo: opcoes.titulo, adversario: { nome: npc.nome, time: timeVisivel(npc.time) }, nomes: jogador.nomes, meuTime: jogador.time };
  avisar(conta.id, { t: 'pvp-inicio', id: sala.id, eventos: inicio[0], foto: batalha.foto(0), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: sala.tempo, ...sala.abertura[0] });
  return sala.id;
}

/** NPC escolhe sempre que precisa (pode precisar mais de uma vez: trocar o desmaiado e já escolher o golpe). */
function vezDoNpc(sala: Sala): void {
  for (let i = 0; sala.npc && i < 6 && sala.batalha.precisaEscolher(1); i++) sala.batalha.escolherIa(1);
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
  vezDoNpc(sala);
  const eventos: [unknown[], unknown[]] = [sala.batalha.eventos(0), sala.batalha.eventos(1)];
  // só um escolheu: o turno ainda não rodou (o outro está pensando)
  if (!eventos[0].length && !eventos[1].length && !sala.batalha.terminou) return;
  sala.prazo = Date.now() + sala.tempo + FOLGA_ANIMACAO_MS;
  enviarTurno(sala, eventos);
  if (sala.batalha.terminou) encerrar(sala);
  // começou um turno novo: o NPC já escolhe (o jogador ainda vai pensar)
  else vezDoNpc(sala);
}

export function escolher(conta: banco.Conta, dados: Record<string, unknown>) {
  const sala = salaDaConta.get(conta.id);
  if (!sala || sala.id !== dados.id) throw new ErroConta('Você não está nesta batalha.', 409);
  const lado = sala.contas[0] === conta.id ? 0 : 1;
  const escolha = lerEscolha(dados.escolha);
  const especial = escolha.tipo === 'golpe' && escolha.especial && escolha.especial !== 'dynamax' ? escolha.especial : null;
  const usada = sala.mecanicaUsada[lado];
  // regra do ranqueado: uma mecânica só; a segunda diferente perde a partida
  if (sala.umaMecanica && especial && usada && usada !== especial) {
    const texto = `${sala.nomes[lado]} usou duas mecânicas (${NOME_MECANICA[usada]} e ${NOME_MECANICA[especial]}) e perdeu a partida.`;
    sala.batalha.desistir(lado);
    for (const c of sala.contas) avisar(c, { t: 'pvp-aviso', texto });
    depoisDaEscolha(sala);
    return { ok: true };
  }
  if (!sala.batalha.escolher(lado, escolha)) throw new ErroConta('Escolha inválida.');
  if (especial && !usada) sala.mecanicaUsada[lado] = especial;
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
  return { batalha: { mecanicaUsada: sala.mecanicaUsada[lado], id: sala.id, eventos: sala.historico[lado], foto: sala.batalha.foto(lado), prazo: sala.prazo - FOLGA_ANIMACAO_MS, tempo: sala.tempo, retomada: true, ...sala.abertura[lado] } };
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
