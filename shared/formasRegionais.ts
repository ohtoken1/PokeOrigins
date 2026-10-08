// Formas regionais (Alola, Galar e Paldea; Hisui ainda não, pedido do dono). Cada uma vira um "Pokémon" próprio
// no jogo com o número da PokéAPI (10091 = Alolan Rattata…), dados de batalha do Showdown e sprites da PokéAPI.
// Aparecem nos mapas da região delas; a espécie normal continua na região original.
import { Dex } from '@pkmn/sim';
import type { PokemonBase } from './tipos';

export interface FormaRegional {
  /** Número na PokéAPI (é o especieId no jogo). */
  id: number;
  /** Nome no Showdown. */
  showdown: string;
  /** Nome na PokéAPI (slug). */
  slug: string;
  regiao: 'alola' | 'galar' | 'paldea';
  nome: string;
  /** Dados da PokéAPI que o Showdown não tem. */
  experienciaBase: number;
  altura: number;
  peso: number;
  evs: Partial<Record<'hp' | 'ataque' | 'defesa' | 'ataqueEspecial' | 'defesaEspecial' | 'velocidade', number>>;
}

const f = (id: number, showdown: string, slug: string, regiao: FormaRegional['regiao'], nome: string, experienciaBase: number, altura: number, peso: number, evs: FormaRegional['evs']): FormaRegional =>
  ({ id, showdown, slug, regiao, nome, experienciaBase, altura, peso, evs });

