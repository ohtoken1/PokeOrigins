// Selo da tier do jogo (shared/tiers.ts), ao lado dos tipos na Pokédex e na ficha do Pokémon (pedido do dono).
// Provisória = sugestão da National Dex até a staff definir (borda tracejada e "*").
import { tierDoPokemon, tierProvisoria } from '../../../shared/tiers';
import { el } from './dom';

export const seloTierDoJogo = (tier: string, provisoria: boolean) =>
  el('span', { class: `selo-tier-jogo tier-${tier.toLowerCase()} ${provisoria ? 'provisoria' : ''}`, title: provisoria ? 'Tier provisória: sugestão da National Dex até a staff definir' : 'Tier do Pokémon no jogo' }, `Tier ${tier}${provisoria ? '*' : ''}`);

/** Selo da tier de uma espécie (número da Pokédex ou forma regional). */
export const seloTierDaEspecie = (numero: number) => seloTierDoJogo(tierDoPokemon(numero), tierProvisoria(numero));
