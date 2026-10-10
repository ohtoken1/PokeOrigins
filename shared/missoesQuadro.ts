// Quadro de missões da cidade (pedido do dono): a cada 2 horas o jogo sorteia 2 missões novas, iguais para todos.
// Cada missão pede CAPTURAR um Pokémon comum com uma natureza, um IV em 31 e uma qualidade (tier pela soma dos
// IVs). O quadro guarda no máximo 12: as mais antigas saem quando chegam novas. Recompensa em gold, maior nas
// qualidades mais difíceis.
import { Dex } from '@pkmn/sim';
import type { PokemonIndividual } from './batalha/pokemon';
import { TIERS_IV, tierIv } from './tierIv';

/** De quanto em quanto tempo entram missões novas. */
export const INTERVALO_MISSOES_MS = 2 * 60 * 60 * 1000;
export const MISSOES_POR_RODADA = 2;
export const MAXIMO_NO_QUADRO = 12;
/** Recompensa em gold pela qualidade pedida (pedido do dono). */
export const RECOMPENSA_MISSAO_GOLD: Record<string, number> = { C: 1, B: 2, A: 3, S: 4 };
export const recompensaDaMissao = (m: Pick<MissaoQuadro, 'qualidade'>) => RECOMPENSA_MISSAO_GOLD[m.qualidade] ?? 1;

export type AtributoIv = keyof PokemonIndividual['ivs'];
export const NOME_ATRIBUTO_IV: Record<AtributoIv, string> = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
const ATRIBUTOS = Object.keys(NOME_ATRIBUTO_IV) as AtributoIv[];
/** Chance (%) de cada qualidade no sorteio (pedido do dono). S+ não entra: é rara demais. */
export const PESO_QUALIDADE: Record<string, number> = { C: 40, B: 30, A: 20, S: 10 };

export interface MissaoQuadro {
  /** "<rodada>-<posição>": o mesmo para todos os jogadores */
  id: string;
  especie: number;
  natureza: string;
  /** o atributo que precisa ter IV 31 */
  iv: AtributoIv;
  /** tier pela soma dos IVs (shared/tierIv.ts) */
  qualidade: string;
  /** quando entrou no quadro e quando sai (ms) */
  desde: number;
  ate: number;
}

