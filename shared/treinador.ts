// Nível de treinador (1 a 50), separado do nível dos Pokémon.
// O treinador ganha o mesmo XP que o Pokémon derrotado/capturado dá; a curva é lenta de propósito
// (no futuro haverá recompensas por nível alcançado).

export const NIVEL_MAX_TREINADOR = 50;
/** XP para ir do nível n ao n+1 = BASE × n^EXPOENTE. */
const BASE = 100;
const EXPOENTE = 1.9;
/** Quantos níveis os Pokémon selvagens ganham por nível de treinador. */
export const NIVEIS_SELVAGEM_POR_NIVEL_TREINADOR = 1.9;

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

/** Níveis somados aos Pokémon selvagens por causa do nível do treinador. */
export function bonusNivelSelvagem(nivel: number): number {
  return Math.floor((nivel - 1) * NIVEIS_SELVAGEM_POR_NIVEL_TREINADOR);
}

/** A partir deste nível o jogador pode escolher o nível dos encontros. */
export const NIVEL_ESCOLHER_ENCONTRO = 35;