export const FORMAS_REGIONAIS: FormaRegional[] = [
  f(10091, 'Rattata-Alola', 'rattata-alola', 'alola', 'Alolan Rattata', 51, 3, 38, { velocidade: 1 }),
  f(10092, 'Raticate-Alola', 'raticate-alola', 'alola', 'Alolan Raticate', 145, 7, 255, { velocidade: 2 }),
  f(10100, 'Raichu-Alola', 'raichu-alola', 'alola', 'Alolan Raichu', 243, 7, 210, { velocidade: 3 }),
  f(10101, 'Sandshrew-Alola', 'sandshrew-alola', 'alola', 'Alolan Sandshrew', 60, 7, 400, { defesa: 1 }),
  f(10102, 'Sandslash-Alola', 'sandslash-alola', 'alola', 'Alolan Sandslash', 158, 12, 550, { defesa: 2 }),
  f(10103, 'Vulpix-Alola', 'vulpix-alola', 'alola', 'Alolan Vulpix', 60, 6, 99, { velocidade: 1 }),
  f(10104, 'Ninetales-Alola', 'ninetales-alola', 'alola', 'Alolan Ninetales', 177, 11, 199, { velocidade: 2 }),
  f(10105, 'Diglett-Alola', 'diglett-alola', 'alola', 'Alolan Diglett', 53, 2, 10, { velocidade: 1 }),
  f(10106, 'Dugtrio-Alola', 'dugtrio-alola', 'alola', 'Alolan Dugtrio', 149, 7, 666, { ataque: 2 }),
  f(10107, 'Meowth-Alola', 'meowth-alola', 'alola', 'Alolan Meowth', 58, 4, 42, { velocidade: 1 }),
  f(10108, 'Persian-Alola', 'persian-alola', 'alola', 'Alolan Persian', 154, 11, 330, { velocidade: 2 }),
  f(10109, 'Geodude-Alola', 'geodude-alola', 'alola', 'Alolan Geodude', 60, 4, 203, { defesa: 1 }),
  f(10110, 'Graveler-Alola', 'graveler-alola', 'alola', 'Alolan Graveler', 137, 10, 1100, { defesa: 2 }),
  f(10111, 'Golem-Alola', 'golem-alola', 'alola', 'Alolan Golem', 223, 17, 3160, { defesa: 3 }),
  f(10112, 'Grimer-Alola', 'grimer-alola', 'alola', 'Alolan Grimer', 65, 7, 420, { hp: 1 }),
  f(10113, 'Muk-Alola', 'muk-alola', 'alola', 'Alolan Muk', 175, 10, 520, { hp: 1, ataque: 1 }),
  f(10114, 'Exeggutor-Alola', 'exeggutor-alola', 'alola', 'Alolan Exeggutor', 186, 109, 4156, { ataqueEspecial: 2 }),
  f(10115, 'Marowak-Alola', 'marowak-alola', 'alola', 'Alolan Marowak', 149, 10, 340, { defesa: 2 }),
  f(10161, 'Meowth-Galar', 'meowth-galar', 'galar', 'Galarian Meowth', 58, 4, 75, { ataque: 1 }),
  f(10162, 'Ponyta-Galar', 'ponyta-galar', 'galar', 'Galarian Ponyta', 82, 8, 240, { velocidade: 1 }),
  f(10163, 'Rapidash-Galar', 'rapidash-galar', 'galar', 'Galarian Rapidash', 175, 17, 800, { velocidade: 2 }),
  f(10164, 'Slowpoke-Galar', 'slowpoke-galar', 'galar', 'Galarian Slowpoke', 63, 12, 360, { hp: 1 }),
  f(10165, 'Slowbro-Galar', 'slowbro-galar', 'galar', 'Galarian Slowbro', 172, 16, 705, { ataque: 2 }),
  f(10166, 'Farfetch’d-Galar', 'farfetchd-galar', 'galar', 'Galarian Farfetch’d', 132, 8, 420, { ataque: 1 }),
  f(10167, 'Weezing-Galar', 'weezing-galar', 'galar', 'Galarian Weezing', 172, 30, 160, { defesa: 2 }),
  f(10168, 'Mr. Mime-Galar', 'mr-mime-galar', 'galar', 'Galarian Mr. Mime', 161, 14, 568, { velocidade: 2 }),
  f(10169, 'Articuno-Galar', 'articuno-galar', 'galar', 'Galarian Articuno', 290, 17, 509, { ataqueEspecial: 3 }),
  f(10170, 'Zapdos-Galar', 'zapdos-galar', 'galar', 'Galarian Zapdos', 290, 16, 582, { ataque: 3 }),
  f(10171, 'Moltres-Galar', 'moltres-galar', 'galar', 'Galarian Moltres', 290, 20, 660, { defesaEspecial: 3 }),
  f(10172, 'Slowking-Galar', 'slowking-galar', 'galar', 'Galarian Slowking', 172, 18, 795, { defesaEspecial: 2 }),
  f(10173, 'Corsola-Galar', 'corsola-galar', 'galar', 'Galarian Corsola', 144, 6, 5, { defesaEspecial: 1 }),
  f(10174, 'Zigzagoon-Galar', 'zigzagoon-galar', 'galar', 'Galarian Zigzagoon', 56, 4, 175, { velocidade: 1 }),
  f(10175, 'Linoone-Galar', 'linoone-galar', 'galar', 'Galarian Linoone', 147, 5, 325, { velocidade: 2 }),
  f(10176, 'Darumaka-Galar', 'darumaka-galar', 'galar', 'Galarian Darumaka', 63, 7, 400, { ataque: 1 }),
  f(10177, 'Darmanitan-Galar', 'darmanitan-galar-standard', 'galar', 'Galarian Darmanitan', 168, 17, 1200, { ataque: 2 }),
  f(10179, 'Yamask-Galar', 'yamask-galar', 'galar', 'Galarian Yamask', 61, 5, 15, { defesa: 1 }),
  f(10180, 'Stunfisk-Galar', 'stunfisk-galar', 'galar', 'Galarian Stunfisk', 165, 7, 205, { hp: 2 }),
  f(10250, 'Tauros-Paldea-Combat', 'tauros-paldea-combat-breed', 'paldea', 'Paldean Tauros (Combat Breed)', 172, 14, 1150, { ataque: 2 }),
  f(10251, 'Tauros-Paldea-Blaze', 'tauros-paldea-blaze-breed', 'paldea', 'Paldean Tauros (Blaze Breed)', 172, 14, 850, { ataque: 2 }),
  f(10252, 'Tauros-Paldea-Aqua', 'tauros-paldea-aqua-breed', 'paldea', 'Paldean Tauros (Aqua Breed)', 172, 14, 1100, { ataque: 2 }),
  f(10253, 'Wooper-Paldea', 'wooper-paldea', 'paldea', 'Paldean Wooper', 42, 4, 110, { hp: 1 }),
];

const PORID = new Map(FORMAS_REGIONAIS.map((x) => [x.id, x]));
const ID_POR_NOME = new Map(FORMAS_REGIONAIS.map((x) => [x.showdown, x.id]));

export const formaRegional = (id: number) => PORID.get(id);
export const ehFormaRegional = (id: number) => PORID.has(id);

/** Número da espécie na Pokédex nacional (Alolan Rattata → 19). */
export function numeroNaDex(p: Pick<PokemonBase, 'id' | 'numeroDex'>): number {
  return p.numeroDex ?? p.id;
}

