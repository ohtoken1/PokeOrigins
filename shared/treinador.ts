// Nível de treinador (1 a 20), separado do nível dos Pokémon.
// O treinador ganha o mesmo XP que o Pokémon derrotado/capturado dá; a curva é lenta de propósito
// (no futuro haverá recompensas por nível alcançado).

export const NIVEL_MAX_TREINADOR = 20;
/** XP para ir do nível n ao n+1 = BASE × n^EXPOENTE (o XP total até o 20 é o mesmo que ia até o 50 antes). */
const BASE = 262;
const EXPOENTE = 3.8;

export function xpParaSubir(nivel: number): number {
  return Math.floor(BASE * nivel ** EXPOENTE);
}

/** XP total acumulado necessário para chegar ao nível. */
export function xpTotalParaNivel(nivel: number): number {
  let total = 0;
  for (let n = 1; n < nivel; n++) total += xpParaSubir(n);
  return total;
}

export function nivelTreinador(xpTotal: number): number {
  let nivel = 1;
  let restante = xpTotal;
  while (nivel < NIVEL_MAX_TREINADOR && restante >= xpParaSubir(nivel)) {
    restante -= xpParaSubir(nivel);
    nivel++;
  }
  return nivel;
}

/** Progresso dentro do nível atual: quanto já tem e quanto precisa para o próximo. */
export function progressoTreinador(xpTotal: number): { nivel: number; atual: number; necessario: number } {
  const nivel = nivelTreinador(xpTotal);
  if (nivel >= NIVEL_MAX_TREINADOR) return { nivel, atual: 0, necessario: 0 };
  return { nivel, atual: xpTotal - xpTotalParaNivel(nivel), necessario: xpParaSubir(nivel) };
}

/** Os encontros vão do (teto − 4) ao teto: 5 níveis (treinador 1 → 1–5, treinador 2 → 6–10…). */
export const FAIXA_NIVEIS_ENCONTRO = 4;

/** Nível máximo dos Pokémon selvagens: 5× o nível de treinador (treinador 20 → 100). */
export function nivelMaximoEncontro(nivelTreinador: number): number {
  return Math.min(100, 5 * nivelTreinador);
}
