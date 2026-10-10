// Trem entre as regiões (estação da cidade). O jogador compra o ticket (silver ou gold), escolhe a região e a
// viagem leva tempo: quanto mais longe na ordem das regiões (Kanto … Paldea), mais demora. Quem cobra, marca a
// hora de chegada e troca a região é o servidor (server/src/viagem.ts). Este arquivo não importa nada (o servidor
// também usa).

/** Preço do ticket em cada moeda sem VIP (provisório: 1 para 1, pedido do dono). */
export const PRECO_TICKET: Record<MoedaTicket, number> = { silver: 1, gold: 1 };
export type MoedaTicket = 'silver' | 'gold';
/** Tempo de viagem por região de distância (provisório): Kanto → Johto = 1 trecho, Kanto → Paldea = 8. Vai diminuir com Fly e Surf. */
export const TEMPO_POR_TRECHO_MS = 30_000;
/** VIP (pedido do dono): metade do tempo e metade do preço em SILVER; em gold o preço é o mesmo. */
export const VIP_TEMPO_VIAGEM = 0.5;
export const VIP_PRECO_SILVER = 0.5;
/** Preço do ticket para este jogador (o desconto arredonda para cima: nunca sai de graça). */
export const precoDoTicket = (moeda: MoedaTicket, vip: boolean): number => (vip && moeda === 'silver' ? Math.max(1, Math.ceil(PRECO_TICKET.silver * VIP_PRECO_SILVER)) : PRECO_TICKET[moeda]);

/** Viagem em andamento, guardada no save. As horas são do relógio do servidor. */
export interface Viagem {
  de: string;
  para: string;
  saiuEm: number;
  chegaEm: number;
}

/** Quantas regiões separam as duas (`ordem` = ids das regiões na ordem do jogo); 0 se alguma não existe. */
export function trechosEntre(ordem: string[], de: string, para: string): number {
  const [a, b] = [ordem.indexOf(de), ordem.indexOf(para)];
  return a < 0 || b < 0 ? 0 : Math.abs(a - b);
}
export const tempoDaViagemMs = (ordem: string[], de: string, para: string, vip = false) => Math.round(trechosEntre(ordem, de, para) * TEMPO_POR_TRECHO_MS * (vip ? VIP_TEMPO_VIAGEM : 1));

/** Lê a viagem do save (null se não há ou está estragada). */
export function lerViagem(v: unknown): Viagem | null {
  if (!v || typeof v !== 'object') return null;
  const { de, para, saiuEm, chegaEm } = v as Record<string, unknown>;
  if (typeof de !== 'string' || typeof para !== 'string' || typeof saiuEm !== 'number' || typeof chegaEm !== 'number') return null;
  if (!Number.isFinite(saiuEm) || !Number.isFinite(chegaEm)) return null;
  return { de, para, saiuEm, chegaEm };
}

/** "2:05" (ou "1:02:05" com horas). */
export function textoDoTempo(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const [h, m, seg] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}` : `${m}:${String(seg).padStart(2, '0')}`;
}
