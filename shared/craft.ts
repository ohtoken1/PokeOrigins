// Craft (planilha do dono "Craft.xlsx"): Pokébolas com Apricorns, Charms com Berries + Energies, e os canteiros
// onde se plantam Berries e Apricorns. Tudo no NPC de craft da cidade (ui/craft.ts). As receitas das bolas e as
// Berries dos charms foram escolhidas por nós, a pedido do dono (cores da bola; Berry que reduz o dano do tipo).
import { TIPOS_DOS_CHARMS, idCharm, type TipoCharm } from './charms';
import { idEnergia } from './materiais';

// ---------- Pokébolas ----------

/** Cada craft dá 2 bolas e gasta 1 Apricorn de cada cor da receita + Poké Dólares (VIP paga menos). */
export const BOLAS_POR_CRAFT = 2;
export const PRECO_CRAFT_BOLA = 800;
export const PRECO_CRAFT_BOLA_VIP = 600;

/** id da bola → as duas cores de Apricorn (pelas cores da bola). Poké, Great e Ultra ficam fora (a loja vende). */
export const RECEITAS_BOLA: Record<string, [string, string]> = {
  dreamball: ['pink', 'white'],
  heavyball: ['black', 'white'],
  moonball: ['black', 'yellow'],
  quickball: ['blue', 'yellow'],
  repeatball: ['red', 'yellow'],
  duskball: ['black', 'green'],
  nestball: ['green', 'yellow'],
  fastball: ['red', 'white'],
  netball: ['blue', 'white'],
  luxuryball: ['black', 'red'],
  diveball: ['blue', 'green'],
  loveball: ['pink', 'red'],
};
export const idApricornDaCor = (cor: string) => `apricorn-${cor}`;

// ---------- Charms ----------

export const BERRIES_POR_CHARM = 100;
export const ENERGIES_POR_CHARM = 100;
export const PRECO_CRAFT_CHARM = 50_000;
/** VIP recebe o dobro (pedido do dono). */
export const CHARMS_POR_CRAFT = 1;
export const CHARMS_POR_CRAFT_VIP = 2;

/** Berry de cada charm: a que reduz o dano de um golpe daquele tipo (Normal = Chilan). */
export const BERRY_DO_CHARM: Record<TipoCharm, string> = {
  normal: 'chilanberry', fire: 'occaberry', water: 'passhoberry', electric: 'wacanberry', grass: 'rindoberry', ice: 'yacheberry',
  fighting: 'chopleberry', poison: 'kebiaberry', ground: 'shucaberry', flying: 'cobaberry', psychic: 'payapaberry', bug: 'tangaberry',
  rock: 'chartiberry', ghost: 'kasibberry', dragon: 'habanberry', dark: 'colburberry', steel: 'babiriberry', fairy: 'roseliberry',
};
export interface ReceitaCharm {
  charm: string;
  tipo: TipoCharm;
  berry: string;
  energia: string;
}
export const RECEITAS_CHARM: ReceitaCharm[] = TIPOS_DOS_CHARMS.map((tipo) => ({ charm: idCharm(tipo), tipo, berry: BERRY_DO_CHARM[tipo], energia: idEnergia(tipo) }));

// ---------- canteiros ----------

/** Um canteiro por nível de treinador. Cada plantio compra a semente (não volta: escoa Poké Dólares, pedido do dono). */
export const PRECO_SEMENTE = 100;
const HORA = 60 * 60 * 1000;
/** Tempo para crescer (ms). Só conta enquanto o canteiro está regado (VIP não precisa regar). */
export const TEMPO_CRESCER = { berry: 2 * HORA, apricorn: 2 * HORA };
export const TEMPO_CRESCER_VIP = { berry: 1.5 * HORA, apricorn: 1 * HORA };
/** Regar vale por 1 hora; sem água o crescimento PARA (nada morre). */
export const REGA_DURA = HORA;
export const COLHEITA = { berry: 1, apricorn: 5 };
export const COLHEITA_VIP = { berry: 2, apricorn: 6 };

export interface Canteiro {
  /** id do item plantado (Berry ou Apricorn); sem planta = canteiro vazio */
  planta?: string;
  /** quanto já cresceu (ms) até `atualizadoEm` */
  crescido?: number;
  atualizadoEm?: number;
  /** regado até esta hora (ms) */
  regadoAte?: number;
}

export const tipoDaPlanta = (id: string): 'berry' | 'apricorn' => (id.startsWith('apricorn-') ? 'apricorn' : 'berry');
export const tempoParaCrescer = (id: string, vip: boolean) => (vip ? TEMPO_CRESCER_VIP : TEMPO_CRESCER)[tipoDaPlanta(id)];
export const colheitaDe = (id: string, vip: boolean) => (vip ? COLHEITA_VIP : COLHEITA)[tipoDaPlanta(id)];

/** Soma o crescimento até agora (só o tempo regado; VIP cresce sempre). */
export function atualizarCanteiro(c: Canteiro, agora: number, vip: boolean): void {
  if (!c.planta) return;
  const desde = c.atualizadoEm ?? agora;
  const ate = vip ? agora : Math.min(agora, c.regadoAte ?? desde);
  c.crescido = (c.crescido ?? 0) + Math.max(0, ate - desde);
  c.atualizadoEm = agora;
}
export function plantar(c: Canteiro, planta: string, agora: number): void {
  // plantar já rega (a primeira hora conta)
  Object.assign(c, { planta, crescido: 0, atualizadoEm: agora, regadoAte: agora + REGA_DURA });
}
export function regar(c: Canteiro, agora: number, vip: boolean): void {
  atualizarCanteiro(c, agora, vip);
  c.regadoAte = agora + REGA_DURA;
}
export const canteiroPronto = (c: Canteiro, vip: boolean) => !!c.planta && (c.crescido ?? 0) >= tempoParaCrescer(c.planta, vip);
/** Sem água agora (e não é VIP): o crescimento está parado. */
export const canteiroSeco = (c: Canteiro, agora: number, vip: boolean) => !!c.planta && !vip && !canteiroPronto(c, vip) && (c.regadoAte ?? 0) <= agora;
