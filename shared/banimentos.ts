// Banimento de jogadores (Administração → Banimentos). Sem imports: o servidor também lê.

/** Opções de tempo (pedido do dono). `ms: null` = para sempre. */
export const DURACOES_DE_BANIMENTO: { id: string; nome: string; ms: number | null }[] = [
  { id: '1h', nome: '1 hora', ms: 60 * 60 * 1000 },
  { id: '1d', nome: '1 dia', ms: 24 * 60 * 60 * 1000 },
  { id: '3d', nome: '3 dias', ms: 3 * 24 * 60 * 60 * 1000 },
  { id: '7d', nome: '7 dias', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', nome: '30 dias', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: 'sempre', nome: 'Permanente', ms: null },
];
export const MOTIVO_BANIMENTO_MIN = 3;
export const MOTIVO_BANIMENTO_MAX = 300;

export interface BanimentoPublico {
  id: number;
  usuario: string;
  motivo: string;
  por: string;
  criadoEm: number;
  /** null = para sempre */
  ate: number | null;
  /** quando e por quem foi desfeito antes da hora (null = não foi) */
  revogadoEm: number | null;
  revogadoPor: string | null;
}
