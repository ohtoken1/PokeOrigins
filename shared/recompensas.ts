// Recompensas de login e de doação acumulada (pedido do dono, 19/10/2026). Sem imports: o servidor lê.
// Quem decide é o SERVIDOR (server/src/recompensas.ts): conta os dias de login, manda os prêmios pelo Correio e soma
// as doações. Os prêmios são provisórios ("depois a gente vê caso a caso").
// A staff pode trocar os prêmios em Administração → Prêmios (shared/premiosEventos.ts): use as funções premiosLogin()…
import { ajustesPremios } from './premiosEventos.ts';

export type PremioRecompensa = { id: string; nome: string; quantidade: number };
const p = (id: string, nome: string, quantidade = 1): PremioRecompensa => ({ id, nome, quantidade });

/** Login das contas novas: os 7 primeiros dias da conta (dia da criação + 6, horário de Brasília). */
export const DIAS_LOGIN = 7;
/** Login dos 30 dias: os 30 primeiros dias do servidor (o dia em que a primeira conta foi criada). */
export const DIAS_LOGIN_TRINTA = 30;
/** Começo do Login dos 30 dias ("2026-11-01"); null = o dia da primeira conta do servidor (pedido do dono). */
export const INICIO_LOGIN_TRINTA: string | null = null;
/** VIP pode recuperar até 3 prêmios de dias que perdeu (pedido do dono). */
export const RECUPERACOES_VIP = 3;

/**
 * Login (7 dias, conta nova): cada dia em que o jogador entra, anda uma casinha e ganha o PRÓXIMO prêmio da lista.
 * Todos NT (pedido do dono): item com versão "-nt" sai nela; os outros contam em `save.itensNt` no servidor.
 */
export const PREMIOS_LOGIN_PADRAO: PremioRecompensa[][] = [
  [p('ultraball-nt', 'Ultra Ball (NT)', 20)],
  [p('silver', 'Poké Dólares', 30_000)],
  [p('abilitycapsule', 'Ability Capsule')],
  [p('chave-temporal', 'Chave Temporal')],
  [p('boxpokemon', 'Box Pokémon')],
  [p('abilitypatch', 'Ability Patch')],
  [p('ovo-comum-s-nt', 'Ovo Comum S (NT)')],
];

/**
 * Login dos 30 dias (os 30 primeiros dias do servidor): cada dia do calendário tem o seu prêmio; quem entra naquele
 * dia pega o prêmio dele, quem não entra perde (VIP recupera até 3). Também tudo NT. Itens comuns em quantidade;
 * raros escassos (pedido do dono): só UMA Chave Temporal (dia 14), uma Ability Capsule e uma Ability Patch.
 */
export const PREMIOS_LOGIN_TRINTA_PADRAO: PremioRecompensa[][] = [
  [p('greatball-nt', 'Great Ball (NT)', 30)], // 1
  [p('superpotion-nt', 'Super Potion (NT)', 20)], // 2
  [p('ultraball-nt', 'Ultra Ball (NT)', 20)], // 3
  [p('revive-nt', 'Revive (NT)', 10)], // 4
  [p('hyperpotion-nt', 'Hyper Potion (NT)', 20)], // 5
  [p('maxrevive-nt', 'Max Revive (NT)', 3)], // 6
  [p('ovo-inicial-nt', 'Ovo Inicial (NT)')], // 7
  [p('greatball-nt', 'Great Ball (NT)', 30)], // 8
  [p('superpotion-nt', 'Super Potion (NT)', 20)], // 9
  [p('abilitycapsule', 'Ability Capsule')], // 10
  [p('hyperpotion-nt', 'Hyper Potion (NT)', 20)], // 11
  [p('revive-nt', 'Revive (NT)', 10)], // 12
  [p('ultraball-nt', 'Ultra Ball (NT)', 20)], // 13
  [p('chave-temporal', 'Chave Temporal')], // 14
  [p('greatball-nt', 'Great Ball (NT)', 30)], // 15
  [p('maxrevive-nt', 'Max Revive (NT)', 3)], // 16
  [p('hyperpotion-nt', 'Hyper Potion (NT)', 20)], // 17
  [p('ultraball-nt', 'Ultra Ball (NT)', 20)], // 18
  [p('revive-nt', 'Revive (NT)', 10)], // 19
  [p('superpotion-nt', 'Super Potion (NT)', 20)], // 20
  [p('ovo-comum-s-nt', 'Ovo Comum S (NT)')], // 21
  [p('ultraball-nt', 'Ultra Ball (NT)', 20)], // 22
  [p('maxrevive-nt', 'Max Revive (NT)', 5)], // 23
  [p('hyperpotion-nt', 'Hyper Potion (NT)', 20)], // 24
  [p('abilitypatch', 'Ability Patch')], // 25
  [p('greatball-nt', 'Great Ball (NT)', 30)], // 26
  [p('revive-nt', 'Revive (NT)', 10)], // 27
  [p('ovo-misterioso-s-nt', 'Ovo Misterioso S (NT)')], // 28
  [p('ultraball-nt', 'Ultra Ball (NT)', 20)], // 29
  [p('ovo-lendario-nt', 'Ovo Lendário (NT)')], // 30
];

