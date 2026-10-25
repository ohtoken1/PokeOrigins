// Liga Pokémon (planilha de eventos do dono). O servidor lê este arquivo. Prêmios editáveis pela staff: premioLiga().
import { ajustesPremios } from './premiosEventos.ts';
// Normal = Elite 4 (4 batalhas seguidas; o Campeão saiu a pedido do dono, 20/10/2026); Nightmare = um treinador de
// cada um dos 18 tipos.
// Os times são montados pela staff (Administração → Liga), no nível que ela escolher. O time NÃO é curado entre
// as batalhas. Perdeu = só tenta de novo na semana seguinte; venceu = também só na semana seguinte (a chance não acumula).

export type TipoLiga = 'normal' | 'nightmare';

export const TIPOS_NIGHTMARE = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

/** Etapas de cada Liga, em ordem (chave guardada no servidor e nome padrão do treinador). */
export const ETAPAS_LIGA: Record<TipoLiga, { chave: string; padrao: string }[]> = {
  normal: [
    { chave: 'elite1', padrao: 'Elite 4 (1º)' },
    { chave: 'elite2', padrao: 'Elite 4 (2º)' },
    { chave: 'elite3', padrao: 'Elite 4 (3º)' },
    { chave: 'elite4', padrao: 'Elite 4 (4º)' },
  ],
  nightmare: TIPOS_NIGHTMARE.map((t) => ({ chave: t.toLowerCase(), padrao: `Mestre ${t}` })),
};

export const NOME_LIGA: Record<TipoLiga, string> = { normal: 'Liga Pokémon', nightmare: 'Liga Pokémon Nightmare' };

/** Nível máximo que a staff pode pôr nos Pokémon de cada Liga (o Showdown aceita acima de 100). */
export const NIVEL_MAXIMO_LIGA: Record<TipoLiga, number> = { normal: 100, nightmare: 200 };
export const POKEMON_POR_TIME_LIGA = 6;
/** Tempo de cada turno nas batalhas da Liga (pedido do dono: 180 s; o PvP usa 60 s). */
export const TEMPO_TURNO_LIGA_MS = 180_000;
/** Depois de uma vitória, a próxima batalha começa sozinha neste tempo (dá para usar remédios antes). */
export const INTERVALO_LIGA_MS = 3 * 60_000;

/**
 * Prêmios (pedido do dono, 20/10/2026): `porVitoria` moeda a cada treinador vencido e, vencendo todos, mais o `bonus`
 * e os Poké Dólares. Tudo numa carta só, no fim do desafio (derrota ou vitória; server/src/liga.ts → `pagar`). Normal: 4 + 6 = 10; Nightmare: 18 + 12 = 30. `quantidade` = total.
 * Moeda = saldo do save.
 */
export const PREMIO_LIGA: Record<TipoLiga, { silver: number; moeda: string; nomeMoeda: string; porVitoria: number; bonus: number; quantidade: number }> = {
  normal: { silver: 200_000, moeda: 'league-coins', nomeMoeda: 'League Coins', porVitoria: 1, bonus: 6, quantidade: 10 },
  nightmare: { silver: 1_000_000, moeda: 'league-coins-nightmare', nomeMoeda: 'League Coins Nightmare', porVitoria: 1, bonus: 12, quantidade: 30 },
};

/** Prêmio da Liga com o que a staff mudou (Administração → Prêmios); `quantidade` = total vencendo tudo. */
export function premioLiga(liga: TipoLiga): (typeof PREMIO_LIGA)[TipoLiga] {
  const a = ajustesPremios().liga?.[liga];
  const base = PREMIO_LIGA[liga];
  if (!a) return base;
  return { ...base, ...a, quantidade: a.porVitoria * ETAPAS_LIGA[liga].length + a.bonus };
}

/** A semana da Liga vira na segunda-feira à meia-noite de Brasília (escolha nossa; o dono deixou a gente escolher). */
const SEMANA_MS = 7 * 24 * 3600_000;
const PRIMEIRA_SEGUNDA = Date.UTC(1970, 0, 5, 3); // 05/01/1970 00:00 em Brasília (UTC−3)
export const semanaDaLiga = (agora: number) => Math.floor((agora - PRIMEIRA_SEGUNDA) / SEMANA_MS);
export const fimDaSemanaDaLiga = (agora: number) => PRIMEIRA_SEGUNDA + (semanaDaLiga(agora) + 1) * SEMANA_MS;
