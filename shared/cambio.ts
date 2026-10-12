// Banco da cidade: troca de silver por gold e de gold por silver (este arquivo não importa nada: o servidor usa).
// Câmbio do dono: comprar 1 gold custa 10 mil silver, vender 1 gold rende 7,5 mil (a diferença fica no cofre).
// O banco está FECHADO para jogadores comuns por enquanto (só administradores; conferido também no servidor).

/** Quanto de silver custa COMPRAR 1 gold. */
export const GOLD_CUSTA_SILVER = 10_000;
/** Quanto de silver rende VENDER 1 gold. */
export const GOLD_VALE_SILVER = 7_500;
/** Maior quantidade de gold por operação. */
export const CAMBIO_MAX_POR_VEZ = 1_000_000;

export type OperacaoCambio = 'comprar' | 'vender';
/** Silver que sai (comprar gold) ou entra (vender gold) numa operação de `gold` unidades. */
export const silverDaOperacao = (operacao: OperacaoCambio, gold: number) => gold * (operacao === 'comprar' ? GOLD_CUSTA_SILVER : GOLD_VALE_SILVER);

/**
 * Cofre do banco (pedido do dono): o banco não cria moeda. Ele só entrega o que tem guardado, e tudo o que os
 * jogadores pagam fica nele. Começa com estes valores (uma vez só, quando o servidor cria o cofre).
 */
export const COFRE_SILVER_INICIAL = 1000;
export const COFRE_GOLD_INICIAL = 0;
export interface Cofre {
  silver: number;
  gold: number;
}
/** Maior quantidade de gold que dá para trocar agora: o que o jogador pode pagar e o que o cofre pode entregar. */
export function maximoDoCambio(operacao: OperacaoCambio, jogador: Cofre, cofre: Cofre): number {
  const maximo = operacao === 'comprar'
    ? Math.min(Math.floor(jogador.silver / GOLD_CUSTA_SILVER), cofre.gold)
    : Math.min(jogador.gold, Math.floor(cofre.silver / GOLD_VALE_SILVER));
  return Math.max(0, Math.min(CAMBIO_MAX_POR_VEZ, Math.floor(maximo)));
}
