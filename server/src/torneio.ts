// Torneio (regras em shared/torneioRegras.ts): mata-mata de 16 às 12h30 (regras sorteadas) e 18h30 (regras da
// staff). O servidor cuida de tudo: abre e fecha a inscrição, cobra e devolve a entrada, monta a chave, começa as
// partidas (batalhas PvP calculadas aqui, server/src/pvp.ts) e entrega os prêmios. Estado em eventos_estado ('torneio').
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar, avisarEvento, avisarTodos, estaOnline } from './mundo.ts';
import * as correio from './correio.ts';
import { anexosDePremios } from './recompensas.ts';
import { criarBatalha, emBatalha } from './pvp.ts';
import { itemAleatorio, nomeDoItem, problemasDoTimeNoTorneio } from './motorDoJogo.ts';
import { NIVEL_MINIMO, liberado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { sortearFatia } from '../../shared/eventosRegras.ts';
import {
  ABRE_ANTES_MS, ENTRADA_TORNEIO, ESPERA_INICIO_MS, EXTENSAO_MAXIMA_MS, EXTENSAO_MS, FECHA_ANTES_MS, HORARIOS_TORNEIO, NOMES_RODADAS,
  PAUSA_ENTRE_RODADAS_MS, premiosTorneio, roletaTorneio, TIERS_TORNEIO, VAGAS_TORNEIO, sortearRegras, type RegrasTorneio,
} from '../../shared/torneioRegras.ts';

interface Inscrito { contaId: number; nome: string; usuario: string }
/** Partida da chave. `a`/`b` = contaId (null = ainda não definido). */
interface Partida { a: number | null; b: number | null; vencedor: number | null; wo?: boolean }
interface EstadoTorneio {
  id: string;
  tipo: 'aleatorio' | 'staff';
  horario: number;
  regras: RegrasTorneio;
  fase: 'inscricao' | 'aguardando' | 'disputa' | 'fim' | 'cancelado';
  fechaEm: number;
  comecaEm: number | null;
  inscritos: Inscrito[];
  rodadas: Partida[][];
  /** rodada em jogo e quando ela começa (pausa entre as rodadas) */
  rodada: number;
  rodadaComecaEm: number | null;
  podio?: [number, number, number];
}

const BRASILIA_MS = -3 * 3600_000;
const ler = () => banco.lerEvento<EstadoTorneio>('torneio');
const gravar = (t: EstadoTorneio) => {
  banco.gravarEvento('torneio', t);
  avisarTodos({ t: 'torneio' });
};
const regrasDaStaff = () => banco.lerEvento<RegrasTorneio>('torneio-regras-staff');

function nomeDe(contaId: number, usuario: string): string {
  try {
    const s = banco.lerSave(contaId);
    const n = s ? (JSON.parse(s.dados) as { aparencia?: { nome?: unknown } }).aparencia?.nome : null;
    if (typeof n === 'string' && n.trim()) return n.trim().slice(0, 16);
  } catch {
    // fica o usuário
  }
  return usuario;
}
const timeGuardado = (contaId: number): Record<string, unknown>[] => {
  const s = banco.lerSave(contaId);
  const t = s ? (JSON.parse(s.dados) as { time?: unknown }).time : null;
  return Array.isArray(t) ? (t as Record<string, unknown>[]) : [];
};

/** Horário (ms) de um torneio de hoje (Brasília). */
function horarioDeHoje(agora: number, hora: number, minuto: number): number {
  const br = new Date(agora + BRASILIA_MS);
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), hora, minuto) - BRASILIA_MS;
}
/** Próximo horário de torneio a partir de agora (hoje ou amanhã). */
function proximoHorario(agora: number): { horario: number; tipo: EstadoTorneio['tipo'] } {
  for (const dias of [0, 1])
    for (const h of HORARIOS_TORNEIO) {
      const horario = horarioDeHoje(agora, h.hora, h.minuto) + dias * 86_400_000;
      if (horario - FECHA_ANTES_MS > agora) return { horario, tipo: h.tipo };
    }
  return { horario: agora + 86_400_000, tipo: 'aleatorio' };
}

