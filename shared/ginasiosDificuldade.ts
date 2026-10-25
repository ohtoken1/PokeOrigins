// Três dificuldades de ginásio (pedido do dono, 24/10/2026). SEM imports: o servidor também lê.
// Fácil = o time dos jogos (shared/ginasios.ts), como sempre. Médio e Difícil = times montados pela staff em
// Administração → Ginásios (guardados no servidor, server/src/ajustes.ts). A insígnia sai só no Fácil; cada
// dificuldade tem a sua sequência (vencer o 1º para liberar o 2º) e paga Poké Dólares só na primeira vitória.

export type DificuldadeGinasio = 'facil' | 'media' | 'dificil';
export const DIFICULDADES_GINASIO: DificuldadeGinasio[] = ['facil', 'media', 'dificil'];
export const NOME_DIFICULDADE_GINASIO: Record<DificuldadeGinasio, string> = { facil: 'Fácil', media: 'Médio', dificil: 'Difícil' };
/** Dificuldades com time montado pela staff. */
export type DificuldadeManual = Exclude<DificuldadeGinasio, 'facil'>;
export const DIFICULDADES_MANUAIS: DificuldadeManual[] = ['media', 'dificil'];

/** Nível mínimo do líder pela ordem do ginásio: Fácil 10, 16, 22… (de 6 em 6); Médio 10, 20… 80; Difícil sempre 100. */
export function nivelMinimoGinasio(d: DificuldadeGinasio, ordem: number): number {
  if (d === 'dificil') return 100;
  return Math.min(100, d === 'facil' ? 10 + 6 * (ordem - 1) : 10 * ordem);
}

/** Nível dos Pokémon do líder: o do Pokémon mais forte do jogador, nunca abaixo do mínimo (Difícil = 100). */
export const nivelDoLider = (d: DificuldadeGinasio, ordem: number, maiorDoTime: number): number =>
  d === 'dificil' ? 100 : Math.min(100, Math.max(maiorDoTime, nivelMinimoGinasio(d, ordem)));

/** Poké Dólares da primeira vitória = recompensa do ginásio × isto. */
export const MULT_RECOMPENSA_GINASIO: Record<DificuldadeGinasio, number> = { facil: 1, media: 2, dificil: 4 };
export const POKEMON_POR_TIME_GINASIO = 6;
