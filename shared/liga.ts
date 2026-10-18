// Liga Pokémon (planilha de eventos do dono). Sem imports: o servidor lê este arquivo.
// Normal = Elite 4 + Campeão (5 batalhas seguidas); Nightmare = um treinador de cada um dos 18 tipos.
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
    { chave: 'campeao', padrao: 'Campeão' },
  ],
  nightmare: TIPOS_NIGHTMARE.map((t) => ({ chave: t.toLowerCase(), padrao: `Mestre ${t}` })),
};

export const NOME_LIGA: Record<TipoLiga, string> = { normal: 'Liga Pokémon', nightmare: 'Liga Pokémon Nightmare' };

/** Nível máximo que a staff pode pôr nos Pokémon de cada Liga (o Showdown aceita acima de 100). */
export const NIVEL_MAXIMO_LIGA: Record<TipoLiga, number> = { normal: 100, nightmare: 200 };
export const POKEMON_POR_TIME_LIGA = 6;

/** Prêmios (15/10, provisórios até a loja das League Coins existir). Moeda = saldo do save. */
export const PREMIO_LIGA: Record<TipoLiga, { silver: number; moeda: string; nomeMoeda: string; quantidade: number }> = {
  normal: { silver: 200_000, moeda: 'league-coins', nomeMoeda: 'League Coins', quantidade: 10 },
  nightmare: { silver: 1_000_000, moeda: 'league-coins-nightmare', nomeMoeda: 'League Coins Nightmare', quantidade: 50 },
};

/** A semana da Liga vira na segunda-feira à meia-noite de Brasília (escolha nossa; o dono deixou a gente escolher). */
const SEMANA_MS = 7 * 24 * 3600_000;
const PRIMEIRA_SEGUNDA = Date.UTC(1970, 0, 5, 3); // 05/01/1970 00:00 em Brasília (UTC−3)
export const semanaDaLiga = (agora: number) => Math.floor((agora - PRIMEIRA_SEGUNDA) / SEMANA_MS);
export const fimDaSemanaDaLiga = (agora: number) => PRIMEIRA_SEGUNDA + (semanaDaLiga(agora) + 1) * SEMANA_MS;