/** Espécie do Showdown de uma forma regional, ou null se o número for de uma espécie normal. */
export function especieRegional(id: number) {
  const forma = PORID.get(id);
  return forma ? Dex.species.get(forma.showdown) : null;
}

/** especieId do jogo de um nome do Showdown que seja forma regional (ex.: "Raticate-Alola" → 10092). */
export function idDaFormaRegional(nomeShowdown: string): number | undefined {
  return ID_POR_NOME.get(nomeShowdown);
}

/**
 * Para qual especieId vai uma evolução do Showdown. Forma normal → número dela. Forma regional só quando quem
 * evolui também é forma regional (Alolan Rattata → Alolan Raticate); o Pikachu normal vira o Raichu normal.
 */
export function idDaEvolucao(origem: number, evo: { forme?: string; name: string; num: number }): number | null {
  if (!evo.forme) return evo.num;
  if (!PORID.has(origem)) return null;
  return ID_POR_NOME.get(evo.name) ?? null;
}

/**
 * Formas que nos jogos só nascem evoluindo a espécie normal NA região (Pikachu → Alolan Raichu, Exeggcute → Alolan
 * Exeggutor). Aqui não dá para saber a região da evolução, então valem como Pokémon sem pré-evolução (pedido do dono).
 */
export const SEM_PRE_EVOLUCAO = [10100, 10114];

/** "Poison Point" → "poison-point" (formato das habilidades na PokéAPI). */
const slugHabilidade = (nome: string) => nome.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-');

/**
 * Dados de jogo da forma regional, montados a partir da espécie normal (taxa de captura, crescimento…), do Showdown
 * (tipos, atributos, habilidades, evolução) e da PokéAPI (sprites, XP base, EVs).
 */
export function montarFormaRegional(forma: FormaRegional, normal: PokemonBase, slugDoNumero: (n: number) => string | undefined): PokemonBase {
  const s = Dex.species.get(forma.showdown);
  const b = s.baseStats;
  const sprite = (pasta: string, ext = 'png') => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pasta}${forma.id}.${ext}`;
  const prevo = s.prevo ? Dex.species.get(s.prevo) : null;
  const habilidades = Object.entries(s.abilities).map(([chave, nome]) => ({ nome: slugHabilidade(nome as string), oculta: chave === 'H' }));
  return {
    ...normal,
    id: forma.id,
    numeroDex: normal.id,
    nome: forma.nome,
    slug: forma.slug,
    tipos: s.types.map((t) => t.toLowerCase()),
    stats: { hp: b.hp, ataque: b.atk, defesa: b.def, ataqueEspecial: b.spa, defesaEspecial: b.spd, velocidade: b.spe },
    evsDados: forma.evs,
    altura: forma.altura,
    peso: forma.peso,
    experienciaBase: forma.experienciaBase,
    // evolui de outra forma regional (Alolan Raticate ← Alolan Rattata) ou da espécie normal (Alolan Marowak ← Cubone);
    // as de SEM_PRE_EVOLUCAO contam como primeira forma (aparecem soltas nos mapas)
    evoluiDe: prevo && !SEM_PRE_EVOLUCAO.includes(forma.id) ? (prevo.forme ? (PORID.get(ID_POR_NOME.get(prevo.name) ?? 0)?.slug ?? null) : (slugDoNumero(prevo.num) ?? null)) : null,
    habilidades,
    sprites: {
      frente: sprite(''),
      frenteShiny: sprite('shiny/'),
      costas: sprite('back/'),
      costasShiny: sprite('back/shiny/'),
      gif: sprite('other/showdown/', 'gif'),
      gifShiny: sprite('other/showdown/shiny/', 'gif'),
      gifCostas: sprite('other/showdown/back/', 'gif'),
      gifCostasShiny: sprite('other/showdown/back/shiny/', 'gif'),
    },
  };
}

/**
 * Pokémon Paradox (do passado e do futuro: Great Tusk, Iron Treads…), reconhecidos pela habilidade Protosynthesis /
 * Quark Drive. Existem no jogo (Database, Pokédex), mas não aparecem nos mapas (pedido do dono).
 */
export function ehParadoxo(nomeShowdown: string): boolean {
  const s = Dex.species.get(nomeShowdown);
  return Object.values(s.abilities).some((a) => a === 'Protosynthesis' || a === 'Quark Drive');
}
