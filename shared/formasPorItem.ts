// Itens que trocam a forma de um Pokémon, como nos jogos oficiais (pedido do dono). Sem imports: só números e ids.
// Os itens-chave NÃO são gastos (dá para ir e voltar); os pergaminhos do Kubfu são de evolução e são gastos.

/** Item-chave → listas de formas em roda: cada uso passa para a próxima (a última volta para a primeira). */
export const TROCAS_DE_FORMA: Record<string, number[][]> = {
  // Tornadus, Thundurus, Landorus, Enamorus: Incarnate ↔ Therian
  revealglass: [[641, 10019], [642, 10020], [645, 10021], [905, 10249]],
  // Hoopa: Confined ↔ Unbound
  prisonbottle: [[720, 10086]],
  // Shaymin: Land ↔ Sky
  gracidea: [[492, 10006]],
  // Deoxys: Normal → Attack → Defense → Speed → Normal
  meteorite: [[386, 10001, 10002, 10003]],
  // Rotom: normal → Heat → Wash → Frost → Fan → Mow → normal
  rotomcatalog: [[479, 10008, 10009, 10010, 10011, 10012]],
  // Zygarde: 50% ↔ 10%
  zygardecube: [[718, 10181]],
};

/** Fusão: o `parceiro` precisa estar no time; ele entra no `base` (fica guardado dentro) e volta ao separar. */
export interface Fusao {
  base: number;
  parceiro: number;
  forma: number;
}
export const FUSOES: Record<string, Fusao[]> = {
  // Kyurem + Zekrom = Black Kyurem; Kyurem + Reshiram = White Kyurem
  dnasplicers: [{ base: 646, parceiro: 644, forma: 10022 }, { base: 646, parceiro: 643, forma: 10023 }],
  // Necrozma + Solgaleo = Dusk Mane; Necrozma + Lunala = Dawn Wings
  nsolarizer: [{ base: 800, parceiro: 791, forma: 10155 }],
  nlunarizer: [{ base: 800, parceiro: 792, forma: 10156 }],
  // Calyrex + Glastrier = Ice Rider; Calyrex + Spectrier = Shadow Rider
  reinsofunity: [{ base: 898, parceiro: 896, forma: 10193 }, { base: 898, parceiro: 897, forma: 10194 }],
};

/** Evoluções por item que o Showdown não conhece (item → de qual espécie → para qual). O item é gasto. */
export const EVOLUCOES_NOSSAS: Record<string, Record<number, number>> = {
  scrollofdarkness: { 891: 892 }, // Kubfu → Urshifu (Single Strike)
  scrollofwaters: { 891: 10191 }, // Kubfu → Urshifu (Rapid Strike)
};

/** Golpe que a forma aprende ao ser assumida, como nos jogos (os eletrodomésticos do Rotom). Some ao sair da forma. */
export const GOLPE_DA_FORMA: Record<number, string> = { 10008: 'overheat', 10009: 'hydropump', 10010: 'blizzard', 10011: 'airslash', 10012: 'leafstorm' };

export const ehItemDeForma = (itemId: string): boolean => itemId in TROCAS_DE_FORMA || itemId in FUSOES;

/** Para qual forma o item leva essa espécie (a próxima da roda), ou null se o item não serve nela. */
export function proximaForma(itemId: string, especieId: number): number | null {
  for (const roda of TROCAS_DE_FORMA[itemId] ?? []) {
    const i = roda.indexOf(especieId);
    if (i >= 0) return roda[(i + 1) % roda.length];
  }
  return null;
}
