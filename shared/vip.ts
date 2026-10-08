// VIP: um "buff" na conta que dura um tempo (1 dia, 7 dias…) e dá bônus enquanto estiver ativo.
// Os bônus são MULTIPLICADORES em cima do valor normal (pedido do dono): 20% a mais de chance de shiny com
// chance 1/1500 vira 1,2/1500, não 20 pontos percentuais. Quando houver contas/servidor, o prazo fica na conta.

export const DIA_MS = 24 * 60 * 60 * 1000;

/** Multiplicadores do VIP. 1 = sem efeito. */
export const BONUS_VIP = {
  /** silver ganho por vitória (sem bônus por enquanto) */
  silver: 1,
  /** XP de treinador: +20% */
  xpTreinador: 1.2,
  /** XP dos Pokémon: +20% */
  xpPokemon: 1.2,
  /** chance de shiny nos encontros: +20% */
  shiny: 1.2,
  /** chance de lendário, mítico, Ultra Beast e inicial nos encontros: +10% */
  raros: 1.1,
  /** chance de captura: +5% */
  captura: 1.05,
  /** preço das compras em silver na loja: 20% de desconto */
  precoLoja: 0.8,
};
export type BonusVip = keyof typeof BONUS_VIP;

/** Quem tem VIP (hoje o save; no futuro, a conta). `vipAte` = data/hora em que acaba (ms). */
export interface ComVip {
  vipAte?: number | null;
}

export const vipAtivo = (c: ComVip, agora = Date.now()): boolean => (c.vipAte ?? 0) > agora;

/** Soma dias de VIP: se já estiver ativo, estende a partir do fim atual. */
export function adicionarVip(c: ComVip, dias: number, agora = Date.now()): void {
  c.vipAte = Math.max(c.vipAte ?? 0, agora) + dias * DIA_MS;
}

/** Multiplicador de um bônus (1 sem VIP). */
export const bonusVip = (c: ComVip, bonus: BonusVip, agora = Date.now()): number => (vipAtivo(c, agora) ? BONUS_VIP[bonus] : 1);

/** "6d 23h", "5h 12min", "3min". */
export function tempoRestanteVip(c: ComVip, agora = Date.now()): string {
  const resta = Math.max(0, (c.vipAte ?? 0) - agora);
  const min = Math.floor(resta / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${min % 60}min`;
  return `${Math.max(1, min)}min`;
}