function novoTorneio(horario: number, tipo: EstadoTorneio['tipo'], agora: number, regras?: RegrasTorneio): EstadoTorneio {
  return {
    id: `${horario}`, tipo, horario, regras: regras ?? (tipo === 'staff' ? (regrasDaStaff() ?? sortearRegras()) : sortearRegras()),
    fase: 'inscricao', fechaEm: Math.max(agora, horario - FECHA_ANTES_MS), comecaEm: null, inscritos: [], rodadas: [], rodada: 0, rodadaComecaEm: null,
  };
}

function devolverEntradas(t: EstadoTorneio): void {
  for (const i of t.inscritos) correio.enviar(i.contaId, 'Torneio cancelado', 'O Torneio foi cancelado. Aqui está a sua entrada de volta.', [correio.anexoItem('silver', 'Poké Dólares', ENTRADA_TORNEIO)], 'torneio');
}

const embaralhar = <T>(lista: T[]) => {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
};

/**
 * Avisa quem vai jogar e está com o time fora das regras (pelo save guardado), com o que está errado e quanto tempo
 * falta: dá para arrumar antes da partida. Chamado quando a inscrição fecha e antes de cada rodada.
 */
function avisarTimesForaDasRegras(t: EstadoTorneio, contas: (number | null)[], comecaEm: number): void {
  const min = Math.max(1, Math.ceil((comecaEm - Date.now()) / 60_000));
  for (const c of contas) {
    if (c === null) continue;
    const problemas = problemasDoTimeNoTorneio(timeGuardado(c), t.regras);
    if (problemas.length) avisar(c, { t: 'torneio-aviso', erro: true, texto: `Torneio: seu time está fora das regras (${problemas.join(' ')}). Arrume em até ${min} min, senão você perde por W.O.` });
  }
}

// ---------- partidas ----------
/** Partidas em jogo agora (memória: se o servidor reiniciar, as partidas sem vencedor começam de novo). */
const emJogo = new Set<string>();
const chave = (t: EstadoTorneio, r: number, k: number) => `${t.id}:${r}:${k}`;

/** Por que não pôde jogar (para a mensagem do W.O.). */
function motivoDoWo(contaId: number, regras: RegrasTorneio): string {
  if (!estaOnline(contaId)) return 'estava fora do jogo';
  if (emBatalha(contaId)) return 'estava em outra batalha';
  return `time fora das regras: ${problemasDoTimeNoTorneio(timeGuardado(contaId), regras).join(' ')}`;
}
/** Pode jogar agora? (online, fora de outra batalha e com o time dentro das regras) */
function podeJogar(contaId: number, regras: RegrasTorneio): boolean {
  return estaOnline(contaId) && !emBatalha(contaId) && problemasDoTimeNoTorneio(timeGuardado(contaId), regras).length === 0;
}

function registrarVencedor(id: string, r: number, k: number, vencedor: number | null, wo = false): void {
  const t = ler();
  if (!t || t.id !== id || t.fase !== 'disputa') return;
  emJogo.delete(chave(t, r, k));
  const p = t.rodadas[r]?.[k];
  if (!p || p.vencedor !== null) return;
  // empate (os dois caíram juntos ou deixaram o tempo acabar): sorteio
  p.vencedor = vencedor ?? (Math.random() < 0.5 ? p.a : p.b);
  if (vencedor === null && !wo)
    for (const c of [p.a, p.b]) if (c !== null) avisar(c, { t: 'torneio-aviso', texto: c === p.vencedor ? 'Torneio: a partida terminou empatada e o sorteio escolheu você. Você avança!' : 'Torneio: a partida terminou empatada e o sorteio escolheu o seu adversário.' });
  if (wo) p.wo = true;
  gravar(t);
  // fora deste passo: quem chamou pode estar no meio de um laço sobre a rodada
  setTimeout(() => conferir(), 0);
}

