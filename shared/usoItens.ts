// O que cada tipo de item da bolsa faz num Pokémon: pedras/Linking Cord (evolução),
// TMs/TRs (ensinar golpe) e itens equipáveis (segurar para a batalha).
import { Dex } from '@pkmn/sim';
import { especie, type PokemonIndividual } from './batalha/pokemon';
import { idDaEvolucao } from './formasRegionais';
import { EVOLUCOES_NOSSAS } from './formasPorItem';
import { ABILITY_CAPSULE, ABILITY_PATCH, CABO_DE_LIGACAO, ITENS_DE_SEGURAR_NOSSOS, PEDRAS_EVOLUCAO } from './loja';

/** Ability Capsule e Ability Patch: itens de USAR (o resto da aba Up é de segurar). */
export const ehItemDeHabilidade = (itemId: string) => itemId === ABILITY_CAPSULE || itemId === ABILITY_PATCH;

/**
 * Usa a Ability Capsule (troca entre as duas Abilities normais; em quem está com a Hidden, volta para a primeira normal) ou o Ability Patch (vai para a Hidden Ability; em quem
 * já tem a Hidden, volta para a primeira normal). Devolve se trocou e a frase para o jogador.
 */
export function usarItemDeHabilidade(itemId: string, p: PokemonIndividual, quem: string): { usou: boolean; mensagem: string } {
  const h = especie(p.especieId).abilities;
  const normais = [h['0'], h['1']].filter(Boolean) as string[];
  let nova: string | undefined;
  if (itemId === ABILITY_CAPSULE) {
    // com a Hidden Ability, volta para a primeira normal (pedido do dono)
    if (h.H && p.habilidade === h.H && !normais.includes(h.H)) nova = normais[0];
    else if (normais.length < 2) return { usou: false, mensagem: `${quem} só tem uma Ability normal: a Ability Capsule não tem efeito.` };
    else nova = normais.find((a) => a !== p.habilidade);
  } else {
    if (!h.H) return { usou: false, mensagem: `${quem} não tem Hidden Ability.` };
    nova = p.habilidade === h.H ? normais[0] : h.H;
  }
  if (!nova || nova === p.habilidade) return { usou: false, mensagem: 'Não teria efeito.' };
  p.habilidade = nova;
  return { usou: true, mensagem: `A Ability de ${quem} agora é ${nova}!` };
}

/**
 * Para qual espécie o Pokémon evolui usando o item, ou null.
 * `existe` filtra espécies que o jogo ainda não tem dados (ex.: evoluções de outras regiões).
 */
export function evolucaoPorItem(p: PokemonIndividual, itemId: string, existe: (numero: number) => boolean): number | null {
  // itens de evolução nossos (pergaminhos do Kubfu)
  const nossa = EVOLUCOES_NOSSAS[itemId]?.[p.especieId];
  if (nossa && existe(nossa)) return nossa;
  for (const nome of especie(p.especieId).evos ?? []) {
    const evo = Dex.species.get(nome);
    const id = idDaEvolucao(p.especieId, evo);
    if (id === null || !existe(id)) continue;
    // pedras e itens de evoluir (maçãs, bules, armaduras, Dragon Scale…): usar o item já evolui
    if (itemId !== CABO_DE_LIGACAO && evo.evoItem && Dex.items.get(evo.evoItem).id === itemId) return id;
    if (itemId === CABO_DE_LIGACAO && evo.evoType === 'trade') {
      // troca com item (ex.: Onix + Metal Coat = Steelix): o item precisa estar equipado
      if (!evo.evoItem || Dex.items.get(evo.evoItem).id === p.item) return id;
    }
  }
  return null;
}

/** Se o Pokémon pode aprender o golpe por máquina (TM/TR) em alguma geração. */
export function podeAprenderPorMaquina(p: PokemonIndividual, golpeId: string): boolean {
  const fontes = Dex.species.getLearnsetData(especie(p.especieId).id).learnset?.[golpeId] ?? [];
  return fontes.some((f) => /^\dM$/.test(f));
}

/** Se a espécie aprende o golpe de algum jeito (nível, máquina, tutor, ovo…), em qualquer geração. */
export function especiePodeTerGolpe(especieId: number, golpeId: string): boolean {
  return !!Dex.species.getLearnsetData(especie(especieId).id).learnset?.[golpeId]?.length;
}

/** Item que um Pokémon pode segurar na batalha (itens do Showdown). */
export function ehEquipavel(itemId: string): boolean {
  if (ITENS_DE_SEGURAR_NOSSOS[itemId]) return true;
  const i = Dex.items.get(itemId);
  return i.exists && !i.isPokeball && !PEDRAS_EVOLUCAO.includes(i.id);
}

export function nomeItemEquipado(itemId: string): string {
  if (ITENS_DE_SEGURAR_NOSSOS[itemId]) return ITENS_DE_SEGURAR_NOSSOS[itemId];
  return Dex.items.get(itemId).name || itemId;
}
