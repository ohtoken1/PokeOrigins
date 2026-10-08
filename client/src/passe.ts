// Missões diárias do passe de batalha no save do jogador (regras em shared/passe.ts).
import { BIOMAS } from '../../shared/biomas';
import { biomaDoPokemon, faixaDosEncontros, montarTabela } from '../../shared/encontros';
import { diaDeHoje, registrarNaMissao, sortearMissoes, type EstadoPasse, type Missao, type TipoMissao } from '../../shared/passe';
import { nivelTreinador } from '../../shared/treinador';
import { pokemonPorId, pokemonsDaRegiao, todosOsPokemons } from './dados';
import type { Save } from './estado';

/**
 * Espécies comuns que o jogador consegue encontrar agora: região atual, qualquer bioma, na faixa de nível natural
 * dele (sem iniciais, lendários, míticos e Ultra Beasts).
 */
function especiesDasMissoes(save: Save): number[] {
  const [min, max] = faixaDosEncontros(BIOMAS[0], nivelTreinador(save.xpTreinador));
  const todos = todosOsPokemons();
  const ids = new Set<number>();
  for (const bioma of BIOMAS)
    for (const e of montarTabela(bioma, pokemonsDaRegiao(save.regiao), [], todos))
      if (e.grupo === null && e.nivelMin <= max && e.nivelMax >= min) ids.add(e.pokemon.id);
  return [...ids];
}

/** Passe do save com as missões de hoje (sorteia novas quando o dia virou; o XP continua). */
export function passeDeHoje(save: Save): EstadoPasse {
  const hoje = diaDeHoje();
  save.passe ??= { xp: 0, dia: '', missoes: [] };
  if (save.passe.dia !== hoje) {
    save.passe.dia = hoje;
    save.passe.missoes = sortearMissoes(hoje, especiesDasMissoes(save));
  }
  return save.passe;
}

/** Conta um progresso nas missões de hoje; devolve as que foram concluídas agora. */
export function contarNasMissoes(save: Save, tipo: TipoMissao, especieId?: number): Missao[] {
  return registrarNaMissao(passeDeHoje(save), tipo, especieId);
}

export function textoMissao(m: Missao): string {
  if (m.tipo === 'shiny') return `Capturar ${m.alvo} Pokémon shiny`;
  if (m.tipo === 'duelo') return `Vencer ${m.alvo} duelos com treinadores`;
  return `${m.tipo === 'derrotar' ? 'Derrotar' : 'Capturar'} ${m.alvo} ${pokemonPorId(m.especieId!).nome}`;
}

/** Onde cumprir a missão (bioma da espécie, ou a dica do tipo). */
export function ondeMissao(m: Missao): string {
  if (m.tipo === 'shiny') return 'qualquer bioma';
  if (m.tipo === 'duelo') return 'Jogar → Duelos com treinadores';
  const id = biomaDoPokemon(pokemonPorId(m.especieId!));
  return BIOMAS.find((b) => b.id === id)?.nome ?? '';
}
