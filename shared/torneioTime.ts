// Confere se um time vale para o Torneio (o servidor usa na inscrição e no começo de cada partida; o jogo usa para
// avisar antes). Regras em shared/torneioRegras.ts.
import { especie, type PokemonIndividual } from './batalha/pokemon';
import { megaDaPedra, tierDaMega } from './megas';
import { ORDEM_TIERS, tierDoPokemon } from './tiers';
import { POKEMON_POR_TIME_TORNEIO, NOME_TIER, type RegrasTorneio } from './torneioRegras';

/** Cabe na tier do torneio? Ubers = vale tudo; nas outras, só quem está naquela tier ou abaixo. */
function cabeNaTier(tier: string, limite: RegrasTorneio['tier']): boolean {
  if (limite === 'Uber') return true;
  const i = ORDEM_TIERS.indexOf(tier);
  return i >= 0 && i >= ORDEM_TIERS.indexOf(limite);
}

export function categoriaDoTorneio(especieId: number): 'lendario' | 'mitico' | 'ub' | null {
  const tags = especie(especieId).tags ?? [];
  if (tags.includes('Mythical')) return 'mitico';
  if (tags.includes('Ultra Beast')) return 'ub';
  if (tags.includes('Restricted Legendary') || tags.includes('Sub-Legendary')) return 'lendario';
  return null;
}

/** Problemas do time (lista vazia = pode jogar). `nome` dá o nome de cada Pokémon para as mensagens. */
export function problemasDoTime(time: (PokemonIndividual & { ovo?: unknown })[], regras: RegrasTorneio, nome: (p: PokemonIndividual) => string): string[] {
  const erros: string[] = [];
  if (time.length !== POKEMON_POR_TIME_TORNEIO || time.some((p) => p.ovo)) erros.push(`O time precisa ter ${POKEMON_POR_TIME_TORNEIO} Pokémon (sem ovos).`);
  const especies = new Set<number>();
  const itens = new Set<string>();
  const contagem = { lendario: 0, mitico: 0, ub: 0 };
  for (const p of time) {
    const s = especie(p.especieId);
    if (especies.has(s.num)) erros.push(`Espécie repetida: ${nome(p)}.`);
    especies.add(s.num);
    if (p.item) {
      if (itens.has(p.item)) erros.push(`Item repetido: ${p.item}.`);
      itens.add(p.item);
    }
    if (!cabeNaTier(tierDoPokemon(p.especieId), regras.tier)) erros.push(`${nome(p)} é forte demais para o ${NOME_TIER[regras.tier]} (tier ${tierDoPokemon(p.especieId)}).`);
    // Mega Stone com Mega ligada: a forma Mega também precisa caber
    const mega = p.item ? megaDaPedra(p.item) : undefined;
    if (regras.mecanicas.mega && mega && mega.especie === s.num && !cabeNaTier(tierDaMega(mega), regras.tier)) erros.push(`A ${mega.nome} é forte demais para o ${NOME_TIER[regras.tier]}.`);
    const c = categoriaDoTorneio(p.especieId);
    if (c) contagem[c]++;
  }
  const limite = (n: number, max: number | null, nomeGrupo: string) => max !== null && n > max && erros.push(max === 0 ? `${nomeGrupo} são proibidos neste torneio.` : `No máximo ${max} ${nomeGrupo.toLowerCase()} neste torneio.`);
  limite(contagem.lendario, regras.lendarios, 'Lendários');
  limite(contagem.mitico, regras.miticos, 'Míticos');
  limite(contagem.ub, regras.ub, 'Ultra Beasts');
  return erros;
}
