// Expedição (evento AFK da planilha do dono): o jogador manda até 6 Pokémon por 1, 3 ou 6 horas; eles somem do
// time/PC nesse tempo e voltam com itens (todos NT) conforme o Power somado. Tabela aprovada pelo dono em 14/10.
import { TODOS_OS_ITENS } from './loja';
import { itensDoGrupo } from './tickets';

export const DURACOES_EXPEDICAO = [1, 3, 6];
export const POKEMON_POR_EXPEDICAO = 6;
export const PRECO_EXPEDICAO = 10_000;
export const PRECO_EXPEDICAO_VIP = 5_000;

export interface FaixaExpedicao {
  /** Power somado a partir do qual vale */
  minimo: number;
  berries: number;
  apricorns: number;
  bola: [string, number];
  remedio: [string, number];
  extra: [string, number] | null;
  /** chance de item raro por hora */
  raro: number;
  /** Energies (tipo aleatório) por hora */
  energias: number;
}

export const FAIXAS_EXPEDICAO: FaixaExpedicao[] = [
  { minimo: 0, berries: 4, apricorns: 2, bola: ['pokeball', 5], remedio: ['potion', 2], extra: null, raro: 0.005, energias: 1 },
  { minimo: 1500, berries: 5, apricorns: 3, bola: ['greatball', 5], remedio: ['superpotion', 2], extra: null, raro: 0.01, energias: 1 },
  { minimo: 4000, berries: 6, apricorns: 4, bola: ['ultraball', 6], remedio: ['hyperpotion', 2], extra: null, raro: 0.015, energias: 2 },
  { minimo: 7000, berries: 8, apricorns: 5, bola: ['ultraball', 8], remedio: ['maxpotion', 2], extra: ['revive', 1], raro: 0.02, energias: 2 },
  { minimo: 9500, berries: 10, apricorns: 6, bola: ['ultraball', 10], remedio: ['fullrestore', 2], extra: ['maxrevive', 1], raro: 0.025, energias: 3 },
];

export const faixaDoPower = (power: number): number => FAIXAS_EXPEDICAO.reduce((achada, f, i) => (power >= f.minimo ? i : achada), 0);

/** Um item raro: Mint aleatória, Ability Capsule, Charm aleatório ou Ovo Comum (chance igual entre os quatro). */
function itemRaro(aleatorio: () => number): string {
  const sorteia = (lista: string[]) => lista[Math.floor(aleatorio() * lista.length)];
  const qual = Math.floor(aleatorio() * 4);
  if (qual === 0) return sorteia(TODOS_OS_ITENS.filter((i) => i.categoria === 'mints').map((i) => i.id));
  if (qual === 1) return 'abilitycapsule';
  if (qual === 2) return sorteia(itensDoGrupo('charm'));
  return 'ovo-comum';
}

/** O que a expedição trouxe: id → quantidade. Cada hora sorteia os seus Berries, Apricorns, Energies e o raro. */
export function premiosDaExpedicao(faixa: number, horas: number, aleatorio = Math.random): Record<string, number> {
  const f = FAIXAS_EXPEDICAO[faixa];
  const saida: Record<string, number> = {};
  const somar = (id: string, n: number) => n > 0 && (saida[id] = (saida[id] ?? 0) + n);
  const berries = itensDoGrupo('fruta');
  const apricorns = itensDoGrupo('apricorn');
  const energias = itensDoGrupo('energia');
  const sorteia = (lista: string[]) => lista[Math.floor(aleatorio() * lista.length)];
  for (let h = 0; h < horas; h++) {
    for (let i = 0; i < f.berries; i++) somar(sorteia(berries), 1);
    for (let i = 0; i < f.apricorns; i++) somar(sorteia(apricorns), 1);
    for (let i = 0; i < f.energias; i++) somar(sorteia(energias), 1);
    if (aleatorio() < f.raro) somar(itemRaro(aleatorio), 1);
  }
  somar(f.bola[0], f.bola[1] * horas);
  somar(f.remedio[0], f.remedio[1] * horas);
  if (f.extra) somar(f.extra[0], f.extra[1] * horas);
  return saida;
}
