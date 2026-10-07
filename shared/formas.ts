// Formas que dependem do item segurado (Giratina-Origin com Griseous Core, Arceus-Fire com Flame Plate ou Firium Z,
// Silvally com Memory, Genesect com Drive, Ogerpon com máscara). O simulador do Showdown não troca essas formas
// sozinho (quem faz isso é o validador de times dele), então a batalha já entra com a forma certa.
// Formas "só de batalha" (Primal Kyogre/Groudon, Zacian/Zamazenta-Crowned) o próprio simulador faz.
import { Dex } from '@pkmn/sim';
import { especie } from './batalha/pokemon';
import spritesFormas from './data/formas-sprites.json';

/** Nome da espécie (no Showdown) com que o Pokémon entra na batalha segurando `item`. */
export function especieComItem(especieId: number, item: string | null | undefined): string {
  const base = especie(especieId);
  if (!item) return base.name;
  const nomeItem = Dex.items.get(item).name;
  for (const f of base.otherFormes ?? []) {
    const s = Dex.species.get(f);
    if (s.battleOnly) continue;
    if (s.requiredItem === nomeItem || s.requiredItems?.includes(nomeItem)) return s.name;
  }
  return base.name;
}

/** Arquivo do sprite da forma na PokéAPI ("493-fire", "10007"…), ou null se for a forma normal / sem sprite. */
export function arquivoSpriteForma(forma: string): string | null {
  return (spritesFormas as Record<string, string>)[forma] ?? null;
}
