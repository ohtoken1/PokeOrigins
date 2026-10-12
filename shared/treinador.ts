// Nível de treinador (1 a 25), separado do nível dos Pokémon. Os selvagens só sobem até o treinador 20
// (faixa 96–100): do 21 ao 25 o nível vale para conquistas e recompensas, não muda os encontros.
// O treinador ganha o mesmo XP que o Pokémon derrotado/capturado dá; a curva é lenta de propósito
// (no futuro haverá recompensas por nível alcançado).

export const NIVEL_MAX_TREINADOR = 25;
/** XP para ir do nível n ao n+1 = BASE × n^EXPOENTE (a mesma curva continua do 20 ao 25). */
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

/**
 * Limite de nível dos Pokémon que o jogador pode USAR (pedido do dono): do treinador 1 ao 9, até 10 × o nível dele
 * (treinador 3 → nível 30); do 10 em diante, sem limite. Acima do limite o Pokémon fica no PC e quem está no
 * time para de ganhar XP ao chegar nele. Segura a corrida de nível no começo e a conta nova com Pokémon emprestado.
 */
export const TREINADOR_SEM_LIMITE = 10;
export const nivelMaximoPokemon = (nivelTreinador: number): number => (nivelTreinador >= TREINADOR_SEM_LIMITE ? 100 : Math.max(1, nivelTreinador) * 10);
/** Nível de treinador necessário para usar um Pokémon deste nível. */
export const treinadorParaUsar = (nivelPokemon: number): number => Math.min(TREINADOR_SEM_LIMITE, Math.ceil(nivelPokemon / 10));

/** Os encontros vão do (teto − 4) ao teto: 5 níveis (treinador 1 → 1–5, treinador 2 → 6–10…). */
export const FAIXA_NIVEIS_ENCONTRO = 4;

/** Nível máximo dos Pokémon selvagens: 5× o nível de treinador, até 100 (treinador 20 ou mais → 100). */
export function nivelMaximoEncontro(nivelTreinador: number): number {
  return Math.min(100, 5 * nivelTreinador);
}