/** Sorteio com semente (mulberry32): a mesma rodada dá as mesmas missões para todo mundo. */
function aleatorioCom(semente: string): () => number {
  let a = 0;
  for (const c of semente) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rodadaDe = (agora: number) => Math.floor(agora / INTERVALO_MISSOES_MS);
/** Quantas rodadas ficam no quadro ao mesmo tempo (12 missões = 6 rodadas de 2: cada missão fica 12 horas). */
const RODADAS_NO_QUADRO = Math.floor(MAXIMO_NO_QUADRO / MISSOES_POR_RODADA);

/**
 * Espécies sem repetir no quadro (pedido do dono): em vez de sortear cada rodada sozinha, o jogo embaralha a lista
 * inteira de comuns e vai gastando 2 por rodada; quando a lista acaba (um "ciclo"), embaralha de novo. Dentro de um
 * ciclo nunca repete. Na virada, as primeiras do ciclo novo que ainda estariam no quadro (as últimas do ciclo
 * anterior) trocam de lugar com outras do meio da lista.
 */
const embaralhadas = new Map<string, number[]>();
function ordemDoCiclo(ciclo: number, comuns: number[]): number[] {
  const chave = `${ciclo}/${comuns.length}`;
  const pronta = embaralhadas.get(chave);
  if (pronta) return pronta;
  const embaralhar = (c: number) => {
    const r = aleatorioCom(`quadro-ciclo-${c}`);
    const lista = [...comuns];
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  };
  const lista = embaralhar(ciclo);
  const K = MAXIMO_NO_QUADRO;
  // só dá para desviar se a lista for bem maior que o quadro (as trocas ficam no meio: o fim da lista não muda)
  if (lista.length >= K * 3) {
    const fimDoAnterior = new Set(embaralhar(ciclo - 1).slice(-K - 1));
    let meio = K;
    for (let i = 0; i < K; i++) {
      if (!fimDoAnterior.has(lista[i])) continue;
      while (meio < lista.length - K - 1 && fimDoAnterior.has(lista[meio])) meio++;
      [lista[i], lista[meio]] = [lista[meio], lista[i]];
      meio++;
    }
  }
  if (embaralhadas.size > 8) embaralhadas.clear();
  embaralhadas.set(chave, lista);
  return lista;
}
/** As espécies (diferentes entre si e das outras do quadro) de uma rodada. */
function especiesDaRodada(rodada: number, comuns: number[]): number[] {
  const porCiclo = Math.floor(comuns.length / MISSOES_POR_RODADA);
  if (porCiclo < 1) return Array.from({ length: MISSOES_POR_RODADA }, () => comuns[0]);
  const ciclo = Math.floor(rodada / porCiclo);
  const posicao = (rodada - ciclo * porCiclo) * MISSOES_POR_RODADA;
  return ordemDoCiclo(ciclo, comuns).slice(posicao, posicao + MISSOES_POR_RODADA);
}

/** As missões de uma rodada. `comuns` = espécies comuns que aparecem soltas nos mapas (sempre na mesma ordem). */
function missoesDaRodada(rodada: number, comuns: number[]): MissaoQuadro[] {
  const r = aleatorioCom(`quadro-${rodada}`);
  const naturezas = Dex.natures.all().map((n) => n.name);
  const totalPeso = TIERS_IV.reduce((s, t) => s + (PESO_QUALIDADE[t.tier] ?? 0), 0);
  const especies = especiesDaRodada(rodada, comuns);
  return Array.from({ length: MISSOES_POR_RODADA }, (_, i) => {
    const especie = especies[i];
    let sorteio = r() * totalPeso;
    let qualidade = TIERS_IV[TIERS_IV.length - 1].tier;
    for (const t of TIERS_IV) {
      sorteio -= PESO_QUALIDADE[t.tier] ?? 0;
      if (sorteio < 0) {
        qualidade = t.tier;
        break;
      }
    }
    return {
      id: `${rodada}-${i}`,
      especie,
      natureza: naturezas[Math.floor(r() * naturezas.length)],
      iv: ATRIBUTOS[Math.floor(r() * ATRIBUTOS.length)],
      qualidade,
      desde: rodada * INTERVALO_MISSOES_MS,
      ate: (rodada + RODADAS_NO_QUADRO) * INTERVALO_MISSOES_MS,
    };
  });
}

/** O quadro agora: no máximo 12 missões, as mais novas primeiro. */
export function missoesDoQuadro(agora: number, comuns: number[]): MissaoQuadro[] {
  if (!comuns.length) return [];
  const atual = rodadaDe(agora);
  return Array.from({ length: RODADAS_NO_QUADRO }, (_, k) => missoesDaRodada(atual - k, comuns)).flat().slice(0, MAXIMO_NO_QUADRO);
}

/** Quando entram as próximas missões (ms). */
export const proximaRodadaEm = (agora: number) => (rodadaDe(agora) + 1) * INTERVALO_MISSOES_MS;

/** O Pokémon capturado cumpre a missão? */
export function cumpreMissao(m: MissaoQuadro, p: Pick<PokemonIndividual, 'especieId' | 'natureza' | 'ivs'>): boolean {
  return p.especieId === m.especie && p.natureza === m.natureza && p.ivs[m.iv] === 31 && tierIv(p) === m.qualidade;
}

/**
 * O que fica no save: as missões já feitas (ids) e em que rodada cada uma foi concluída. A concluída continua no
 * quadro, marcada, até o próximo sorteio; depois some do quadro do jogador (pedido do dono).
 */
export interface EstadoQuadro {
  feitas: string[];
  rodadas?: Record<string, number>;
}
/** A missão concluída ainda aparece no quadro do jogador? (só até entrar a próxima rodada) */
export const concluidaAindaNoQuadro = (estado: EstadoQuadro | undefined, id: string, agora: number): boolean => estado?.rodadas?.[id] === rodadaDe(agora);
