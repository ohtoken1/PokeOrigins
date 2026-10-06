// O que cada tipo de item da bolsa faz num Pokémon: pedras/Linking Cord (evolução),
// TMs/TRs (ensinar golpe) e itens equipáveis (segurar para a batalha).
import { Dex } from '@pkmn/sim';
import { especie, type PokemonIndividual } from './batalha/pokemon';
import { CABO_DE_LIGACAO, PEDRAS_EVOLUCAO } from './loja';

/**
 * Para qual espécie o Pokémon evolui usando o item, ou null.
 * `existe` filtra espécies que o jogo ainda não tem dados (ex.: evoluções de outras regiões).
 */
export function evolucaoPorItem(p: PokemonIndividual, itemId: string, existe: (numero: number) => boolean): number | null {
  for (const nome of especie(p.especieId).evos ?? []) {
    const evo = Dex.species.get(nome);
    if (evo.forme || !existe(evo.num)) continue;
    if (PEDRAS_EVOLUCAO.includes(itemId) && evo.evoType === 'useItem' && Dex.items.get(evo.evoItem ?? '').id === itemId) return evo.num;
    if (itemId === CABO_DE_LIGACAO && evo.evoType === 'trade') {
      // troca com item (ex.: Onix + Metal Coat = Steelix): o item precisa estar equipado
      if (!evo.evoItem || Dex.items.get(evo.evoItem).id === p.item) return evo.num;
    }
  }
  return null;
}

/** Se o Pokémon pode aprender o golpe por máquina (TM/TR) em alguma geração. */
export function podeAprenderPorMaquina(p: PokemonIndividual, golpeId: string): boolean {
  const fontes = Dex.species.getLearnsetData(especie(p.especieId).id).learnset?.[golpeId] ?? [];
  return fontes.some((f) => /^\dM$/.test(f));
}

/** Item que um Pokémon pode segurar na batalha (itens do Showdown). */
export function ehEquipavel(itemId: string): boolean {
  const i = Dex.items.get(itemId);
  return i.exists && !i.isPokeball && !PEDRAS_EVOLUCAO.includes(i.id);
}

export function nomeItemEquipado(itemId: string): string {
  return Dex.items.get(itemId).name || itemId;
}
