// Itens que trocam a forma de um Pokémon, como nos jogos oficiais (pedido do dono). Sem imports: só números e ids.
// Todos são gastos no uso (pedido do dono: itens escassos) e NÃO têm volta: só funcionam na forma normal (a primeira
// de cada lista) e a fusão não se separa (o dono vai criar um item de separação depois).

/** Item → listas de formas: a primeira é a normal, as outras são onde o item leva. Com mais de uma, o jogador escolhe. */
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

/** Fusão: o `parceiro` precisa estar no time; ele entra no `base` e fica guardado dentro (ainda não há como separar). */
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

/** Máscaras da Ogerpon: itens de evolução de uso único, só na Ogerpon normal (sem volta; a Teal Mask ficou sem uso). */
export const MASCARAS_OGERPON: Record<string, number> = { tealmask: 1017, wellspringmask: 10273, hearthflamemask: 10274, cornerstonemask: 10275 };
/** Máscara que leva a essa forma da Ogerpon (para a Pokédex), ou undefined. A forma Teal é a espécie normal. */
export const mascaraDaForma = (especieId: number): string | undefined => (especieId === 1017 ? undefined : Object.keys(MASCARAS_OGERPON).find((m) => MASCARAS_OGERPON[m] === especieId));

/** Golpe que a forma aprende ao ser assumida, como nos jogos (os eletrodomésticos do Rotom). Some ao sair da forma. */
export const GOLPE_DA_FORMA: Record<number, string> = { 10008: 'overheat', 10009: 'hydropump', 10010: 'blizzard', 10011: 'airslash', 10012: 'leafstorm' };

/**
 * IV da fusão (pedido do dono): um valor entre o IV de um e o do outro (os dois inclusive). O sorteio usa o número
 * dos dois Pokémon, então o MESMO par dá sempre o mesmo resultado.
 */
export function ivDaFusao(a: number, b: number, uidA: number, uidB: number, indice: number): number {
  const [min, max] = [Math.min(a, b), Math.max(a, b)];
  let h = Math.imul(uidA + 1, 73856093) ^ Math.imul(uidB + 1, 19349663) ^ Math.imul(indice + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return min + (h % (max - min + 1));
}

export const ehItemDeForma = (itemId: string): boolean => itemId in TROCAS_DE_FORMA || itemId in FUSOES;

/** Formas para onde o item leva essa espécie (para o jogador escolher). Só a forma normal muda: não tem volta. */
export function outrasFormas(itemId: string, especieId: number): number[] {
  const roda = (TROCAS_DE_FORMA[itemId] ?? []).find((r) => r[0] === especieId);
  return roda ? roda.slice(1) : [];
}

/** Já está numa forma que este item dá (ou numa fusão dele): o item não desfaz. */
export const jaMudouDeForma = (itemId: string, especieId: number): boolean =>
  (TROCAS_DE_FORMA[itemId] ?? []).some((r) => r.indexOf(especieId) > 0) || (FUSOES[itemId] ?? []).some((f) => f.forma === especieId);

/** Forma normal de quem mudou de forma por item (Deoxys Attack → Deoxys), ou null. Fusões não entram: essas se separam. */
export const formaNormalDe = (especieId: number): number | null =>
  Object.values(TROCAS_DE_FORMA).flat().find((r) => r.indexOf(especieId) > 0)?.[0] ?? null;

/** Para qual forma o item leva essa espécie (a primeira da lista), ou null se o item não serve nela. */
export const proximaForma = (itemId: string, especieId: number): number | null => outrasFormas(itemId, especieId)[0] ?? null;
