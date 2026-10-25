// Missões diárias do passe de batalha no save do jogador (regras em shared/passe.ts).
import { BIOMAS } from '../../shared/biomas';
import { biomaDoPokemon, faixaDosEncontros, montarTabela } from '../../shared/encontros';
import { VERSAO_MISSOES, diaDeHoje, nivelPasse, registrarNaMissao, sortearMissoes, type EstadoPasse, type Missao, type TipoMissao } from '../../shared/passe';
import { temporadaAtual, type TemporadaPasse } from '../../shared/passeTemporadas';
import { itensDoGrupo, type Premio } from '../../shared/tickets';
import { entregar } from './ui/ticket';
import { nivelTreinador } from '../../shared/treinador';
import { pokemonPorId, pokemonsDaRegiao, todosOsPokemons, pokemonsDosMapasDe } from './dados';
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
    for (const e of montarTabela(bioma, pokemonsDosMapasDe(save.regiao), [], todos))
      if (e.grupo === null && e.nivelMin <= max && e.nivelMax >= min) ids.add(e.pokemon.id);
  return [...ids];
}

/** Passe do save com as missões de hoje (sorteia novas quando o dia virou; o XP continua). */
export function passeDeHoje(save: Save): EstadoPasse {
  const hoje = diaDeHoje();
  save.passe ??= { xp: 0, dia: '', missoes: [] };
  // temporada nova: o progresso, o premium e os resgates recomeçam (save sem temporada só adota a de agora)
  const temporada = temporadaAtual();
  if (temporada && save.passe.temporada !== temporada.id) {
    if (save.passe.temporada) {
      save.passe.xp = 0;
      save.passe.premium = false;
    }
    save.passe.temporada = temporada.id;
    save.passe.resgatados = { gratis: [], premium: [] };
  }
  // dia novo, ou missões sorteadas com o formato antigo (ex.: antes da missão de shiny): sorteia de novo
  if (save.passe.dia !== hoje || save.passe.versao !== VERSAO_MISSOES) {
    save.passe.dia = hoje;
    save.passe.versao = VERSAO_MISSOES;
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

// ---------- recompensas da temporada (shared/passeTemporadas.ts) ----------

export type Trilha = 'gratis' | 'premium';

/** Estado de uma casa do passe: 'resgatado', 'pronto' (dá para resgatar), 'trancado' (premium sem o passe) ou 'longe'. */
export function estadoDaCasa(save: Save, trilha: Trilha, nivel: number): 'resgatado' | 'pronto' | 'trancado' | 'longe' {
  const passe = passeDeHoje(save);
  if (passe.resgatados?.[trilha].includes(nivel)) return 'resgatado';
  if (nivelPasse(passe.xp) < nivel) return 'longe';
  if (trilha === 'premium' && !passe.premium) return 'trancado';
  return 'pronto';
}

/** Resgata uma recompensa (quem chama salva). Devolve as frases do que chegou, ou null se não dava. */
export function resgatarDoPasse(save: Save, temporada: TemporadaPasse, trilha: Trilha, nivel: number): string[] | null {
  if (estadoDaCasa(save, trilha, nivel) !== 'pronto') return null;
  const premio: Premio = temporada[trilha][nivel - 1];
  // item aleatório vira um item de verdade; Pokémon sorteia o shiny agora
  const resolvido = premio.tipo === 'aleatorio'
    ? { tipo: 'item' as const, id: ((l) => l[Math.floor(Math.random() * l.length)])(itensDoGrupo(premio.grupo)), quantidade: premio.quantidade }
    : premio;
  const shiny = resolvido.tipo === 'pokemon' && Math.random() < resolvido.chanceShiny;
  const passe = save.passe!;
  passe.resgatados ??= { gratis: [], premium: [] };
  passe.resgatados[trilha].push(nivel);
  // trilha grátis = NT (pedido do dono): não pode ser trocada nem vendida
  return entregar(save, { raridade: 'comum', pacote: [resolvido], shiny: [shiny] }, { nt: trilha === 'gratis' });
}

/** Libera a trilha premium da temporada em vigor (item Passe Premium). Devolve o aviso. */
export function ativarPremium(save: Save): { ok: boolean; texto: string } {
  const temporada = temporadaAtual();
  if (!temporada) return { ok: false, texto: 'Não há temporada do passe em andamento.' };
  const passe = passeDeHoje(save);
  if (passe.premium) return { ok: false, texto: `A trilha premium do ${temporada.nome} já está liberada.` };
  passe.premium = true;
  return { ok: true, texto: `Trilha premium do ${temporada.nome} liberada! Resgate as recompensas no Início.` };
}