/**
 * Doação acumulada: total de Origin Coins doadas no TRIMESTRE (zera a cada 3 meses: jan–mar, abr–jun, jul–set,
 * out–dez, horário de Brasília). Ao passar de cada meta, o servidor manda o prêmio pelo Correio.
 * Metas e prêmios: planilha do dono (20/10/2026). `mint` e `charm` = sorteados pelo servidor, um por unidade.
 */
export const METAS_DOACAO_PADRAO: { gold: number; premios: PremioRecompensa[] }[] = [
  { gold: 500, premios: [p('mint', 'Mint aleatória', 1), p('ovo-inicial', 'Ovo Inicial'), p('abilitycapsule', 'Ability Capsule', 1), p('seletor-orb-1', 'Seletor de Orb 1', 5)] },
  { gold: 1000, premios: [p('mint', 'Mint aleatória', 1), p('ovo-inicial', 'Ovo Inicial'), p('abilitypatch', 'Ability Patch', 1), p('ovo-lendario', 'Ovo Lendário', 1), p('masterball', 'Master Ball', 1), p('seletor-orb-1', 'Seletor de Orb 1', 10)] },
  { gold: 2500, premios: [p('mint', 'Mint aleatória', 1), p('ovo-inicial', 'Ovo Inicial'), p('abilitycapsule', 'Ability Capsule', 2), p('ovo-lendario', 'Ovo Lendário', 1), p('masterball', 'Master Ball', 1), p('seletor-orb-1', 'Seletor de Orb 1', 15)] },
  { gold: 5000, premios: [p('mint', 'Mint aleatória', 1), p('ovo-inicial', 'Ovo Inicial'), p('abilitypatch', 'Ability Patch', 2), p('ovo-lendario', 'Ovo Lendário', 1), p('charm', 'Charm aleatório', 5), p('masterball', 'Master Ball', 1), p('seletor-orb-1', 'Seletor de Orb 1', 15)] },
  { gold: 10000, premios: [p('mint', 'Mint aleatória', 1), p('ovo-inicial', 'Ovo Inicial'), p('abilitycapsule', 'Ability Capsule', 3), p('ovo-lendario', 'Ovo Lendário', 1), p('charm', 'Charm aleatório', 10), p('masterball', 'Master Ball', 2), p('seletor-orb-1', 'Seletor de Orb 1', 25)] },
  { gold: 20000, premios: [p('mint', 'Mint aleatória', 2), p('ovo-inicial-a', 'Ovo Inicial A'), p('abilitypatch', 'Ability Patch', 3), p('ovo-lendario', 'Ovo Lendário', 1), p('charm', 'Charm aleatório', 20), p('masterball', 'Master Ball', 2), p('seletor-orb-1', 'Seletor de Orb 1', 25)] },
  { gold: 30000, premios: [p('mint', 'Mint aleatória', 3), p('ovo-inicial-a', 'Ovo Inicial A'), p('abilitycapsule', 'Ability Capsule', 3), p('abilitypatch', 'Ability Patch', 3), p('ovo-lendario', 'Ovo Lendário', 2), p('charm', 'Charm aleatório', 30), p('masterball', 'Master Ball', 3), p('seletor-orb-1', 'Seletor de Orb 1', 50)] },
  { gold: 50000, premios: [p('mint', 'Mint aleatória', 5), p('ovo-inicial-a', 'Ovo Inicial A'), p('ovo-lendario-a', 'Ovo Lendário A'), p('ovo-lendario', 'Ovo Lendário', 2), p('charm', 'Charm aleatório', 50), p('masterball', 'Master Ball', 4), p('seletor-orb-1', 'Seletor de Orb 1', 50)] },
  { gold: 75000, premios: [p('mint', 'Mint aleatória', 7), p('ovo-inicial-a', 'Ovo Inicial A'), p('ovo-lendario-a', 'Ovo Lendário A'), p('ovo-lendario', 'Ovo Lendário', 2), p('charm', 'Charm aleatório', 75), p('masterball', 'Master Ball', 5), p('seletor-orb-1', 'Seletor de Orb 1', 100)] },
  { gold: 100000, premios: [p('mint', 'Mint aleatória', 10), p('ovo-inicial-s', 'Ovo Inicial S'), p('ovo-lendario-s', 'Ovo Lendário S'), p('ovo-lendario', 'Ovo Lendário', 4), p('charm', 'Charm aleatório', 100), p('masterball', 'Master Ball', 6), p('seletor-orb-1', 'Seletor de Orb 1', 100), p('seletor-orb-3', 'Seletor de Orb 3', 50)] },
];

