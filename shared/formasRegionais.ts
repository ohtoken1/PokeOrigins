// Formas regionais (Alola, Galar, Paldea e Hisui — as de Hisui moram em Kalos, que tem poucos Pokémon: pedido do
// dono). Cada uma vira um "Pokémon" próprio
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
  regiao: 'kanto' | 'johto' | 'hoenn' | 'sinnoh' | 'unova' | 'kalos' | 'alola' | 'galar' | 'paldea';
  nome: string;
  /** Dados da PokéAPI que o Showdown não tem. */
  experienciaBase: number;
  altura: number;
  peso: number;
  evs: Partial<Record<'hp' | 'ataque' | 'defesa' | 'ataqueEspecial' | 'defesaEspecial' | 'velocidade', number>>;
  /** Nome do arquivo de imagem na PokéAPI quando não é o número (letras do Unown: "201-b"). */
  sprite?: string;
  /** Existe no jogo, mas não aparece em mapa, ovo nem conta para a Pokédex de região (ainda sem jeito de obter). */
  foraDosMapas?: boolean;
  /** Só muda a aparência/detalhe da espécie normal: nos mapas divide a chance da MESMA linha (letras do Unown). */
  variante?: boolean;
}

const f = (id: number, showdown: string, slug: string, regiao: FormaRegional['regiao'], nome: string, experienciaBase: number, altura: number, peso: number, evs: FormaRegional['evs'], extra: Pick<FormaRegional, 'sprite' | 'foraDosMapas' | 'variante'> = {}): FormaRegional =>
  ({ id, showdown, slug, regiao, nome, experienciaBase, altura, peso, evs, ...extra });

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
  // Oricorio: as outras três danças (a Baile é a espécie 741); não são regionais, mas entram pelo mesmo caminho
  f(10123, 'Oricorio-Pom-Pom', 'oricorio-pom-pom', 'alola', 'Oricorio (Pom-Pom)', 167, 6, 34, { ataqueEspecial: 2 }),
  f(10124, "Oricorio-Pa'u", 'oricorio-pau', 'alola', "Oricorio (Pa'u)", 167, 6, 34, { ataqueEspecial: 2 }),
  f(10125, 'Oricorio-Sensu', 'oricorio-sensu', 'alola', 'Oricorio (Sensu)', 167, 6, 34, { ataqueEspecial: 2 }),
  // ---- outras formas (não são regionais, mas entram pelo mesmo caminho) ----
  // nos mapas, na região da espécie normal (pedido do dono); `variante` = divide a chance da linha da espécie normal
  f(10004, 'Wormadam-Sandy', 'wormadam-sandy', 'sinnoh', 'Wormadam (Sandy)', 148, 5, 65, { defesa: 2 }),
  f(10005, 'Wormadam-Trash', 'wormadam-trash', 'sinnoh', 'Wormadam (Trash)', 148, 5, 65, { defesa: 1, defesaEspecial: 1 }),
  f(10126, 'Lycanroc-Midnight', 'lycanroc-midnight', 'alola', 'Lycanroc (Midnight)', 170, 11, 250, { ataque: 2 }),
  f(10152, 'Lycanroc-Dusk', 'lycanroc-dusk', 'alola', 'Lycanroc (Dusk)', 170, 8, 250, { ataque: 2 }),
  f(10016, 'Basculin-Blue-Striped', 'basculin-blue-striped', 'unova', 'Basculin (Blue-Striped)', 161, 10, 180, { velocidade: 2 }, { variante: true }),
  f(10247, 'Basculin-White-Striped', 'basculin-white-striped', 'unova', 'Basculin (White-Striped)', 161, 10, 180, { velocidade: 2 }, { variante: true }),
  f(10027, 'Pumpkaboo-Small', 'pumpkaboo-small', 'kalos', 'Pumpkaboo (Small)', 67, 3, 35, { defesa: 1 }, { variante: true }),
  f(10028, 'Pumpkaboo-Large', 'pumpkaboo-large', 'kalos', 'Pumpkaboo (Large)', 67, 5, 75, { defesa: 1 }, { variante: true }),
  f(10029, 'Pumpkaboo-Super', 'pumpkaboo-super', 'kalos', 'Pumpkaboo (Super)', 67, 8, 150, { defesa: 1 }, { variante: true }),
  f(10030, 'Gourgeist-Small', 'gourgeist-small', 'kalos', 'Gourgeist (Small)', 173, 7, 95, { defesa: 2 }),
  f(10031, 'Gourgeist-Large', 'gourgeist-large', 'kalos', 'Gourgeist (Large)', 173, 11, 140, { defesa: 2 }),
  f(10032, 'Gourgeist-Super', 'gourgeist-super', 'kalos', 'Gourgeist (Super)', 173, 17, 390, { defesa: 2 }),
  f(10260, 'Squawkabilly-Blue', 'squawkabilly-blue-plumage', 'paldea', 'Squawkabilly (Blue)', 146, 6, 24, { ataque: 1 }, { variante: true }),
  f(10261, 'Squawkabilly-Yellow', 'squawkabilly-yellow-plumage', 'paldea', 'Squawkabilly (Yellow)', 146, 6, 24, { ataque: 1 }, { variante: true }),
  f(10262, 'Squawkabilly-White', 'squawkabilly-white-plumage', 'paldea', 'Squawkabilly (White)', 146, 6, 24, { ataque: 1 }, { variante: true }),
  f(10025, 'Meowstic-F', 'meowstic-female', 'kalos', 'Meowstic (Fêmea)', 163, 6, 85, { velocidade: 2 }),
  f(10186, 'Indeedee-F', 'indeedee-female', 'galar', 'Indeedee (Fêmea)', 166, 9, 280, { defesaEspecial: 2 }, { variante: true }),
  f(10248, 'Basculegion-F', 'basculegion-female', 'galar', 'Basculegion (Fêmea)', 265, 30, 1100, { hp: 3 }),
  f(10254, 'Oinkologne-F', 'oinkologne-female', 'paldea', 'Oinkologne (Fêmea)', 171, 10, 1200, { hp: 2 }),
  // Unown: as outras 27 letras (a espécie 201 é o "A"); números nossos, a PokéAPI só tem as imagens (201-b…)
  f(20001, 'Unown-B', 'unown-b', 'johto', 'Unown (B)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-b', variante: true }),
  f(20002, 'Unown-C', 'unown-c', 'johto', 'Unown (C)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-c', variante: true }),
  f(20003, 'Unown-D', 'unown-d', 'johto', 'Unown (D)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-d', variante: true }),
  f(20004, 'Unown-E', 'unown-e', 'johto', 'Unown (E)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-e', variante: true }),
  f(20005, 'Unown-F', 'unown-f', 'johto', 'Unown (F)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-f', variante: true }),
  f(20006, 'Unown-G', 'unown-g', 'johto', 'Unown (G)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-g', variante: true }),
  f(20007, 'Unown-H', 'unown-h', 'johto', 'Unown (H)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-h', variante: true }),
  f(20008, 'Unown-I', 'unown-i', 'johto', 'Unown (I)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-i', variante: true }),
  f(20009, 'Unown-J', 'unown-j', 'johto', 'Unown (J)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-j', variante: true }),
  f(20010, 'Unown-K', 'unown-k', 'johto', 'Unown (K)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-k', variante: true }),
  f(20011, 'Unown-L', 'unown-l', 'johto', 'Unown (L)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-l', variante: true }),
  f(20012, 'Unown-M', 'unown-m', 'johto', 'Unown (M)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-m', variante: true }),
  f(20013, 'Unown-N', 'unown-n', 'johto', 'Unown (N)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-n', variante: true }),
  f(20014, 'Unown-O', 'unown-o', 'johto', 'Unown (O)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-o', variante: true }),
  f(20015, 'Unown-P', 'unown-p', 'johto', 'Unown (P)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-p', variante: true }),
  f(20016, 'Unown-Q', 'unown-q', 'johto', 'Unown (Q)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-q', variante: true }),
  f(20017, 'Unown-R', 'unown-r', 'johto', 'Unown (R)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-r', variante: true }),
  f(20018, 'Unown-S', 'unown-s', 'johto', 'Unown (S)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-s', variante: true }),
  f(20019, 'Unown-T', 'unown-t', 'johto', 'Unown (T)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-t', variante: true }),
  f(20020, 'Unown-U', 'unown-u', 'johto', 'Unown (U)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-u', variante: true }),
  f(20021, 'Unown-V', 'unown-v', 'johto', 'Unown (V)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-v', variante: true }),
  f(20022, 'Unown-W', 'unown-w', 'johto', 'Unown (W)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-w', variante: true }),
  f(20023, 'Unown-X', 'unown-x', 'johto', 'Unown (X)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-x', variante: true }),
  f(20024, 'Unown-Y', 'unown-y', 'johto', 'Unown (Y)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-y', variante: true }),
  f(20025, 'Unown-Z', 'unown-z', 'johto', 'Unown (Z)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-z', variante: true }),
  f(20026, 'Unown-Exclamation', 'unown-exclamation', 'johto', 'Unown (!)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-exclamation', variante: true }),
  f(20027, 'Unown-Question', 'unown-question', 'johto', 'Unown (?)', 118, 5, 50, { ataque: 1, ataqueEspecial: 1 }, { sprite: '201-question', variante: true }),
  // cadastradas, mas FORA dos mapas, dos ovos e das Pokédex de região: só pelo Admin até o dono definir como se obtém