function iniciarPartida(t: EstadoTorneio, r: number, k: number): void {
  const p = t.rodadas[r][k];
  if (p.vencedor !== null || emJogo.has(chave(t, r, k))) return;
  // vaga sem adversário (não acontece com 16, mas fica seguro)
  if (p.a === null || p.b === null) return registrarVencedor(t.id, r, k, p.a ?? p.b, true);
  const okA = podeJogar(p.a, t.regras);
  const okB = podeJogar(p.b, t.regras);
  // W.O.: quem não está online, está em outra batalha ou com o time fora das regras perde
  if (!okA || !okB) {
    const vencedor = okA ? p.a : okB ? p.b : null;
    for (const c of [p.a, p.b]) avisar(c, { t: 'torneio-aviso', texto: (c === p.a ? okA : okB) ? 'Torneio: seu adversário não pôde jogar (W.O.). Você avança!' : `Torneio: você perdeu por W.O. (${motivoDoWo(c, t.regras)}).` });
    return registrarVencedor(t.id, r, k, vencedor, true);
  }
  const contaA = banco.contaPorId(p.a);
  const contaB = banco.contaPorId(p.b);
  if (!contaA || !contaB) return registrarVencedor(t.id, r, k, contaA ? p.a : p.b, true);
  emJogo.add(chave(t, r, k));
  const titulo = r === 3 ? (k === 0 ? 'Final do Torneio' : 'Disputa de 3º lugar') : `Torneio · ${NOMES_RODADAS[r]}`;
  const id = t.id;
  try {
    criarBatalha(contaA, contaB, { tipo: 'torneio', titulo, regras: ['Sleep Clause Mod'], mecanicas: t.regras.mecanicas, aoFim: (v) => registrarVencedor(id, r, k, v) });
  } catch {
    emJogo.delete(chave(t, r, k));
  }
}

function comecarRodada(t: EstadoTorneio): void {
  t.rodadaComecaEm = null;
  gravar(t);
  avisarEvento(`🏆 Torneio: começaram ${COMECARAM[t.rodada]}!`);
  t.rodadas[t.rodada].forEach((_, k) => iniciarPartida(t, t.rodada, k));
}
const COMECARAM = ['as oitavas de final', 'as quartas de final', 'as semifinais', 'a final e a disputa de 3º lugar'];

/** Rodada acabou: monta a próxima ou entrega os prêmios. */
function proximaRodada(t: EstadoTorneio, agora: number): void {
  const atual = t.rodadas[t.rodada];
  const vencedores = atual.map((p) => p.vencedor!);
  if (t.rodada === 3) return premiar(t);
  const perdedor = (p: Partida) => (p.vencedor === p.a ? p.b : p.a);
  const proxima: Partida[] = t.rodada === 2
    // final + disputa de 3º lugar entre os perdedores das semifinais
    ? [{ a: vencedores[0], b: vencedores[1], vencedor: null }, { a: perdedor(atual[0]), b: perdedor(atual[1]), vencedor: null }]
    : Array.from({ length: vencedores.length / 2 }, (_, i) => ({ a: vencedores[2 * i], b: vencedores[2 * i + 1], vencedor: null }));
  t.rodadas.push(proxima);
  t.rodada++;
  t.rodadaComecaEm = agora + PAUSA_ENTRE_RODADAS_MS;
  gravar(t);
  avisarTimesForaDasRegras(t, proxima.flatMap((p) => [p.a, p.b]), t.rodadaComecaEm);
}

/** `uid` dos Pokémon do time guardado (o time do Torneio é o do save guardado). */
function timeDaConta(contaId: number): number[] {
  const guardado = banco.lerSave(contaId);
  const time = guardado ? (JSON.parse(guardado.dados) as { time?: { uid?: unknown; ovo?: unknown }[] }).time : [];
  return (Array.isArray(time) ? time : []).filter((p) => !p.ovo && Number.isSafeInteger(p.uid)).map((p) => p.uid as number);
}

