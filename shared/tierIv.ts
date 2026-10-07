// Tier de um Pokémon pela soma dos IVs (0 a 186), pedido do dono:
// S+ 171+, S 145–170, A 120–144, B 95–119, C 70–94, D 45–69, E 20–44, F até 19.
import type { PokemonIndividual } from './batalha/pokemon';

export const TIERS_IV: { tier: string; minimo: number }[] = [
  { tier: 'S+', minimo: 171 },
  { tier: 'S', minimo: 145 },
  { tier: 'A', minimo: 120 },
  { tier: 'B', minimo: 95 },
  { tier: 'C', minimo: 70 },
  { tier: 'D', minimo: 45 },
  { tier: 'E', minimo: 20 },
  { tier: 'F', minimo: 0 },
];

export const somaIvs = (p: Pick<PokemonIndividual, 'ivs'>) => Object.values(p.ivs).reduce((s, v) => s + v, 0);

export function tierIv(p: Pick<PokemonIndividual, 'ivs'>): string {
  const soma = somaIvs(p);
  return (TIERS_IV.find((t) => soma >= t.minimo) ?? TIERS_IV[TIERS_IV.length - 1]).tier;
}

/** Faixa de soma de IVs do tier (para mostrar ao jogador). */
export function faixaDoTier(tier: string): [number, number] {
  const i = TIERS_IV.findIndex((t) => t.tier === tier);
  return [TIERS_IV[i].minimo, i === 0 ? 186 : TIERS_IV[i - 1].minimo - 1];
}
