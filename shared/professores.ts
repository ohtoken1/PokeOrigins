// Professores de golpes (aba "Golpes" da barra do topo):
// - Move Reminder: golpes que a espécie aprende por nível até o nível atual (inclusive os esquecidos).
// - Move Tutor: só os golpes de tutor (fonte "T" do Showdown) de QUALQUER geração, inclusive os das formas
//   anteriores. TMs e Egg Moves NÃO entram (pedido do dono). Scarlet/Violet quase não tem tutor (793 espécies
//   ficariam sem nada), por isso todas as gerações.
import { Dex } from '@pkmn/sim';
import { especie, golpesPorNivel, type PokemonIndividual } from './batalha/pokemon';

/** Preços provisórios (silver) até o dono definir a economia. */
export const PRECO_RELEMBRAR = 50;
export const PRECO_TUTOR = 100;

const conhece = (p: PokemonIndividual, id: string) => p.golpes.some((g) => g.id === id);
const porNome = (a: string, b: string) => Dex.moves.get(a).name.localeCompare(Dex.moves.get(b).name);

/** Golpes por nível que o Pokémon já poderia saber (nível ≤ atual) e não sabe agora. */
export function golpesParaRelembrar(p: PokemonIndividual): string[] {
  const ids = new Set<string>();
  for (const g of golpesPorNivel(p.especieId)) if (g.nivel <= p.nivel && !conhece(p, g.id)) ids.add(g.id);
  return [...ids].sort(porNome);
}

/** Golpes de tutor de qualquer geração da espécie, somando as formas anteriores. */
export function golpesDoTutor(p: PokemonIndividual): string[] {
  const learnsetDe = (id: string) => Dex.species.getLearnsetData(id as Parameters<typeof Dex.species.getLearnsetData>[0]).learnset ?? {};
  const ids = new Set<string>();
  // a espécie e as formas anteriores
  for (let s = especie(p.especieId); s?.exists; s = s.prevo ? Dex.species.get(s.prevo) : (null as never)) {
    for (const [id, origens] of Object.entries(learnsetDe(s.id)))
      if (origens.some((o) => o.endsWith('T')) && Dex.moves.get(id).exists && !conhece(p, id)) ids.add(id);
    if (!s.prevo) break;
  }
  return [...ids].sort(porNome);
}