function premiar(t: EstadoTorneio): void {
  const [final, terceiro] = t.rodadas[3];
  const segundo = final.vencedor === final.a ? final.b! : final.a!;
  const podio: [number, number, number] = [final.vencedor!, segundo, terceiro.vencedor!];
  t.podio = podio;
  t.fase = 'fim';
  const nome = (c: number) => t.inscritos.find((i) => i.contaId === c)?.nome ?? '?';
  podio.forEach((contaId, i) => {
    const anexos: correio.Anexo[] = anexosDePremios(premiosTorneio()[i] ?? []);
    anexos.push(correio.anexoItem(['medalha-ouro', 'medalha-prata', 'medalha-bronze'][i], `Medalha de ${['ouro', 'prata', 'bronze'][i]} do Torneio`, 1));
    if (i === 0) anexos.push(premioDaRoleta(contaId));
    // conquista "Melhor pokemon": cada Pokémon do time que jogou o Torneio ganha 1 medalha
    const uids = timeDaConta(contaId);
    if (uids.length) anexos.push({ tipo: 'medalhaPokemon', uids });
    correio.enviar(contaId, `Torneio: ${i + 1}º lugar`, `Parabéns! Você ficou em ${i + 1}º lugar no Torneio.`, anexos, 'torneio');
  });
  gravar(t);
  avisarEvento(`🏆 ${nome(podio[0])} venceu o Torneio! 2º: ${nome(podio[1])} · 3º: ${nome(podio[2])}`);
}

/** Roleta do Torneio: sorteada aqui; o jogo do campeão só gira até a fatia. O prêmio vai junto na carta do 1º lugar. */
function premioDaRoleta(contaId: number): correio.Anexo {
  const roleta = roletaTorneio();
  const fatia = sortearFatia(roleta);
  const { id, nome, quantidade } = roleta[fatia];
  avisar(contaId, { t: 'torneio-roleta', fatia });
  // sorteios (Mint, Charm, Orb) saem como UM item sorteado, na quantidade da fatia
  if (id === 'mint' || id === 'charm' || id === 'orb') {
    const item = itemAleatorio(id);
    return correio.anexoItem(item, `Roleta do Torneio: ${nomeDoItem(item)}`, quantidade);
  }
  return correio.anexoItem(id, `Roleta do Torneio: ${nome}`, quantidade);
}

