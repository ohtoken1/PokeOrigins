// Torneio (regras do dono, 15/10/2026). Sem imports: o servidor lê este arquivo.
// Mata-mata de 16, melhor de 1, 60 s por turno, times de 6 sem trava (dá para mudar o time entre as partidas),
// regras clássicas (sem espécie repetida, sem item repetido, Sleep Clause), cada Pokémon no nível que tem.
// 12h30 = regras sorteadas pelo sistema; 18h30 = regras escolhidas pela staff. Entrada 10k, tranca nível 10.

export const HORARIOS_TORNEIO = [
  { hora: 12, minuto: 30, tipo: 'aleatorio' as const },
  { hora: 18, minuto: 30, tipo: 'staff' as const },
];
export const VAGAS_TORNEIO = 16;
export const POKEMON_POR_TIME_TORNEIO = 6;
export const ENTRADA_TORNEIO = 10_000;
/** Inscrição abre 10 min antes, fecha 5 min antes e a disputa começa no horário. */
export const ABRE_ANTES_MS = 10 * 60_000;
export const FECHA_ANTES_MS = 5 * 60_000;
/** Sem 16 inscritos, o fechamento anda de 5 em 5 min, por até 1 h; depois cancela e devolve a entrada. */
export const EXTENSAO_MS = 5 * 60_000;
export const EXTENSAO_MAXIMA_MS = 60 * 60_000;
/** Depois que a inscrição fecha, a disputa começa em 5 min. */
export const ESPERA_INICIO_MS = 5 * 60_000;
/** Pausa entre as rodadas (para trocar o time, se quiser). */
export const PAUSA_ENTRE_RODADAS_MS = 60_000;

export type TierTorneio = 'Uber' | 'OU' | 'UU' | 'RU';
export const TIERS_TORNEIO: TierTorneio[] = ['Uber', 'OU', 'UU', 'RU'];
export const NOME_TIER: Record<TierTorneio, string> = { Uber: 'Ubers', OU: 'OU', UU: 'UU', RU: 'RU' };

export interface MecanicasTorneio { mega: boolean; dynamax: boolean; z: boolean; tera: boolean }
export interface RegrasTorneio {
  tier: TierTorneio;
  /** máximo de lendários, míticos e Ultra Beasts no time (null = sem limite) */
  lendarios: number | null;
  miticos: number | null;
  ub: number | null;
  mecanicas: MecanicasTorneio;
}
export const NOME_MECANICA: Record<keyof MecanicasTorneio, string> = { mega: 'Mega Evolução', dynamax: 'Dynamax', z: 'Z-Move', tera: 'Terastal' };

/** Regras do torneio das 12h30: tudo sorteado. */
export function sortearRegras(aleatorio = Math.random): RegrasTorneio {
  const limite = () => [0, 1, 2, null][Math.floor(aleatorio() * 4)];
  return {
    tier: TIERS_TORNEIO[Math.floor(aleatorio() * TIERS_TORNEIO.length)],
    lendarios: limite(), miticos: limite(), ub: limite(),
    mecanicas: { mega: aleatorio() < 0.5, dynamax: aleatorio() < 0.5, z: aleatorio() < 0.5, tera: aleatorio() < 0.5 },
  };
}

export function textoDasRegras(r: RegrasTorneio): string[] {
  const lim = (n: number | null, nome: string) => (n === null ? `${nome}: sem limite` : n === 0 ? `${nome}: proibidos` : `${nome}: até ${n}`);
  const ligadas = (Object.keys(r.mecanicas) as (keyof MecanicasTorneio)[]).filter((m) => r.mecanicas[m]).map((m) => NOME_MECANICA[m]);
  return [
    `Tier: ${NOME_TIER[r.tier]}${r.tier === 'Uber' ? ' (vale tudo)' : ` (só Pokémon do ${NOME_TIER[r.tier]} para baixo)`}`,
    lim(r.lendarios, 'Lendários'), lim(r.miticos, 'Míticos'), lim(r.ub, 'Ultra Beasts'),
    `Mecânicas: ${ligadas.length ? ligadas.join(', ') : 'nenhuma'}`,
    'Times de 6, sem espécie nem item repetido, Sleep Clause, melhor de 1, 60 s por turno.',
  ];
}

/** Prêmios (15/10). O 1º gira a Roleta do Torneio na hora. */
export const PREMIOS_TORNEIO = [
  { silver: 150_000, gold: 15, roleta: true },
  { silver: 100_000, gold: 10, roleta: false },
  { silver: 50_000, gold: 0, roleta: false },
];
/** Roleta do Torneio (aprovada 15/10): fatias do mesmo tamanho na roda, chances ao lado. */
export const ROLETA_TORNEIO: { id: string; nome: string; chance: number }[] = [
  { id: 'silver', nome: '50.000 Poké Dólares', chance: 0.49 },
  { id: 'mint', nome: 'Mint aleatória', chance: 0.1 },
  { id: 'abilitycapsule', nome: 'Ability Capsule', chance: 0.1 },
  { id: 'abilitypatch', nome: 'Ability Patch', chance: 0.1 },
  { id: 'charm', nome: 'Charm aleatório', chance: 0.05 },
  { id: 'ovo-comum-s', nome: 'Ovo Comum S', chance: 0.05 },
  { id: 'orb', nome: 'Orb aleatória', chance: 0.05 },
  { id: 'fragmentos', nome: '3 Fragmentos Temporais', chance: 0.05 },
  { id: 'chave-temporal', nome: 'Chave Temporal', chance: 0.01 },
];

/** Nomes das rodadas do mata-mata de 16. */
export const NOMES_RODADAS = ['Oitavas de final', 'Quartas de final', 'Semifinais', 'Final e disputa de 3º lugar'];
