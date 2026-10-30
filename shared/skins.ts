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

export type OrigemSkin = 'conquistas' | 'sazonal' | 'inicial' | 'passe';
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
  passe: 'Prêmio do passe de batalha (premium)',
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
  // bônus definido pelo dono (19/10/2026); a arte vem depois
  { id: 'skin-passe-nov26', nome: 'Skin Passe Nov/26', simbolo: '🎫', origem: 'passe', bonus: b(0.02, 0.01, 0.03, 0.02, 0.03) },
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
  /** quantas de cada skin (das que estão em `itens`) o jogador levou para a bolsa, para trocar ou vender */
  skinsNaBolsa?: Record<string, number>;
  /**
   * Quantas unidades de cada item são NT sem ter um id "-nt" próprio (prêmios da trilha grátis do passe: Berries,
   * Apricorns, Energies…). Saem do que pode ser trocado/vendido; o resto do jogo usa o total de `itens`.
   */
  itensNt?: Record<string, number>;
}
const SEM_BONUS: BonusSkin = b(0, 0, 0, 0, 0);

// ---- coleção x bolsa (pedido do dono): a skin mora em Minhas skins; para trocar ou vender, o jogador leva para a
// bolsa. Na bolsa ela é só um item: não dá visual nem bônus. `itens[id]` continua sendo o total das duas.
const inteiroDe = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
/** Quantas desta skin estão na bolsa. */
export const skinsNaBolsa = (s: ComSkins, id: string): number => (ehSkin(id) ? Math.min(inteiroDe(s.itens[id]), inteiroDe(s.skinsNaBolsa?.[id])) : 0);
/** Quantas desta skin estão em Minhas skins (as que valem para visual e bônus). */
export const skinsNaColecao = (s: ComSkins, id: string): number => (ehSkin(id) ? inteiroDe(s.itens[id]) - skinsNaBolsa(s, id) : 0);
/** Quantas unidades deste item são NT pela contagem `itensNt` (nunca mais que o total). */
export const quantidadeNt = (s: ComSkins, id: string): number => Math.min(inteiroDe(s.itens[id]), inteiroDe(s.itensNt?.[id]));
/**
 * O item que um Pokémon segura conta como NT? Os NT são contados por item (`itensNt`), sem dizer qual unidade: se há
 * mais NT anotados do que unidades na bolsa, as que faltam estão equipadas, e o Pokémon não pode sair com elas (pedido
 * do dono: item NT não pode ser trocado). Itens "-nt" e os sempre NT são conferidos à parte (`itemInegociavel`).
 */
export const itemEquipadoNt = (s: ComSkins, id: string): boolean => inteiroDe(s.itensNt?.[id]) > inteiroDe(s.itens[id]);
/** Quanto de um item pode sair em troca ou no mercado: skin, só o que está na bolsa; o resto, o total menos as NT. */
export const quantidadeNegociavel = (s: ComSkins, id: string): number => (ehSkin(id) ? skinsNaBolsa(s, id) : inteiroDe(s.itens[id]) - quantidadeNt(s, id));
/** Soma (ou tira, com número negativo) skins da contagem da bolsa. Chamar DEPOIS de mudar `itens`; outros itens: nada. */
export function contarSkinNaBolsa(s: ComSkins, id: string, quantas: number): void {
  if (!ehSkin(id)) return;
  const bolsa = (s.skinsNaBolsa && typeof s.skinsNaBolsa === 'object' ? s.skinsNaBolsa : (s.skinsNaBolsa = {}));
  const novo = Math.min(inteiroDe(s.itens[id]), Math.max(0, inteiroDe(bolsa[id]) + quantas));
  if (novo > 0) bolsa[id] = novo;
  else delete bolsa[id];
}
/** Leva uma skin da coleção para a bolsa (ou traz de volta). Devolve se mudou. */
export function moverSkin(s: ComSkins, id: string, paraBolsa: boolean): boolean {
  if ((paraBolsa ? skinsNaColecao(s, id) : skinsNaBolsa(s, id)) < 1) return false;
  contarSkinNaBolsa(s, id, paraBolsa ? 1 : -1);
  return true;
}

/** A skin escolhida está na coleção? (pode ter sido trocada com outro jogador ou levada para a bolsa) */
export const temSkin = (s: ComSkins, id: string | null | undefined): id is string => !!id && skinsNaColecao(s, id) > 0;
/** Bônus ativo: o da skin escolhida em `skinBonus` (nada se não escolheu ou não tem mais a skin). */
export const bonusAtivoDaSkin = (s: ComSkins): BonusSkin => (temSkin(s, s.skinBonus) ? bonusDaSkin(s.skinBonus) : SEM_BONUS);
/** Multiplicador de um bônus (1 = sem skin de bônus). */
export const multSkins = (s: ComSkins, chave: ChaveBonusSkin) => 1 + bonusAtivoDaSkin(s)[chave];

/** Nome de cada bônus, na ordem em que aparece. */
export const NOMES_BONUS_SKIN: [ChaveBonusSkin, string][] = [
  ['shiny', 'shiny'],
  ['raros', 'raros'],
  ['silver', 'Poké Dólares'],
  ['captura', 'captura'],
  ['xp', 'XP'],
];
const pct = (v: number) => `+${Math.round(v * 1000) / 10}%`.replace('.', ',');
/** "+1% shiny · +1% raros · +3% silver · +1% captura · +3% XP" (o que é zero não aparece). */
export const textoBonusSkin = (bonus: BonusSkin) => NOMES_BONUS_SKIN.filter(([k]) => bonus[k] > 0).map(([k, nome]) => `${pct(bonus[k])} ${nome}`).join(' · ');
