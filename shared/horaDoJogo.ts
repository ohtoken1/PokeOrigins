// Relógio do jogo (pedido do dono, 24/10/2026): um dia do jogo dura 6 horas reais, 2 h de manhã, 2 h de tarde e
// 2 h de noite, então cada período aparece 4 vezes a cada 24 h. Alinhado a Brasília: manhã começa às 0h, 6h, 12h e 18h.
// SEM imports (o servidor pode ler). Vale para o céu da cidade e para as evoluções de dia/noite.

export const DURACAO_DIA_JOGO_MS = 6 * 60 * 60 * 1000;
/** Brasília é UTC−3: com 3 h de deslocamento, o ciclo começa (manhã) às 0h, 6h, 12h e 18h de Brasília. */
const DESLOCAMENTO_MS = 3 * 60 * 60 * 1000;

export type PeriodoDoDia = 'manha' | 'tarde' | 'noite';
export const NOME_PERIODO: Record<PeriodoDoDia, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

/** Quanto do dia do jogo já passou (0 a 1). */
const fracao = (agora: number) => (((agora + DESLOCAMENTO_MS) % DURACAO_DIA_JOGO_MS) + DURACAO_DIA_JOGO_MS) % DURACAO_DIA_JOGO_MS / DURACAO_DIA_JOGO_MS;

export function periodoDoDia(agora = Date.now()): PeriodoDoDia {
  const f = fracao(agora);
  return f < 1 / 3 ? 'manha' : f < 2 / 3 ? 'tarde' : 'noite';
}

/**
 * Hora do jogo (0–24) para quem desenha o céu e para as evoluções: manhã = 6h→12h, tarde = 12h→18h30,
 * noite = 18h30→6h (o pôr do sol fica no começo da noite e a aurora no fim dela).
 */
export function horaDoJogo(agora = Date.now()): number {
  const f = fracao(agora) * 3;
  const [ini, fim] = f < 1 ? [6, 12] : f < 2 ? [12, 18.5] : [18.5, 30];
  return (ini + (fim - ini) * (f % 1)) % 24;
}

/** Quando o período atual acaba (ms). */
export function fimDoPeriodo(agora = Date.now()): number {
  const terco = DURACAO_DIA_JOGO_MS / 3;
  const dentro = fracao(agora) * DURACAO_DIA_JOGO_MS;
  return agora + (terco - (dentro % terco));
}