// ---------- relógio do torneio ----------
export function conferir(agora = Date.now()): void {
  let t = ler();
  // nenhum torneio em andamento: abre a inscrição do próximo quando faltar 10 min
  if (!t || t.fase === 'fim' || t.fase === 'cancelado') {
    const prox = proximoHorario(agora);
    if (agora < prox.horario - ABRE_ANTES_MS || (t && t.id === `${prox.horario}`)) return;
    t = novoTorneio(prox.horario, prox.tipo, agora);
    gravar(t);
    avisarEvento(`🏆 Inscrições abertas para o Torneio das ${new Date(prox.horario + BRASILIA_MS).toISOString().slice(11, 16)}! Vá à Arena da cidade.`);
    return;
  }
  if (t.fase === 'inscricao' && agora >= t.fechaEm) {
    if (t.inscritos.length >= VAGAS_TORNEIO) return fecharInscricao(t, agora);
    // sem 16: estende de 5 em 5 min, por até 1 hora
    if (t.fechaEm + EXTENSAO_MS <= t.horario - FECHA_ANTES_MS + EXTENSAO_MAXIMA_MS) {
      t.fechaEm += EXTENSAO_MS;
      gravar(t);
      avisarEvento(`🏆 Torneio: faltam ${VAGAS_TORNEIO - t.inscritos.length} inscritos. A inscrição foi estendida por 5 minutos!`);
    } else {
      devolverEntradas(t);
      t.fase = 'cancelado';
      gravar(t);
      avisarEvento('🏆 O Torneio foi cancelado: não completou 16 inscritos. As entradas foram devolvidas.');
    }
    return;
  }
  if (t.fase === 'aguardando' && agora >= (t.comecaEm ?? 0)) {
    const ordem = embaralhar(t.inscritos.map((i) => i.contaId));
    t.rodadas = [Array.from({ length: VAGAS_TORNEIO / 2 }, (_, i) => ({ a: ordem[2 * i] ?? null, b: ordem[2 * i + 1] ?? null, vencedor: null }))];
    t.rodada = 0;
    t.fase = 'disputa';
    return comecarRodada(t);
  }
  if (t.fase === 'disputa') {
    if (t.rodadaComecaEm !== null) {
      if (agora >= t.rodadaComecaEm) comecarRodada(t);
      return;
    }
    const atual = t.rodadas[t.rodada];
    if (atual.every((p) => p.vencedor !== null)) return proximaRodada(t, agora);
    // partida sem vencedor e sem batalha (o servidor reiniciou): começa de novo
    atual.forEach((_, k) => iniciarPartida(t!, t!.rodada, k));
  }
}
function fecharInscricao(t: EstadoTorneio, agora: number): void {
  t.fase = 'aguardando';
  t.comecaEm = Math.max(t.horario, Math.min(t.fechaEm, agora) + ESPERA_INICIO_MS);
  gravar(t);
  avisarEvento('🏆 Torneio: as 16 vagas foram preenchidas! A disputa começa em breve.');
  avisarTimesForaDasRegras(t, t.inscritos.map((i) => i.contaId), t.comecaEm);
}
setInterval(() => {
  try {
    conferir();
  } catch (e) {
    console.error('torneio', e);
  }
}, 5000).unref();

// ---------- o que o jogador vê ----------
export function estado(conta: banco.Conta, agora = Date.now()) {
  const t = ler();
  const prox = proximoHorario(agora);
  if (!t) return { torneio: null, proximo: prox, entrada: ENTRADA_TORNEIO, vagas: VAGAS_TORNEIO };
  const nome = (c: number | null) => (c === null ? null : t.inscritos.find((i) => i.contaId === c)?.nome ?? '?');
  return {
    torneio: {
      tipo: t.tipo, horario: t.horario, fase: t.fase, fechaEm: t.fechaEm, comecaEm: t.comecaEm, regras: t.regras,
      inscritos: t.inscritos.map((i) => i.nome), inscrito: t.inscritos.some((i) => i.contaId === conta.id),
      rodada: t.rodada, rodadaComecaEm: t.rodadaComecaEm,
      chave: t.rodadas.map((r) => r.map((p) => ({ a: nome(p.a), b: nome(p.b), vencedor: nome(p.vencedor), wo: !!p.wo }))),
      podio: t.podio?.map(nome) ?? null,
    },
    proximo: prox, entrada: ENTRADA_TORNEIO, vagas: VAGAS_TORNEIO,
  };
}

function exigirNivel(conta: banco.Conta, save: Record<string, unknown>): void {
  const xp = save.xpTreinador;
  if (!liberado('torneio', nivelTreinador(typeof xp === 'number' && xp > 0 ? xp : 0), !!conta.admin)) throw new ErroConta(`O Torneio abre no nível ${NIVEL_MINIMO.torneio} de treinador.`, 403);
}

