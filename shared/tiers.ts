// Tier de cada Pokémon. PROVISÓRIO: usa a tier do Smogon/Showdown (9ª geração; quem não existe
// em Scarlet/Violet usa a tier da National Dex) até o dono definir as tiers do jogo em TIERS_DO_JOGO.
import { especie } from './batalha/pokemon';

/** Tiers definidas pelo dono (número da Pokédex → tier). Vazio por enquanto. */
export const TIERS_DO_JOGO: Record<number, string> = {};

/** Ordem das tiers, da mais forte para a mais fraca (para filtros e ordenação). */
export const ORDEM_TIERS = ['Uber', 'OU', 'UUBL', 'UU', 'RUBL', 'RU', 'NUBL', 'NU', 'PUBL', 'PU', 'ZUBL', 'ZU', 'NFE', 'LC'];

export function tierDoPokemon(numero: number): string {
  if (TIERS_DO_JOGO[numero]) return TIERS_DO_JOGO[numero];
  const s = especie(numero);
  const tier = s.tier === 'Illegal' ? s.natDexTier : s.tier;
  return (tier ?? '—').replace(/[()]/g, '');
}
