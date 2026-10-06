// Catálogo da loja: bolas e remédios do jogo + itens do Pokémon Showdown (pedras de evolução,
// itens de batalha, frutas) + TMs (Scarlet/Violet) e TRs (Sword/Shield) da PokéAPI.
// Preços provisórios (1 silver); o dono vai ajustar a economia em PRECOS.
import { Dex } from '@pkmn/sim';
import maquinas from './data/maquinas.json';
import { ITENS, type ItemId } from './itens';
import { ITENS_ESPECIAIS, TICKETS } from './tickets';
import { nomeCategoria, nomeTipo, traduzir } from './traducao';

export type CategoriaLoja = 'bolas' | 'remedios' | 'evolucao' | 'batalha' | 'tm' | 'tr' | 'especiais' | 'tickets';

export const CATEGORIAS: { id: CategoriaLoja; nome: string }[] = [
  { id: 'bolas', nome: 'Pokébolas' },
  { id: 'remedios', nome: 'Remédios' },
  { id: 'evolucao', nome: 'Evolução' },
  { id: 'batalha', nome: 'Itens de batalha' },
  { id: 'tm', nome: 'TMs' },
  { id: 'tr', nome: 'TRs' },
];
/** Abas da bolsa: as da loja + itens que só saem de tickets. */
export const CATEGORIAS_BOLSA: { id: CategoriaLoja; nome: string }[] = [...CATEGORIAS, { id: 'especiais', nome: 'Especiais' }, { id: 'tickets', nome: 'Tickets' }];

export interface ItemLoja {
  /** id usado na bolsa (ids do Showdown para itens de batalha: "eviolite", "firestone"…) */
  id: string;
  nome: string;
  categoria: CategoriaLoja;
  descricao: string;
  preco: number;
  /** TMs e TRs: golpe ensinado (id do Showdown) */
  golpe?: string;
  /** imagem da PokéAPI (sprites/items/<sprite>.png) para itens sem ícone no Showdown */
  sprite?: string;
}

/** Moeda do jogo. */
export const MOEDA = 'silver';
export const PRECO_PADRAO = 1;
/** Preços específicos (id do item → preço). Vazio por enquanto: tudo custa PRECO_PADRAO. */
export const PRECOS: Record<string, number> = {};
/** Silver inicial e recompensa por vitória: provisórios até o dono definir a economia. */
export const SILVER_INICIAL = 1000;
export const SILVER_POR_VITORIA = 10;
/**
 * Preço para revelar os IVs de um Pokémon capturado (provisório): silver mostra só a FAIXA de cada IV,
 * gold mostra o valor exato. Gold ainda não existe no jogo: preparado para depois.
 */
export const PRECO_REVELAR_IVS = { silver: 100, gold: 1 };
/** Faixas de IV mostradas com silver (o 31 fica junto com 26+). */
export const FAIXAS_IV: [number, number][] = [[0, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 31]];
export const faixaDoIv = (iv: number): [number, number] => FAIXAS_IV.find(([a, b]) => iv >= a && iv <= b) ?? [iv, iv];

/** Pedras que fazem Pokémon evoluir ao serem usadas. */
export const PEDRAS_EVOLUCAO = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone', 'shinystone', 'duskstone', 'dawnstone', 'icestone'];
/** Item nosso (não existe no Showdown): faz evoluir quem evolui por troca, como o Linking Cord do Legends: Arceus. */
export const CABO_DE_LIGACAO = 'linkingcord';

const preco = (id: string) => PRECOS[id] ?? PRECO_PADRAO;

const ehLendario = (nome: string) => (Dex.species.get(nome).tags ?? []).some((t) => /Legendary|Mythical/.test(t));

/**
 * Regras do dono para a loja: fora frutas, gems, plates/memories, itens exclusivos de lendários/míticos,
 * itens sem uso em batalha e itens de treino de EV/IV; itens cuja função é evoluir vão para "Evolução".
 */
function classificarItem(i: ReturnType<typeof Dex.items.get>): 'batalha' | 'evolucao' | 'fora' {
  const desc = i.shortDesc || i.desc || '';
  if (i.isBerry || i.isGem) return 'fora';
  if (i.onPlate || /plate$|memory$/.test(i.id)) return 'fora';
  if (i.itemUser?.length && i.itemUser.every(ehLendario)) return 'fora';
  if (/^Evolves/.test(desc)) return 'evolucao';
  if (/No competitive use|Though this feather|big nugget|Hyper Training|Klutz Ability does not ignore/i.test(desc) || i.id === 'machobrace') return 'fora';
  return 'batalha';
}

function montarCatalogo(): ItemLoja[] {
  const itens: ItemLoja[] = [];
  const add = (item: Omit<ItemLoja, 'preco'>) => itens.push({ ...item, preco: preco(item.id) });

  for (const id of Object.keys(ITENS) as ItemId[]) {
    const i = ITENS[id];
    add({ id, nome: i.nome, categoria: i.categoria === 'bola' ? 'bolas' : 'remedios', descricao: i.descricao });
  }

  for (const id of PEDRAS_EVOLUCAO) {
    const i = Dex.items.get(id);
    add({ id, nome: i.name, categoria: 'evolucao', descricao: traduzir(i.shortDesc || i.desc) || 'Faz certos Pokémon evoluírem.' });
  }
  add({ id: CABO_DE_LIGACAO, nome: 'Linking Cord', categoria: 'evolucao', descricao: 'Faz evoluir Pokémon que evoluem por troca (se precisar de item, ele deve estar equipado).' });

  // itens padrão da 9ª geração: os de evoluir vão para "Evolução", os de batalha para "Itens de batalha"
  for (const i of Dex.items.all()) {
    if (i.isNonstandard || i.isPokeball || PEDRAS_EVOLUCAO.includes(i.id)) continue;
    const tipo = classificarItem(i);
    if (tipo === 'fora') continue;
    add({ id: i.id, nome: i.name, categoria: tipo, descricao: traduzir(i.shortDesc || i.desc) });
  }

  for (const m of maquinas as { id: string; golpe: string }[]) {
    const golpe = Dex.moves.get(m.golpe);
    const tr = m.id.startsWith('tr');
    const numero = m.id.slice(2);
    const nome = `${tr ? 'TR' : 'TM'}${tr ? numero.padStart(2, '0') : numero.padStart(3, '0')} ${golpe.name}`;
    add({ id: m.id, nome, categoria: tr ? 'tr' : 'tm', golpe: golpe.id, descricao: `${nomeTipo(golpe.type)} · ${nomeCategoria(golpe.category)} · Poder ${golpe.basePower || '—'} · ${traduzir(golpe.shortDesc)}` });
  }
  return itens;
}

export const CATALOGO: ItemLoja[] = montarCatalogo();
/** Fora da loja: itens de forma de lendários e tickets (só saem de tickets / batalhas). */
const FORA_DA_LOJA: ItemLoja[] = [
  ...ITENS_ESPECIAIS.map((id): ItemLoja => {
    const i = Dex.items.get(id);
    return { id, nome: i.name, categoria: 'especiais', descricao: traduzir(i.shortDesc || i.desc), preco: 0 };
  }),
  ...TICKETS.map((t): ItemLoja => ({ id: t.id, nome: t.nome, categoria: 'tickets', descricao: t.descricao, preco: 0, sprite: 'eon-ticket' })),
];
const porId = new Map([...CATALOGO, ...FORA_DA_LOJA].map((i) => [i.id, i]));

export function itemDaLoja(id: string): ItemLoja | undefined {
  return porId.get(id);
}
