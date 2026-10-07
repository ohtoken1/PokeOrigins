// VIP: um "buff" na conta que dura um tempo (1 dia, 7 dias…) e dá bônus enquanto estiver ativo.
// PRÉ-SISTEMA (pedido do dono): os bônus ainda vão ser definidos (BONUS_VIP, hoje tudo 1 = sem efeito)
// e, quando houver contas/servidor, o prazo fica guardado na conta, não no navegador.

export const DIA_MS = 24 * 60 * 60 * 1000;

/** Multiplicadores do VIP (a definir pelo dono). 1 = sem efeito. */
export const BONUS_VIP = {
  /** silver ganho por vitória */
  silver: 1,
  /** XP de treinador */
  xpTreinador: 1,
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
