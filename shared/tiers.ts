// Tier de cada Pokémon e de cada Mega. Pedido do dono (18/10/2026): as tiers do Smogon (dex de Scarlet/Violet)
// reduzidas a sete — UBER, OU, UU, RU, NU, NFE e LC; quem estava numa tier que não existe aqui sobe para a de cima
// (UUBL → OU, RUBL → UU, NUBL → RU, PUBL/PU/ZUBL/ZU → NU, AG → UBER). Os números ficam em
// shared/data/tiers-do-jogo.json (`pokemon`: número → tier; `megas`: forma do Showdown → tier).
// Quem não está no link (não existe em Scarlet/Violet, e todas as Megas) usa uma SUGESTÃO PROVISÓRIA — a tier da
// National Dex, reduzida do mesmo jeito — até a staff definir na mão (`tierProvisoria` diz quais são).
import { especie } from './batalha/pokemon';
import dados from './data/tiers-do-jogo.json';

/** Ordem das tiers, da mais forte para a mais fraca (para filtros, ordenação e regras do Torneio). */
export const ORDEM_TIERS = ['UBER', 'OU', 'UU', 'RU', 'NU', 'NFE', 'LC'];

/** Tiers que vêm do link do Smogon (ou que a staff definiu). */
const DO_JOGO = dados as { pokemon: Record<string, string>; megas: Record<string, string> };

const REDUZIR: Record<string, string> = {
  Uber: 'UBER', AG: 'UBER', OU: 'OU', UUBL: 'OU', UU: 'UU', RUBL: 'UU', RU: 'RU', NUBL: 'RU',
  NU: 'NU', PUBL: 'NU', PU: 'NU', ZUBL: 'NU', ZU: 'NU', NFE: 'NFE', LC: 'LC',
};
/** Tier do Smogon/Showdown (com ou sem parênteses) → uma das sete tiers do jogo; '—' quando não tem. */
export const reduzirTier = (tier: string | undefined) => REDUZIR[(tier ?? '').replace(/[()]/g, '')] ?? '—';

/** Sugestão provisória para quem não está no link: a tier do Showdown (ou da National Dex), reduzida. */
export function sugestaoDeTier(s: { tier?: string; natDexTier?: string }): string {
  const tier = !s.tier || s.tier === 'Illegal' ? s.natDexTier : s.tier;
  return reduzirTier(tier);
}

export function tierDoPokemon(numero: number): string {
  return DO_JOGO.pokemon[numero] ?? sugestaoDeTier(especie(numero));
}

/** A tier deste Pokémon ainda é a sugestão provisória (a staff vai definir na mão)? */
export const tierProvisoria = (numero: number) => !DO_JOGO.pokemon[numero];

/** Tier de uma Mega pela forma do Showdown ("Charizard-Mega-X"). */
export const tierDaFormaMega = (forma: string, s: { tier?: string; natDexTier?: string }) => DO_JOGO.megas[forma] ?? sugestaoDeTier(s);
export const tierMegaProvisoria = (forma: string) => !DO_JOGO.megas[forma];