export function inscrever(conta: banco.Conta) {
  const t = ler();
  if (!t || t.fase !== 'inscricao') throw new ErroConta('A inscrição não está aberta.', 409);
  if (t.inscritos.some((i) => i.contaId === conta.id)) throw new ErroConta('Você já está inscrito.', 409);
  if (t.inscritos.length >= VAGAS_TORNEIO) throw new ErroConta('As 16 vagas já foram preenchidas.', 409);
  const problemas = problemasDoTimeNoTorneio(timeGuardado(conta.id), t.regras);
  if (problemas.length) throw new ErroConta(`Seu time não vale para este torneio: ${problemas.join(' ')}`);
  banco.mudarSaves([conta.id], ([save]) => {
    exigirNivel(conta, save);
    const silver = typeof save.silver === 'number' ? save.silver : 0;
    if (silver < ENTRADA_TORNEIO) throw new ErroConta('Você não tem Poké Dólares suficientes para a entrada.');
    save.silver = silver - ENTRADA_TORNEIO;
  });
  t.inscritos.push({ contaId: conta.id, nome: nomeDe(conta.id, conta.usuario), usuario: conta.usuario });
  gravar(t);
  if (t.inscritos.length >= VAGAS_TORNEIO) fecharInscricao(t, Date.now());
  const s = banco.lerSave(conta.id)!;
  return { save: JSON.parse(s.dados), versao: s.versao, ...estado(conta) };
}

export function sair(conta: banco.Conta) {
  const t = ler();
  if (!t || t.fase !== 'inscricao' || !t.inscritos.some((i) => i.contaId === conta.id)) throw new ErroConta('Você não está inscrito numa inscrição aberta.', 409);
  banco.mudarSaves([conta.id], ([save]) => {
    save.silver = (typeof save.silver === 'number' ? save.silver : 0) + ENTRADA_TORNEIO;
  });
  t.inscritos = t.inscritos.filter((i) => i.contaId !== conta.id);
  gravar(t);
  const s = banco.lerSave(conta.id)!;
  return { save: JSON.parse(s.dados), versao: s.versao, ...estado(conta) };
}

// ---------- staff ----------
const exigirStaff = (conta: banco.Conta) => {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
};
function lerRegras(v: unknown): RegrasTorneio {
  const r = (v ?? {}) as Record<string, unknown>;
  const limite = (x: unknown) => (x === null ? null : Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6 ? (x as number) : null);
  const m = (r.mecanicas ?? {}) as Record<string, unknown>;
  if (!TIERS_TORNEIO.includes(r.tier as never)) throw new ErroConta('Tier inválida.');
  return { tier: r.tier as RegrasTorneio['tier'], lendarios: limite(r.lendarios), miticos: limite(r.miticos), ub: limite(r.ub), mecanicas: { mega: m.mega === true, dynamax: m.dynamax === true, z: m.z === true, tera: m.tera === true } };
}
export function regrasDaStaffParaFora(conta: banco.Conta) {
  exigirStaff(conta);
  return { regras: regrasDaStaff() };
}
/** Regras do torneio das 18h30 (valem para os próximos; o que já abriu continua com as dele). */
export function salvarRegras(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const regras = lerRegras(dados.regras);
  banco.gravarEvento('torneio-regras-staff', regras);
  return { regras };
}
/** Teste: abre um torneio agora (inscrição de 5 min) com as regras dadas ou sorteadas. */
export function abrirAgora(conta: banco.Conta, dados: Record<string, unknown>, agora = Date.now()) {
  exigirStaff(conta);
  const t = ler();
  if (t && (t.fase === 'inscricao' || t.fase === 'aguardando' || t.fase === 'disputa')) throw new ErroConta('Já há um torneio em andamento. Cancele antes.', 409);
  const novo = novoTorneio(agora + ABRE_ANTES_MS, dados.regras ? 'staff' : 'aleatorio', agora, dados.regras ? lerRegras(dados.regras) : undefined);
  gravar(novo);
  avisarEvento('🏆 A staff abriu as inscrições de um Torneio! Vá à Arena da cidade.');
  return estado(conta);
}
export function cancelar(conta: banco.Conta) {
  exigirStaff(conta);
  const t = ler();
  if (!t || t.fase === 'fim' || t.fase === 'cancelado') throw new ErroConta('Não há torneio em andamento.', 409);
  devolverEntradas(t);
  t.fase = 'cancelado';
  gravar(t);
  avisarEvento('🏆 O Torneio foi cancelado pela staff. As entradas foram devolvidas.');
  return estado(conta);
}
