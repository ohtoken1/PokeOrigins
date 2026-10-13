// Conteúdo do Kit iniciante (definido pelo dono). Sem imports: quando abrir o kit for coisa do servidor, ele lê daqui.

/**
 * Itens fixos do kit: id do item → quantidade. Tudo o que sai do kit é NT (pedido do dono: não dá para criar conta
 * só para passar o kit adiante): as versões "-nt" funcionam igual às normais (shared/naoTrocavel.ts, `semNt`).
 * O silver não tem como ser NT.
 */
export const ITENS_DO_KIT: Record<string, number> = {
  'pokeball-nt': 50,
  'greatball-nt': 30,
  'ultraball-nt': 20,
  'potion-nt': 10,
  'superpotion-nt': 7,
  'hyperpotion-nt': 5,
  'revive-nt': 7,
  'maxrevive-nt': 1,
};
/** Silver que vem no kit. */
export const SILVER_DO_KIT = 20_000;
/** Uma skin sorteada entre as dos iniciais (sempre NT: `SEMPRE_NT`). */
export const SKINS_DO_KIT = ['skin-ash', 'skin-gary', 'skin-may', 'skin-misty'];
/** Um charm sorteado entre os 18 tipos (`charm-<tipo>`). */
export const TIPOS_DE_CHARM_DO_KIT = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

export interface ConteudoDoKit {
  itens: Record<string, number>;
  silver: number;
  skin: string;
  charm: string;
}

/** Sorteia o que sai de um kit (a skin e o charm mudam a cada kit). */
export function sortearKit(aleatorio: () => number = Math.random): ConteudoDoKit {
  const um = <T>(lista: T[]) => lista[Math.floor(aleatorio() * lista.length)];
  const skin = um(SKINS_DO_KIT);
  const charm = `charm-${um(TIPOS_DE_CHARM_DO_KIT)}-nt`;
  return { itens: { ...ITENS_DO_KIT, [skin]: 1, [charm]: 1 }, silver: SILVER_DO_KIT, skin, charm };
}
