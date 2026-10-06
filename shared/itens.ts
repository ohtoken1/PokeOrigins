// Itens da bolsa. Nomes em inglês, como os golpes.
import { hpMaximo, type PokemonIndividual } from './batalha/pokemon';

export type ItemId = 'pokeball' | 'greatball' | 'ultraball' | 'potion' | 'superpotion' | 'hyperpotion' | 'revive' | 'fullheal';

export interface Item {
  nome: string;
  descricao: string;
  categoria: 'bola' | 'remedio';
  /** Multiplicador de captura (só bolas). */
  bonus?: number;
  /** HP recuperado (remédios de HP). */
  cura?: number;
  reviver?: boolean;
  curaStatus?: boolean;
}

export const ITENS: Record<ItemId, Item> = {
  pokeball: { nome: 'Poké Ball', descricao: 'Bola básica para capturar Pokémon selvagens.', categoria: 'bola', bonus: 1 },
  greatball: { nome: 'Great Ball', descricao: 'Bola com chance de captura maior que a Poké Ball (1,5×).', categoria: 'bola', bonus: 1.5 },
  ultraball: { nome: 'Ultra Ball', descricao: 'Bola de alto desempenho (2×).', categoria: 'bola', bonus: 2 },
  potion: { nome: 'Potion', descricao: 'Recupera 20 HP de um Pokémon.', categoria: 'remedio', cura: 20 },
  superpotion: { nome: 'Super Potion', descricao: 'Recupera 60 HP de um Pokémon.', categoria: 'remedio', cura: 60 },
  hyperpotion: { nome: 'Hyper Potion', descricao: 'Recupera 120 HP de um Pokémon.', categoria: 'remedio', cura: 120 },
  revive: { nome: 'Revive', descricao: 'Revive um Pokémon desmaiado com metade do HP.', categoria: 'remedio', reviver: true },
  fullheal: { nome: 'Full Heal', descricao: 'Cura qualquer problema de status.', categoria: 'remedio', curaStatus: true },
};

export const ITENS_INICIAIS: Record<ItemId, number> = {
  pokeball: 20,
  greatball: 5,
  ultraball: 2,
  potion: 10,
  superpotion: 3,
  hyperpotion: 1,
  revive: 3,
  fullheal: 3,
};

/** Estado mínimo que um remédio precisa ler/alterar (serve para o save e para a batalha). */
export interface AlvoRemedio {
  hp: number;
  hpMax: number;
  status: string | null;
}

/**
 * Calcula o efeito de um remédio. Devolve o novo estado e a mensagem, ou null se não teria efeito
 * (nos jogos o item não é gasto nesse caso).
 */
export function efeitoRemedio(item: Item, alvo: AlvoRemedio, nome: string): { hp: number; status: string | null; mensagem: string } | null {
  if (item.reviver) {
    if (alvo.hp > 0) return null;
    const hp = Math.max(1, Math.floor(alvo.hpMax / 2));
    return { hp, status: null, mensagem: `${nome} foi revivido!` };
  }
  if (alvo.hp <= 0) return null;
  if (item.curaStatus) {
    if (!alvo.status) return null;
    return { hp: alvo.hp, status: null, mensagem: `${nome} foi curado do status!` };
  }
  if (item.cura) {
    if (alvo.hp >= alvo.hpMax) return null;
    const hp = Math.min(alvo.hpMax, alvo.hp + item.cura);
    return { hp, status: alvo.status, mensagem: `${nome} recuperou ${hp - alvo.hp} HP!` };
  }
  return null;
}

/** Usa um remédio num Pokémon fora da batalha. Devolve a mensagem, ou null se não teve efeito. */
export function usarRemedio(item: Item, p: PokemonIndividual, nome: string): string | null {
  const efeito = efeitoRemedio(item, { hp: p.hp, hpMax: hpMaximo(p), status: p.status }, nome);
  if (!efeito) return null;
  p.hp = efeito.hp;
  p.status = efeito.status;
  return efeito.mensagem;
}
