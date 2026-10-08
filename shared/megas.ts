// Mega Evolução: lista das Megas (dados do Pokémon Showdown) e das Mega Stones.
// Na batalha, o Pokémon segurando a Mega Stone dele pode megaevoluir uma vez (botão com o símbolo da Mega);
// a forma Mega só existe na batalha: o save guarda sempre a espécie normal.
// Megas de Legends: Z-A também entram (o simulador já tem). Toda Mega precisa da pedra, inclusive o Rayquaza
// (Rayquazite, pedra nossa: nos jogos ele megaevolui só sabendo Dragon Ascent; pedido do dono).
import { Dex } from '@pkmn/sim';
import { arquivoSpriteForma } from './formas';

/** Rayquazite: Mega Stone nossa, colocada nos dados do Showdown igual às outras (o simulador megaevolui com ela). */
export const RAYQUAZITE = 'rayquazite';
const dadosItens = Dex.data.Items as Record<string, object>;
dadosItens[RAYQUAZITE] ??= {
  name: 'Rayquazite',
  num: 30001,
  gen: 6,
  isNonstandard: 'Past',
  megaStone: { Rayquaza: 'Rayquaza-Mega' },
  itemUser: ['Rayquaza'],
  onTakeItem(item: { megaStone?: Record<string, string> }, source: { baseSpecies: { baseSpecies: string } }) {
    return !item.megaStone?.[source.baseSpecies.baseSpecies];
  },
};
/** Pedras nossas: Mega → id da pedra (as do Showdown vêm do `requiredItem`). */
const PEDRAS_NOSSAS: Record<string, string> = { 'Rayquaza-Mega': RAYQUAZITE };

export interface Mega {
  /** Nome da forma no Showdown ("Charizard-Mega-X"). */
  forma: string;
  /** Nome exibido ("Mega Charizard X"). */
  nome: string;
  /** Número da Pokédex da espécie normal. */
  especie: number;
  /** Mega Stone (id do item). */
  pedra: string;
  tipos: string[];
  stats: { hp: number; ataque: number; defesa: number; ataqueEspecial: number; defesaEspecial: number; velocidade: number };
  habilidade: string;
  /** Arquivo do sprite na PokéAPI (ex.: "10034"). */
  sprite: string | null;
  /** Mega de Legends: Z-A (mais nova, ainda sem tier no Smogon). */
  nova: boolean;
}

/** Preço de cada Mega Stone na loja, em gold (pedido do dono). */
export const PRECO_MEGA_STONE_GOLD = 1;

/** "Charizard-Mega-X" → "Mega Charizard X"; "Meowstic-M-Mega" → "Mega Meowstic". */
function nomeMega(forma: string, base: string): string {
  const sufixo = forma.replace(/^.*-Mega-?/, '');
  return `Mega ${base}${sufixo ? ` ${sufixo}` : ''}`;
}

// só as Megas que saem da forma normal da espécie (fica de fora, por exemplo, a de Floette-Eternal,
// Magearna-Original e as Tatsugiri Droopy/Stretchy, formas que o jogo não tem)
export const MEGAS: Mega[] = Dex.species
  .all()
  .filter((s) => s.num > 0 && /-Mega/.test(s.name) && s.isNonstandard !== 'CAP' && s.changesFrom === s.baseSpecies)
  .map((s) => {
    const pedra = PEDRAS_NOSSAS[s.name] ?? Dex.items.get(s.requiredItem ?? '').id;
    const b = s.baseStats;
    return {
      forma: s.name,
      nome: nomeMega(s.name, s.baseSpecies),
      especie: s.num,
      pedra,
      tipos: s.types.map((t) => t.toLowerCase()),
      stats: { hp: b.hp, ataque: b.atk, defesa: b.def, ataqueEspecial: b.spa, defesaEspecial: b.spd, velocidade: b.spe },
      habilidade: s.abilities[0],
      sprite: arquivoSpriteForma(s.name),
      nova: s.isNonstandard === 'Future',
    };
  })
  .sort((a, b) => a.especie - b.especie);

const porForma = new Map(MEGAS.map((m) => [m.forma, m]));
export const megaPorForma = (forma: string) => porForma.get(forma);
export const megasDaEspecie = (especie: number) => MEGAS.filter((m) => m.especie === especie);
/** Ids das Mega Stones que o jogo usa (vão para a loja por gold). */
export const MEGA_STONES = new Set(MEGAS.map((m) => m.pedra));
/** Mega que a pedra faz (a pedra só serve para uma espécie). */
export const megaDaPedra = (pedra: string) => MEGAS.find((m) => m.pedra === pedra);

/** Tier da Mega (Smogon: National Dex; as de Legends: Z-A ainda não têm). */
export function tierDaMega(m: Mega): string {
  const s = Dex.species.get(m.forma);
  const tier = s.tier === 'Illegal' ? s.natDexTier : s.tier;
  return !tier || tier === 'Illegal' ? '—' : tier.replace(/[()]/g, '');
}
