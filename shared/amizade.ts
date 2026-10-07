// Amizade (friendship) dos Pokémon: 0 a 255, como nos jogos. Sobe a cada batalha em que o Pokémon entra em campo
// (pedido do dono: +5 por batalha contra selvagem ou treinador NPC). Com amizade alta, quem evolui por amizade
// (Golbat → Crobat, Eevee → Espeon/Umbreon…) evolui ao subir de nível.
import { Dex } from '@pkmn/sim';
import { AMIZADE_INICIAL, especie, type PokemonIndividual } from './batalha/pokemon';

export { AMIZADE_INICIAL };
export const AMIZADE_MAXIMA = 255;
/** Quanto sobe por batalha em que o Pokémon entrou em campo. */
export const AMIZADE_POR_BATALHA = 5;
/** Mínimo para evoluir por amizade (160 desde a 8ª geração; antes era 220). */
export const AMIZADE_PARA_EVOLUIR = 160;

export const amizadeDe = (p: PokemonIndividual): number => p.amizade ?? AMIZADE_INICIAL;

export function ganharAmizade(p: PokemonIndividual, quantidade: number): void {
  p.amizade = Math.max(0, Math.min(AMIZADE_MAXIMA, amizadeDe(p) + quantidade));
}

/** Frase do "medidor de amizade" dos jogos. */
export function textoAmizade(valor: number): string {
  if (valor >= 255) return 'Melhores amigos!';
  if (valor >= 200) return 'Muito apegado a você';
  if (valor >= 150) return 'Gosta muito de você';
  if (valor >= 100) return 'Gosta de você';
  if (valor >= 50) return 'Está se acostumando com você';
  return 'Ainda desconfiado';
}

/** Evolução por amizade ao subir de nível (respeita "de dia"/"à noite" pelo relógio do computador). */
export function evolucaoPorAmizade(p: PokemonIndividual, hora = new Date().getHours()): number | null {
  if (amizadeDe(p) < AMIZADE_PARA_EVOLUIR) return null;
  const dia = hora >= 6 && hora < 18;
  for (const nome of especie(p.especieId).evos ?? []) {
    const evo = Dex.species.get(nome);
    if (evo.evoType !== 'levelFriendship' || evo.evoItem || evo.forme || evo.num <= 0) continue;
    const condicao = evo.evoCondition ?? '';
    if (condicao === 'during the day' && !dia) continue;
    if (condicao === 'at night' && dia) continue;
    if (condicao && condicao !== 'during the day' && condicao !== 'at night') continue;
    return evo.num;
  }
  return null;
}
