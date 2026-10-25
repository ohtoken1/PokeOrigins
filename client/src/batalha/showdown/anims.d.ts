// Tipos mínimos do arquivo do Showdown (anims.js).
export interface EfeitoShowdown { url: string; w: number; h: number; y?: number; gen?: number }
export interface AnimShowdown { anim?: (cena: unknown, participantes: unknown[]) => void; prepareAnim?: (cena: unknown, participantes: unknown[]) => void; residualAnim?: unknown }
export const BattleEffects: Record<string, EfeitoShowdown>;
export const BattleOtherAnims: Record<string, AnimShowdown>;
export const BattleStatusAnims: Record<string, AnimShowdown>;
export const BattleMoveAnims: Record<string, AnimShowdown>;
