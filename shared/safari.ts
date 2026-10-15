// Safari (evento da cidade): o jogador escolhe um TIPO e atravessa 3 salas só dele. Em cada sala andam 10 Pokémon
// daquele tipo; ele clica em UM para batalhar, os outros 9 somem e a saída de cima abre para a sala seguinte.
// Tickets Safari por dia: 1 grátis, +1 para VIP e +1 que se COMPRA com gold (o "+" da janela). Quem conta e cobra é o servidor
// (server/src/safari.ts). Este arquivo não importa nada (o servidor também usa).

/** Quantas salas tem um Safari e quantos Pokémon andam em cada uma. */
/** Soma mínima dos IVs dos Pokémon do Safari: tier A ou melhor (pedido do dono; shared/tierIv.ts, A = 120+). */
export const IVS_MINIMOS_SAFARI = 120;
export const SALAS_SAFARI = 3;
export const POKEMON_POR_SALA = 10;
/**
 * No Safari as chances de shiny e de raros (inicial, lendário, mítico, Ultra Beast) são 10× as dos mapas, mas
 * SEM somar os bônus do jogador (VIP, Pokédex, skins, charms, conquistas, bonificação): pedido do dono.
 */
export const MULT_RAROS_SAFARI = 10;
/** Preço do ticket extra do dia (provisório, como os outros preços em gold). Vale só no dia da compra. */
export const PRECO_ENTRADA_SAFARI_GOLD = 20;
/** O dia do Safari vira à meia-noite de Brasília (UTC−3). */
const FUSO_SAFARI_MS = -3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
export const diaDoSafari = (agora: number): number => Math.floor((agora + FUSO_SAFARI_MS) / DIA_MS);
/** Quanto falta (ms) para o dia do Safari virar. */
export const faltaParaVirarODia = (agora: number): number => (diaDoSafari(agora) + 1) * DIA_MS - FUSO_SAFARI_MS - agora;

/** Os 18 tipos (como nos dados dos Pokémon: minúsculas, em inglês). */
export const TIPOS_SAFARI = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

/** Cada ticket do dia só pode ser usado uma vez ("gold" = o comprado). */
export type EntradaSafari = 'gratis' | 'vip' | 'gold';

/** Um Pokémon sorteado para uma sala. */
export interface PokemonSafari {
  id: number;
  nivel: number;
  shiny: boolean;
}

/** Safari em andamento. As salas são sorteadas pelo jogo logo depois de entrar e ficam guardadas (recarregar não sorteia de novo). */
export interface SafariAberto {
  tipo: string;
  /** sala atual (0 a SALAS_SAFARI − 1) */
  sala: number;
  /** já batalhou nesta sala (os Pokémon dela sumiram e a saída está aberta) */
  escolhido: boolean;
  salas: PokemonSafari[][];
}

export interface EstadoSafari {
  /** dia (`diaDoSafari`) das entradas usadas */
  dia: number;
  usadas: EntradaSafari[];
  /** comprou o ticket extra de hoje (com gold) */
  comprada?: boolean;
  aberto?: SafariAberto | null;
}

/** Entradas já usadas HOJE (em outro dia, nenhuma). */
export function entradasUsadas(v: unknown, hoje: number): EntradaSafari[] {
  if (!v || typeof v !== 'object') return [];
  const { dia, usadas } = v as Record<string, unknown>;
  if (dia !== hoje || !Array.isArray(usadas)) return [];
  return (['gratis', 'vip', 'gold'] as EntradaSafari[]).filter((e) => usadas.includes(e));
}

/** Já comprou o ticket extra HOJE? */
export function ticketComprado(v: unknown, hoje: number): boolean {
  if (!v || typeof v !== 'object') return false;
  const { dia, comprada } = v as Record<string, unknown>;
  return dia === hoje && comprada === true;
}

/** O próximo ticket que este jogador pode usar hoje (null = acabaram). */
export function proximaEntrada(usadas: EntradaSafari[], vip: boolean, comprada: boolean): EntradaSafari | null {
  if (!usadas.includes('gratis')) return 'gratis';
  if (vip && !usadas.includes('vip')) return 'vip';
  if (comprada && !usadas.includes('gold')) return 'gold';
  return null;
}

/** Tickets de hoje: quantos restam e o total (1, 2 com VIP, +1 se comprou o extra). */
export function ticketsDoDia(usadas: EntradaSafari[], vip: boolean, comprada: boolean): { restam: number; total: number } {
  const tem: EntradaSafari[] = ['gratis', ...(vip ? ['vip' as const] : []), ...(comprada ? ['gold' as const] : [])];
  return { restam: tem.filter((e) => !usadas.includes(e)).length, total: tem.length };
}

/** Lê o Safari em andamento do save (null se não há ou está estragado). */
export function lerSafariAberto(v: unknown): SafariAberto | null {
  const aberto = v && typeof v === 'object' ? (v as Record<string, unknown>).aberto : null;
  if (!aberto || typeof aberto !== 'object') return null;
  const { tipo, sala, escolhido, salas } = aberto as Record<string, unknown>;
  if (typeof tipo !== 'string' || !TIPOS_SAFARI.includes(tipo)) return null;
  if (typeof sala !== 'number' || !Number.isInteger(sala) || sala < 0 || sala >= SALAS_SAFARI) return null;
  return { tipo, sala, escolhido: escolhido === true, salas: Array.isArray(salas) ? (salas as PokemonSafari[][]) : [] };
}
