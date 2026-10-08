// Passe de batalha: 30 níveis para uma temporada de 30 dias. O XP do passe vem SÓ das missões diárias
// (pedido do dono: sem semanais nem da temporada), 5 por dia, no máximo 2 níveis por dia.

export const NIVEIS_PASSE = 30;
/** XP do passe para subir cada nível. */
export const XP_POR_NIVEL_PASSE = 100;
/** XP de cada missão: 5 missões × 40 = 200 por dia = 2 níveis (o teto pedido pelo dono). */
export const XP_POR_MISSAO = 40;
/** Quantidades sorteadas a cada dia (iguais para todos os jogadores no mesmo dia: o sorteio usa a data). */
export const ALVO_DERROTAR: [number, number] = [10, 20];
export const ALVO_CAPTURAR: [number, number] = [10, 15];
export const ALVO_DUELOS: [number, number] = [5, 10];
/** Missão de shiny: capturar 1 shiny de qualquer espécie. */
export const ALVO_SHINY = 1;

/** derrotar/capturar = espécie sorteada; shiny = qualquer shiny capturado; duelo = vitória em Duelos com treinadores. */
export type TipoMissao = 'derrotar' | 'capturar' | 'shiny' | 'duelo';

export interface Missao {
  tipo: TipoMissao;
  /** Só em derrotar/capturar. */
  especieId?: number;
  alvo: number;
  feito: number;
}

/** Muda quando o formato das missões muda: saves com outra versão sorteiam as missões de hoje de novo. */
export const VERSAO_MISSOES = 2;

export interface EstadoPasse {
  /** XP total do passe (o nível sai de nivelPasse). */
  xp: number;
  /** Dia das missões atuais (AAAA-MM-DD, horário do jogador; no MMO o servidor decide). */
  dia: string;
  missoes: Missao[];
  /** VERSAO_MISSOES de quando as missões foram sorteadas. */
  versao?: number;
}

export const missaoCompleta = (m: Missao) => m.feito >= m.alvo;

export function nivelPasse(xp: number): number {
  return Math.min(NIVEIS_PASSE, Math.floor(xp / XP_POR_NIVEL_PASSE));
}

/** Dia de hoje no relógio do jogador (vira à meia-noite). */
export function diaDeHoje(agora = new Date()): string {
  const d2 = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${d2(agora.getMonth() + 1)}-${d2(agora.getDate())}`;
}

const entre = ([min, max]: [number, number], aleatorio: () => number) => min + Math.floor(aleatorio() * (max - min + 1));

/** Sorteio com semente (mulberry32): a mesma data dá os mesmos números para todo mundo. */
function aleatorioDoDia(dia: string): () => number {
  let a = 0;
  for (const c of dia) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Missões do dia: 1 shiny, 2 derrotar, 1 capturar, 1 duelos. As QUANTIDADES vêm da data (iguais para todos);
 * as espécies são do jogador (`especies` = comuns que ele encontra hoje: região e faixa de nível dele, sem
 * iniciais, lendários, míticos e Ultra Beasts), cada missão com uma espécie diferente.
 */
export function sortearMissoes(dia: string, especies: number[], aleatorio = Math.random): Missao[] {
  const doDia = aleatorioDoDia(dia);
  const sobra = [...especies];
  const tirar = () => (sobra.length ? sobra.splice(Math.floor(aleatorio() * sobra.length), 1)[0] : especies[Math.floor(aleatorio() * especies.length)]);
  const missoes: Missao[] = [{ tipo: 'shiny', alvo: ALVO_SHINY, feito: 0 }];
  const derrotar = [entre(ALVO_DERROTAR, doDia), entre(ALVO_DERROTAR, doDia)];
  const capturar = entre(ALVO_CAPTURAR, doDia);
  const duelos = entre(ALVO_DUELOS, doDia);
  if (especies.length) {
    for (const alvo of derrotar) missoes.push({ tipo: 'derrotar', especieId: tirar(), alvo, feito: 0 });
    missoes.push({ tipo: 'capturar', especieId: tirar(), alvo: capturar, feito: 0 });
  }
  missoes.push({ tipo: 'duelo', alvo: duelos, feito: 0 });
  return missoes;
}

/** Conta um progresso (espécie só em derrotar/capturar); devolve as missões concluídas agora (o XP já entra). */
export function registrarNaMissao(passe: EstadoPasse, tipo: TipoMissao, especieId?: number): Missao[] {
  const concluidas: Missao[] = [];
  for (const m of passe.missoes) {
    if (m.tipo !== tipo || (m.especieId !== undefined && m.especieId !== especieId) || missaoCompleta(m)) continue;
    m.feito++;
    if (missaoCompleta(m)) {
      passe.xp = Math.min(NIVEIS_PASSE * XP_POR_NIVEL_PASSE, passe.xp + XP_POR_MISSAO);
      concluidas.push(m);
    }
  }
  return concluidas;
}