export const premiosLogin = () => ajustesPremios().login7 ?? PREMIOS_LOGIN_PADRAO;
export const premiosLoginTrinta = () => ajustesPremios().login30 ?? PREMIOS_LOGIN_TRINTA_PADRAO;
export const metasDoacao = () => ajustesPremios().doacao ?? METAS_DOACAO_PADRAO;

const BRASILIA_MS = -3 * 60 * 60 * 1000;

/** Dia de Brasília ("2026-10-19"). */
export const diaBrasilia = (agora = Date.now()) => new Date(agora + BRASILIA_MS).toISOString().slice(0, 10);

/** O dia anterior a `dia` ("2026-10-18"). */
export function diaAnterior(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Trimestre da doação acumulada ("2026-T4"), início e fim (ms, horário de Brasília). */
export function trimestreDoacao(agora = Date.now()): { id: string; inicio: number; fim: number } {
  const br = new Date(agora + BRASILIA_MS);
  const ano = br.getUTCFullYear();
  const t = Math.floor(br.getUTCMonth() / 3);
  return { id: `${ano}-T${t + 1}`, inicio: Date.UTC(ano, t * 3, 1) - BRASILIA_MS, fim: Date.UTC(ano, t * 3 + 3, 1) - BRASILIA_MS };
}

/** Diferença em dias entre dois dias de Brasília ("2026-10-19" − "2026-10-09" = 10). */
export const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);

/** O que o jogo recebe de `GET /api/recompensas`. */
export type EstadoRecompensas = {
  /** Login das contas novas: `dia` = casinhas andadas; `fim` = quando a janela de 7 dias da conta acaba (null = acabou) */
  login: { fim: number | null; dia: number; hoje: boolean };
  /** Login dos 30 dias: `diaAtual` 1–30 (null = ainda não começou ou já acabou), dias pegos e recuperações do VIP */
  trinta: {
    inicio: string; diaAtual: number | null; pegos: number[]; recuperacoes: number; vip: boolean;
    /** Primeiro dia do evento em que a conta já existia (os anteriores são "antes da sua conta", não perdidos). */
    primeiroDia: number;
  };
  doacao: { trimestre: string; fim: number; gold: number; metas: number[] };
};
