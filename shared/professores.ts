// Professores de golpes (aba "Golpes" da barra do topo):
// - Move Reminder (de graça): golpes que a espécie aprende por nível até o nível atual e todo golpe que aquele
//   Pokémon já soube (TM/TR, Move Tutor, Egg Move).
// - Move Tutor: só os golpes de tutor (fonte "T" do Showdown) de QUALQUER geração, inclusive os das formas
//   anteriores. TMs e Egg Moves NÃO entram (pedido do dono). Scarlet/Violet quase não tem tutor (793 espécies
//   ficariam sem nada), por isso todas as gerações.
import { Dex } from '@pkmn/sim';
import { especie, golpesPorNivel, type PokemonIndividual } from './batalha/pokemon';

/** Move Reminder é de graça (pedido do dono); o Move Tutor cobra em silver. */
export const PRECO_RELEMBRAR = 0;
export const PRECO_TUTOR = 5_000;

const conhece = (p: PokemonIndividual, id: string) => p.golpes.some((g) => g.id === id);
const porNome = (a: string, b: string) => Dex.moves.get(a).name.localeCompare(Dex.moves.get(b).name);

/**
 * Golpes que o Pokémon não sabe agora e pode relembrar: os de nível (nível ≤ atual) e todo golpe que ELE já
 * soube por qualquer caminho (TM/TR, Move Tutor, Egg Move de nascença — `golpesAprendidos`).
 */
export function golpesParaRelembrar(p: PokemonIndividual): string[] {
  const ids = new Set<string>();
  for (const g of golpesPorNivel(p.especieId)) if (g.nivel <= p.nivel && !conhece(p, g.id)) ids.add(g.id);
  for (const id of p.golpesAprendidos ?? []) if (!conhece(p, id) && Dex.moves.get(id).exists) ids.add(id);
  return [...ids].sort(porNome);
}

/** Golpes de tutor que o Pokémon ainda não sabe. */
export function golpesDoTutor(p: PokemonIndividual): string[] {
  return golpesDeTutorDaEspecie(p.especieId).filter((id) => !conhece(p, id));
}

/** Golpes de tutor de qualquer geração da espécie, somando as formas anteriores (também usado na Pokédex). */
export function golpesDeTutorDaEspecie(especieId: number): string[] {
  const learnsetDe = (id: string) => Dex.species.getLearnsetData(id as Parameters<typeof Dex.species.getLearnsetData>[0]).learnset ?? {};
  const ids = new Set<string>();
  // a espécie e as formas anteriores
  for (let s = especie(especieId); s?.exists; s = s.prevo ? Dex.species.get(s.prevo) : (null as never)) {
    for (const [id, origens] of Object.entries(learnsetDe(s.id)))
      if (origens.some((o) => o.endsWith('T')) && Dex.moves.get(id).exists) ids.add(id);
    if (!s.prevo) break;
  }
  return [...ids].sort(porNome);
}