f(10191, 'Urshifu-Rapid-Strike', 'urshifu-rapid-strike', 'galar', 'Urshifu (Rapid Strike)', 275, 19, 1050, { ataque: 3 }, { foraDosMapas: true }),
  f(10184, 'Toxtricity-Low-Key', 'toxtricity-low-key', 'galar', 'Toxtricity (Low Key)', 176, 16, 400, { ataqueEspecial: 2 }, { foraDosMapas: true }),
  f(10272, 'Ursaluna-Bloodmoon', 'ursaluna-bloodmoon', 'paldea', 'Ursaluna (Bloodmoon)', 275, 24, 2900, { ataque: 3 }, { foraDosMapas: true }),
  f(10008, 'Rotom-Heat', 'rotom-heat', 'sinnoh', 'Rotom (Heat)', 182, 3, 3, { ataqueEspecial: 1, velocidade: 1 }, { foraDosMapas: true }),
  f(10009, 'Rotom-Wash', 'rotom-wash', 'sinnoh', 'Rotom (Wash)', 182, 3, 3, { ataqueEspecial: 1, velocidade: 1 }, { foraDosMapas: true }),
  f(10010, 'Rotom-Frost', 'rotom-frost', 'sinnoh', 'Rotom (Frost)', 182, 3, 3, { ataqueEspecial: 1, velocidade: 1 }, { foraDosMapas: true }),
  f(10011, 'Rotom-Fan', 'rotom-fan', 'sinnoh', 'Rotom (Fan)', 182, 3, 3, { ataqueEspecial: 1, velocidade: 1 }, { foraDosMapas: true }),
  f(10012, 'Rotom-Mow', 'rotom-mow', 'sinnoh', 'Rotom (Mow)', 182, 3, 3, { ataqueEspecial: 1, velocidade: 1 }, { foraDosMapas: true }),
  f(10001, 'Deoxys-Attack', 'deoxys-attack', 'hoenn', 'Deoxys (Attack)', 270, 17, 608, { ataque: 2, ataqueEspecial: 1 }, { foraDosMapas: true }),
  f(10002, 'Deoxys-Defense', 'deoxys-defense', 'hoenn', 'Deoxys (Defense)', 270, 17, 608, { defesa: 2, defesaEspecial: 1 }, { foraDosMapas: true }),
  f(10003, 'Deoxys-Speed', 'deoxys-speed', 'hoenn', 'Deoxys (Speed)', 270, 17, 608, { velocidade: 3 }, { foraDosMapas: true }),
  f(10006, 'Shaymin-Sky', 'shaymin-sky', 'sinnoh', 'Shaymin (Sky)', 270, 4, 52, { velocidade: 3 }, { foraDosMapas: true }),
  f(10019, 'Tornadus-Therian', 'tornadus-therian', 'unova', 'Tornadus (Therian)', 290, 14, 630, { velocidade: 3 }, { foraDosMapas: true }),
  f(10020, 'Thundurus-Therian', 'thundurus-therian', 'unova', 'Thundurus (Therian)', 290, 30, 610, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10021, 'Landorus-Therian', 'landorus-therian', 'unova', 'Landorus (Therian)', 300, 13, 680, { ataque: 3 }, { foraDosMapas: true }),
  f(10249, 'Enamorus-Therian', 'enamorus-therian', 'galar', 'Enamorus (Therian)', 116, 16, 480, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10022, 'Kyurem-Black', 'kyurem-black', 'unova', 'Black Kyurem', 350, 33, 3250, { ataque: 3 }, { foraDosMapas: true }),
  f(10023, 'Kyurem-White', 'kyurem-white', 'unova', 'White Kyurem', 350, 36, 3250, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10024, 'Keldeo-Resolute', 'keldeo-resolute', 'unova', 'Keldeo (Resolute)', 290, 14, 485, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10181, 'Zygarde-10%', 'zygarde-10', 'kalos', 'Zygarde (10%)', 243, 12, 335, { hp: 3 }, { foraDosMapas: true }),
  f(10086, 'Hoopa-Unbound', 'hoopa-unbound', 'kalos', 'Hoopa (Unbound)', 306, 65, 4900, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10061, 'Floette-Eternal', 'floette-eternal', 'kalos', 'Floette (Eternal)', 243, 2, 9, { defesaEspecial: 2 }, { foraDosMapas: true }),
  f(10116, 'Greninja-Bond', 'greninja-battle-bond', 'kalos', 'Greninja (Battle Bond)', 239, 15, 400, { velocidade: 3 }, { foraDosMapas: true }),
  f(10155, 'Necrozma-Dusk-Mane', 'necrozma-dusk', 'alola', 'Necrozma (Dusk Mane)', 340, 38, 4600, { ataque: 3 }, { foraDosMapas: true }),
  f(10156, 'Necrozma-Dawn-Wings', 'necrozma-dawn', 'alola', 'Necrozma (Dawn Wings)', 340, 42, 3500, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10193, 'Calyrex-Ice', 'calyrex-ice', 'galar', 'Calyrex (Ice Rider)', 340, 24, 8091, { ataque: 3 }, { foraDosMapas: true }),
  f(10194, 'Calyrex-Shadow', 'calyrex-shadow', 'galar', 'Calyrex (Shadow Rider)', 340, 24, 536, { ataqueEspecial: 3 }, { foraDosMapas: true }),
  f(10094, 'Pikachu-Original', 'pikachu-original-cap', 'kanto', 'Pikachu (Original Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10095, 'Pikachu-Hoenn', 'pikachu-hoenn-cap', 'kanto', 'Pikachu (Hoenn Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10096, 'Pikachu-Sinnoh', 'pikachu-sinnoh-cap', 'kanto', 'Pikachu (Sinnoh Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10097, 'Pikachu-Unova', 'pikachu-unova-cap', 'kanto', 'Pikachu (Unova Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10098, 'Pikachu-Kalos', 'pikachu-kalos-cap', 'kanto', 'Pikachu (Kalos Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10099, 'Pikachu-Alola', 'pikachu-alola-cap', 'kanto', 'Pikachu (Alola Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10148, 'Pikachu-Partner', 'pikachu-partner-cap', 'kanto', 'Pikachu (Partner Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10160, 'Pikachu-World', 'pikachu-world-cap', 'kanto', 'Pikachu (World Cap)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10085, 'Pikachu-Cosplay', 'pikachu-cosplay', 'kanto', 'Pikachu (Cosplay)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10080, 'Pikachu-Rock-Star', 'pikachu-rock-star', 'kanto', 'Pikachu (Rock Star)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10081, 'Pikachu-Belle', 'pikachu-belle', 'kanto', 'Pikachu (Belle)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10082, 'Pikachu-Pop-Star', 'pikachu-pop-star', 'kanto', 'Pikachu (Pop Star)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10083, 'Pikachu-PhD', 'pikachu-phd', 'kanto', 'Pikachu (PhD)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10084, 'Pikachu-Libre', 'pikachu-libre', 'kanto', 'Pikachu (Libre)', 112, 4, 60, { velocidade: 2 }, { foraDosMapas: true }),
  f(10252, 'Tauros-Paldea-Aqua', 'tauros-paldea-aqua-breed', 'paldea', 'Paldean Tauros (Aqua Breed)', 172, 14, 1100, { ataque: 2 }),
  f(10253, 'Wooper-Paldea', 'wooper-paldea', 'paldea', 'Paldean Wooper', 42, 4, 110, { hp: 1 }),
  // Hisui (aparecem em Kalos; os três iniciais moram na região do inicial normal: Johto, Unova e Alola; pedido do dono)
  f(10229, 'Growlithe-Hisui', 'growlithe-hisui', 'kalos', 'Hisuian Growlithe', 70, 8, 227, { ataque: 1 }),
  f(10230, 'Arcanine-Hisui', 'arcanine-hisui', 'kalos', 'Hisuian Arcanine', 194, 20, 1680, { ataque: 2 }),
  f(10231, 'Voltorb-Hisui', 'voltorb-hisui', 'kalos', 'Hisuian Voltorb', 66, 5, 130, { velocidade: 1 }),
  f(10232, 'Electrode-Hisui', 'electrode-hisui', 'kalos', 'Hisuian Electrode', 172, 12, 710, { velocidade: 2 }),
  f(10233, 'Typhlosion-Hisui', 'typhlosion-hisui', 'johto', 'Hisuian Typhlosion', 240, 16, 698, { ataqueEspecial: 3 }),
  f(10234, 'Qwilfish-Hisui', 'qwilfish-hisui', 'kalos', 'Hisuian Qwilfish', 88, 5, 39, { ataque: 1 }),
  f(10235, 'Sneasel-Hisui', 'sneasel-hisui', 'kalos', 'Hisuian Sneasel', 86, 9, 270, { velocidade: 1 }),
  f(10236, 'Samurott-Hisui', 'samurott-hisui', 'unova', 'Hisuian Samurott', 238, 15, 582, { ataqueEspecial: 3 }),
  f(10237, 'Lilligant-Hisui', 'lilligant-hisui', 'kalos', 'Hisuian Lilligant', 168, 12, 192, { ataqueEspecial: 2 }),
  f(10238, 'Zorua-Hisui', 'zorua-hisui', 'kalos', 'Hisuian Zorua', 66, 7, 125, { ataqueEspecial: 1 }),
  f(10239, 'Zoroark-Hisui', 'zoroark-hisui', 'kalos', 'Hisuian Zoroark', 179, 16, 730, { ataqueEspecial: 2 }),
  f(10240, 'Braviary-Hisui', 'braviary-hisui', 'kalos', 'Hisuian Braviary', 179, 17, 434, { ataque: 2 }),
  f(10241, 'Sliggoo-Hisui', 'sliggoo-hisui', 'kalos', 'Hisuian Sliggoo', 158, 7, 685, { defesaEspecial: 2 }),
  f(10242, 'Goodra-Hisui', 'goodra-hisui', 'kalos', 'Hisuian Goodra', 270, 17, 3341, { defesaEspecial: 3 }),
  f(10243, 'Avalugg-Hisui', 'avalugg-hisui', 'kalos', 'Hisuian Avalugg', 180, 14, 2624, { defesa: 2 }),
  f(10244, 'Decidueye-Hisui', 'decidueye-hisui', 'alola', 'Hisuian Decidueye', 239, 16, 370, { ataque: 3 }),
];

// Golpes: forma sem lista própria no Showdown (letras do Unown, Basculin listrado, Deoxys…) usa a da espécie normal;
// forma que nasce de outra (`changesFrom`: Rotom-Wash só tem Hydro Pump na lista dela) soma a lista da espécie normal.
{
  type Lista = Record<string, { learnset?: Record<string, string[]> }>;
  const listas = Dex.data.Learnsets as unknown as Lista;
  for (const forma of FORMAS_REGIONAIS) {
    const s = Dex.species.get(forma.showdown);
    const propria = listas[s.id]?.learnset;
    if (propria && !s.changesFrom) continue;
    const origem = listas[Dex.species.get(s.changesFrom || s.baseSpecies).id]?.learnset ?? listas[Dex.species.get(s.baseSpecies).id]?.learnset;
    if (!origem) continue;
    const junta: Record<string, string[]> = { ...origem };
    for (const [golpe, fontes] of Object.entries(propria ?? {})) junta[golpe] = [...(junta[golpe] ?? []), ...fontes];
    listas[s.id] = { ...listas[s.id], learnset: junta };
  }
}

const PORID = new Map(FORMAS_REGIONAIS.map((x) => [x.id, x]));
const ID_POR_NOME = new Map(FORMAS_REGIONAIS.map((x) => [x.showdown, x.id]));

export const formaRegional = (id: number) => PORID.get(id);
export const ehFormaRegional = (id: number) => PORID.has(id);
/** Forma cadastrada que ainda não se obtém jogando (fora de mapas, ovos e Pokédex de região). */
export const foraDosMapas = (id: number) => !!PORID.get(id)?.foraDosMapas;
/** Linha evolutiva que a forma divide nos mapas: o número da espécie normal (Unown-B → 201), ou undefined. */
export const linhaDaVariante = (id: number): number | undefined => (PORID.get(id)?.variante ? Dex.species.get(PORID.get(id)!.showdown).num : undefined);

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
 * Hisuian Lilligant entra aqui (viria do Petilil normal com pedra); as de Hisui que evoluem por nível de uma espécie
 * normal (Typhlosion, Samurott, Decidueye, Braviary, Sliggoo, Avalugg) aparecem em Kalos já no nível da evolução.
 */
export const SEM_PRE_EVOLUCAO = [10100, 10114, 10237];

/** "Poison Point" → "poison-point" (formato das habilidades na PokéAPI). */
const slugHabilidade = (nome: string) => nome.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-');

/**
 * Dados de jogo da forma regional, montados a partir da espécie normal (taxa de captura, crescimento…), do Showdown
 * (tipos, atributos, habilidades, evolução) e da PokéAPI (sprites, XP base, EVs).
 */
export function montarFormaRegional(forma: FormaRegional, normal: PokemonBase, slugDoNumero: (n: number) => string | undefined): PokemonBase {
  const s = Dex.species.get(forma.showdown);
  const b = s.baseStats;
  const sprite = (pasta: string, ext = 'png') => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pasta}${forma.sprite ?? forma.id}.${ext}`;
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
    evoluiDe: prevo && !SEM_PRE_EVOLUCAO.includes(forma.id) ? // forma anterior não cadastrada (Rockruff-Dusk) vale a espécie normal
      (prevo.forme && ID_POR_NOME.has(prevo.name) ? PORID.get(ID_POR_NOME.get(prevo.name)!)!.slug : (slugDoNumero(prevo.num) ?? null)) : null,
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
  // Koraidon e Miraidon entram no mesmo sistema (cubos da Chave Temporal), pedido do dono
  return s.name === 'Koraidon' || s.name === 'Miraidon' || Object.values(s.abilities).some((a) => a === 'Protosynthesis' || a === 'Quark Drive');
}
