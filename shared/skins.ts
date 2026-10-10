// Skins: o jogador escolhe DUAS coisas separadas (pedido do dono): a skin do visual (`save.skinVisual`; o visual
// entra quando houver arte) e a skin do bônus (`save.skinBonus`). Só vale o bônus da skin escolhida, e só enquanto
// ela estiver na coleção. Valores provisórios: o dono ajusta aqui.

/** Frações somadas ao valor normal: 0.02 = +2%. */
export interface BonusSkin {
  /** chance de captura */
  captura: number;
  /** chance de aparecer shiny */
  shiny: number;
  /** chance de aparecer lendário, mítico, Ultra Beast e inicial */
  raros: number;
  /** silver ganho em batalhas (treinadores e ginásios) */
  silver: number;
}
export type ChaveBonusSkin = keyof BonusSkin;

/** Skin normal (lendário dos tickets). */
export const BONUS_SKIN: BonusSkin = { captura: 0.01, shiny: 0.02, raros: 0.02, silver: 0.02 };
/** Skin shiny (mítico dos tickets). */
export const BONUS_SKIN_SHINY: BonusSkin = { captura: 0.03, shiny: 0.05, raros: 0.05, silver: 0.05 };

export const ehSkin = (idItem: string) => idItem.startsWith('skin-');
export const bonusDaSkin = (idItem: string): BonusSkin => (idItem.endsWith('-shiny') ? BONUS_SKIN_SHINY : BONUS_SKIN);

/** O que o save guarda das skins. */
export interface ComSkins {
  itens: Record<string, number>;
  /** skin escolhida para o visual (id do item) */
  skinVisual?: string | null;
  /** skin de onde vem o bônus (id do item) */
  skinBonus?: string | null;
}
const SEM_BONUS: BonusSkin = { captura: 0, shiny: 0, raros: 0, silver: 0 };
/** A skin escolhida ainda está na coleção? (pode ter sido trocada com outro jogador) */
export const temSkin = (s: ComSkins, id: string | null | undefined): id is string => !!id && ehSkin(id) && (s.itens[id] ?? 0) > 0;
/** Bônus ativo: o da skin escolhida em `skinBonus` (nada se não escolheu ou não tem mais a skin). */
export const bonusAtivoDaSkin = (s: ComSkins): BonusSkin => (temSkin(s, s.skinBonus) ? bonusDaSkin(s.skinBonus) : SEM_BONUS);
/** Multiplicador de um bônus (1 = sem skin de bônus). */
export const multSkins = (s: ComSkins, chave: ChaveBonusSkin) => 1 + bonusAtivoDaSkin(s)[chave];

const pct = (v: number) => `+${Math.round(v * 1000) / 10}%`.replace('.', ',');
/** "+1% captura · +2% shiny · +2% raros · +2% silver". */
export const textoBonusSkin = (b: BonusSkin) => `${pct(b.captura)} captura · ${pct(b.shiny)} shiny · ${pct(b.raros)} raros · ${pct(b.silver)} silver`;
