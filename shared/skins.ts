// Skins: o jogador escolhe DUAS coisas separadas (pedido do dono): a skin do visual (`save.skinVisual`; o visual
// entra quando houver arte) e a skin do bônus (`save.skinBonus`). Só vale o bônus da skin escolhida, e só enquanto
// ela estiver na coleção. Os números vêm da planilha do dono ("Bonus Skins PokeOrigins").

/** Frações somadas ao valor normal: 0.02 = +2%. */
export interface BonusSkin {
  /** chance de aparecer shiny */
  shiny: number;
  /** chance de aparecer lendário, mítico, Ultra Beast e inicial */
  raros: number;
  /** silver ganho em batalhas (treinadores e ginásios) */
  silver: number;
  /** chance de captura */
  captura: number;
  /** XP dos Pokémon e do treinador */
  xp: number;
}
export type ChaveBonusSkin = keyof BonusSkin;

const b = (shiny: number, raros: number, silver: number, captura: number, xp: number): BonusSkin => ({ shiny, raros, silver, captura, xp });

/** Skin de lendário (lendário dos tickets próprios). */
export const BONUS_SKIN: BonusSkin = b(0.07, 0.05, 0.07, 0.05, 0.07);
/** Skin de lendário shiny (mítico dos tickets próprios). */
export const BONUS_SKIN_SHINY: BonusSkin = b(0.1, 0.07, 0.1, 0.05, 0.1);

export type OrigemSkin = 'conquistas' | 'sazonal' | 'inicial';
export interface SkinEspecial {
  /** id do item (`skin-<nome>`) */
  id: string;
  nome: string;
  /** desenho provisório do ícone (a arte vem depois) */
  simbolo: string;
  origem: OrigemSkin;
  bonus: BonusSkin;
}
export const TEXTO_ORIGEM_SKIN: Record<OrigemSkin, string> = {
  conquistas: 'Prêmio de conquista (NT: não pode ser trocada)',
  sazonal: 'Evento sazonal',
  inicial: 'Skin inicial',
};

/** Skins que não são de lendário. As "iniciais" ficam só cadastradas até a criação de personagem ser refeita. */
export const SKINS_ESPECIAIS: SkinEspecial[] = [
  { id: 'skin-galante', nome: 'Skin Galante', simbolo: '🎩', origem: 'conquistas', bonus: b(0.01, 0.01, 0.03, 0.01, 0.03) },
  { id: 'skin-chaveiro', nome: 'Skin Chaveiro', simbolo: '🔑', origem: 'conquistas', bonus: b(0.01, 0.01, 0.03, 0.01, 0.03) },
  { id: 'skin-indianajones', nome: 'Skin Indiana Jones', simbolo: '🤠', origem: 'conquistas', bonus: b(0.01, 0.01, 0.03, 0.01, 0.03) },
  { id: 'skin-halloween', nome: 'Skin de Halloween', simbolo: '🎃', origem: 'sazonal', bonus: b(0.03, 0.02, 0.03, 0.02, 0) },
  { id: 'skin-natal', nome: 'Skin de Natal', simbolo: '🎄', origem: 'sazonal', bonus: b(0.02, 0.04, 0.05, 0, 0.05) },
  { id: 'skin-carnaval', nome: 'Skin de Carnaval', simbolo: '🎭', origem: 'sazonal', bonus: b(0.03, 0.03, 0.01, 0.04, 0.02) },
  { id: 'skin-pascoa', nome: 'Skin de Páscoa', simbolo: '🐰', origem: 'sazonal', bonus: b(0.04, 0.03, 0, 0.02, 0.03) },
  { id: 'skin-namorados', nome: 'Skin de Dia dos Namorados', simbolo: '💘', origem: 'sazonal', bonus: b(0.05, 0.04, 0.03, 0.03, 0.03) },
  { id: 'skin-aniversario', nome: 'Skin de Aniversário', simbolo: '🎂', origem: 'sazonal', bonus: b(0.07, 0.05, 0.07, 0.05, 0.1) },
  { id: 'skin-ash', nome: 'Skin Ash', simbolo: '🧢', origem: 'inicial', bonus: b(0.01, 0.01, 0.01, 0.01, 0.01) },
  { id: 'skin-gary', nome: 'Skin Gary', simbolo: '🧢', origem: 'inicial', bonus: b(0.01, 0.01, 0.01, 0.01, 0.01) },
  { id: 'skin-may', nome: 'Skin May', simbolo: '🧢', origem: 'inicial', bonus: b(0.01, 0.01, 0.01, 0.01, 0.01) },
  { id: 'skin-misty', nome: 'Skin Misty', simbolo: '🧢', origem: 'inicial', bonus: b(0.01, 0.01, 0.01, 0.01, 0.01) },
];
const ESPECIAL_POR_ID = new Map(SKINS_ESPECIAIS.map((s) => [s.id, s]));

export const ehSkin = (idItem: string) => idItem.startsWith('skin-');
export const bonusDaSkin = (idItem: string): BonusSkin => ESPECIAL_POR_ID.get(idItem)?.bonus ?? (idItem.endsWith('-shiny') ? BONUS_SKIN_SHINY : BONUS_SKIN);

/** O que o save guarda das skins. */
export interface ComSkins {
  itens: Record<string, number>;
  /** skin escolhida para o visual (id do item) */
  skinVisual?: string | null;
  /** skin de onde vem o bônus (id do item) */
  skinBonus?: string | null;
}
const SEM_BONUS: BonusSkin = b(0, 0, 0, 0, 0);
/** A skin escolhida ainda está na coleção? (pode ter sido trocada com outro jogador) */
export const temSkin = (s: ComSkins, id: string | null | undefined): id is string => !!id && ehSkin(id) && (s.itens[id] ?? 0) > 0;
/** Bônus ativo: o da skin escolhida em `skinBonus` (nada se não escolheu ou não tem mais a skin). */
export const bonusAtivoDaSkin = (s: ComSkins): BonusSkin => (temSkin(s, s.skinBonus) ? bonusDaSkin(s.skinBonus) : SEM_BONUS);
/** Multiplicador de um bônus (1 = sem skin de bônus). */
export const multSkins = (s: ComSkins, chave: ChaveBonusSkin) => 1 + bonusAtivoDaSkin(s)[chave];

/** Nome de cada bônus, na ordem em que aparece. */
export const NOMES_BONUS_SKIN: [ChaveBonusSkin, string][] = [
  ['shiny', 'shiny'],
  ['raros', 'raros'],
  ['silver', 'silver'],
  ['captura', 'captura'],
  ['xp', 'XP'],
];
const pct = (v: number) => `+${Math.round(v * 1000) / 10}%`.replace('.', ',');
/** "+1% shiny · +1% raros · +3% silver · +1% captura · +3% XP" (o que é zero não aparece). */
export const textoBonusSkin = (bonus: BonusSkin) => NOMES_BONUS_SKIN.filter(([k]) => bonus[k] > 0).map(([k, nome]) => `${pct(bonus[k])} ${nome}`).join(' · ');
