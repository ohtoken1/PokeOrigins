// Nome das moedas para o jogador (pedido do dono). No código, no save e no banco de dados continuam `silver` e `gold`:
// silver = Poké Dólar (ganha jogando), gold = Origin Coin (moeda paga). Sem imports: o servidor também lê.
export type Moeda = 'silver' | 'gold';

/** Nome no singular, para rótulos ("Poké Dólar", "Origin Coin"). */
export const NOME_MOEDA: Record<Moeda, string> = { silver: 'Poké Dólar', gold: 'Origin Coin' };

/** Nome para pôr depois de um número: "1 Poké Dólar", "250 Poké Dólares", "3 Origin Coins". */
export const nomeDaMoeda = (moeda: string | undefined, quantidade = 2): string =>
  moeda === 'gold' ? (quantidade === 1 ? 'Origin Coin' : 'Origin Coins') : quantidade === 1 ? 'Poké Dólar' : 'Poké Dólares';
