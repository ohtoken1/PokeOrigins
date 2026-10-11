// Tier de um Pokémon pela soma dos IVs (0 a 186), pedido do dono:
// S+ 171+, S 145–170, A 120–144, B 95–119, C 94 ou menos. Só aparece depois da avaliação (silver ou gold).
// Sem imports: o servidor também lê este arquivo (mercado negro).

/** Qualquer coisa com os seis IVs (um Pokémon do jogo ou do save guardado no servidor). */
type ComIvs = { ivs: object };

export const TIERS_IV: { tier: string; minimo: number }[] = [
  { tier: 'S+', minimo: 171 },
  { tier: 'S', minimo: 145 },
  { tier: 'A', minimo: 120 },
  { tier: 'B', minimo: 95 },
  { tier: 'C', minimo: 0 },
];

export const somaIvs = (p: ComIvs) => (Object.values(p.ivs) as number[]).reduce((s, v) => s + v, 0);

export function tierIv(p: ComIvs): string {
  const soma = somaIvs(p);
  return (TIERS_IV.find((t) => soma >= t.minimo) ?? TIERS_IV[TIERS_IV.length - 1]).tier;
}

/** Faixa de soma de IVs do tier (para mostrar ao jogador). */
export function faixaDoTier(tier: string): [number, number] {
  const i = TIERS_IV.findIndex((t) => t.tier === tier);
  return [TIERS_IV[i].minimo, i === 0 ? 186 : TIERS_IV[i - 1].minimo - 1];
}

/** Faixas em que um IV avaliado aparece para quem não é VIP (0–5 … 26–31). */
export const FAIXAS_IV: [number, number][] = [[0, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 31]];
export const faixaDoIv = (iv: number): [number, number] => FAIXAS_IV.find(([a, b]) => iv >= a && iv <= b) ?? [iv, iv];
