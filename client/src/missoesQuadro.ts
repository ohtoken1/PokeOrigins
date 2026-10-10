// Quadro de missões (regras em shared/missoesQuadro.ts): junta as missões de agora com o que o jogador já fez
// (`save.missoesQuadro`) e confere o Pokémon que ele apresenta no quadro.
import { BIOMAS } from '../../shared/biomas';
import { montarTabela } from '../../shared/encontros';
import { concluidaAindaNoQuadro, cumpreMissao, missoesDoQuadro, recompensaDaMissao, rodadaDe, type MissaoQuadro } from '../../shared/missoesQuadro';
import { REGIOES } from '../../shared/regioes';
import type { PokemonIndividual } from '../../shared/batalha/pokemon';
import { pokemonsDaRegiao, todosOsPokemons } from './dados';
import type { PokemonDoJogador, Save } from './estado';

let comuns: number[] | null = null;
/** Espécies comuns que aparecem soltas em algum mapa (sem inicial, lendário, mítico e Ultra Beast), em ordem de número. */
function especiesComuns(): number[] {
  if (comuns) return comuns;
  const todos = todosOsPokemons();
  const ids = new Set<number>();
  for (const r of REGIOES.filter((x) => x.disponivel))
    for (const bioma of BIOMAS) for (const e of montarTabela(bioma, pokemonsDaRegiao(r.id), [], todos)) if (!e.grupo) ids.add(e.pokemon.id);
  return (comuns = [...ids].sort((a, b) => a - b));
}

export const missoesDeAgora = (agora = Date.now()): MissaoQuadro[] => missoesDoQuadro(agora, especiesComuns());
export const missaoFeita = (save: Save, m: MissaoQuadro) => !!save.missoesQuadro?.feitas.includes(m.id);
/** O quadro DESTE jogador: as concluídas ficam marcadas até o próximo sorteio e depois somem. */
export const missoesDoJogador = (save: Save, agora = Date.now()): MissaoQuadro[] =>
  missoesDeAgora(agora).filter((m) => !missaoFeita(save, m) || concluidaAindaNoQuadro(save.missoesQuadro, m.id, agora));

/** Os Pokémon do jogador (time e PC) da espécie que a missão pede. */
export const candidatosDaMissao = (save: Save, m: MissaoQuadro): PokemonDoJogador[] => [...save.time, ...save.caixa].filter((p) => p.especieId === m.especie);

/**
 * O jogador apresentou um Pokémon dele no quadro (não entrega: continua com ele). Se cumpre a missão, ela fica
 * feita (só uma vez) e o gold entra. Devolve '' se concluiu, ou o motivo de não concluir. Quem chama salva.
 */
export function concluirMissaoCom(save: Save, m: MissaoQuadro, p: PokemonIndividual, agora = Date.now()): string {
  const noQuadro = missoesDeAgora(agora);
  const estado = (save.missoesQuadro ??= { feitas: [] });
  // esquece as que já saíram do quadro
  estado.feitas = estado.feitas.filter((id) => noQuadro.some((x) => x.id === id));
  estado.rodadas = Object.fromEntries(Object.entries(estado.rodadas ?? {}).filter(([id]) => estado.feitas.includes(id)));
  if (!noQuadro.some((x) => x.id === m.id)) return 'Essa missão já saiu do quadro.';
  if (estado.feitas.includes(m.id)) return 'Você já concluiu essa missão.';
  if (![...save.time, ...save.caixa].includes(p as PokemonDoJogador)) return 'Esse Pokémon não é seu.';
  if (!cumpreMissao(m, p)) return p.natureza !== m.natureza ? `Este tem a Nature ${p.natureza}; a missão pede ${m.natureza}.` : 'Este Pokémon não tem o IV ou a qualidade que a missão pede.';
  estado.feitas.push(m.id);
  estado.rodadas[m.id] = rodadaDe(agora);
  save.gold += recompensaDaMissao(m);
  // ranking de missões do quadro
  if (save.estatisticas) save.estatisticas.missoesQuadro = (save.estatisticas.missoesQuadro ?? 0) + 1;
  return '';
}
