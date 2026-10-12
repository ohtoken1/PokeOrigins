// PC do jogador: quantas boxes ele tem. Arquivo SEM imports (o servidor também lê).
// Todo jogador começa com BOXES_INICIAIS; cada Box Pokémon usado (item da loja) abre mais uma, até BOXES_MAXIMO.

export const BOXES_INICIAIS = 15;
export const BOXES_MAXIMO = 30;
export const TAMANHO_BOX = 50;
/** Item que abre uma box nova no PC (usado pela bolsa). */
export const BOX_POKEMON = 'boxpokemon';

interface ComBoxes {
  boxesExtras?: number;
  caixa?: { box?: number }[];
}

/**
 * Quantas boxes o jogador tem. Quem já tinha Pokémon guardado além da 15ª (saves de quando eram 30) continua
 * com as boxes que usa: ninguém perde Pokémon.
 */
export function numeroDeBoxes(save: ComBoxes): number {
  const usada = Math.max(-1, ...(save.caixa ?? []).map((p) => p.box ?? 0)) + 1;
  return Math.min(BOXES_MAXIMO, Math.max(BOXES_INICIAIS + Math.max(0, Math.floor(save.boxesExtras ?? 0)), usada));
}

/** Dá para abrir mais uma? */
export const podeAbrirBox = (save: ComBoxes): boolean => numeroDeBoxes(save) < BOXES_MAXIMO;
