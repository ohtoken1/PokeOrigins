// Todos os itens do jogo: bolas e remédios nossos + itens do Pokémon Showdown (pedras, itens de batalha, frutas,
// gems, plates, memories, Z-Crystals, itens de lendários) + Tera Shards + TMs (Scarlet/Violet) e TRs (Sword/Shield).
// `naLoja` diz o que a loja vende (regras do dono em classificarItem); o resto sai de tickets/Admin.
// Preços provisórios (1 silver); o dono vai ajustar a economia em PRECOS.
import { Dex } from '@pkmn/sim';
import maquinas from './data/maquinas.json';
import { ITENS, type ItemId } from './itens';
import { TICKETS } from './tickets';
import { TIPOS_TERA } from './tera';
import { ITENS_CUSTOM } from './itensCustom';

export { TIPOS_TERA };
import { OVOS } from './ovos';
import { nomeCategoria, nomeTipo, traduzir } from './traducao';

export type CategoriaLoja =
  | 'bolas' | 'remedios' | 'evolucao' | 'batalha' | 'frutas' | 'gems' | 'placas' | 'memorias' | 'zcristais' | 'lendarios'
  | 'terashards' | 'chave' | 'skins' | 'tm' | 'tr' | 'tickets' | 'ovos';

/** Abas da loja. */
export const CATEGORIAS: { id: CategoriaLoja; nome: string }[] = [
  { id: 'bolas', nome: 'Pokébolas' },
  { id: 'remedios', nome: 'Remédios' },
  { id: 'evolucao', nome: 'Evolução' },
  { id: 'batalha', nome: 'Itens de batalha' },
  { id: 'tm', nome: 'TMs' },
  { id: 'tr', nome: 'TRs' },
];
/** Categorias fora da loja (saem de tickets e, por enquanto, do Admin). */
export const CATEGORIAS_FORA_DA_LOJA: { id: CategoriaLoja; nome: string }[] = [
  { id: 'frutas', nome: 'Berries' },
  { id: 'gems', nome: 'Gems' },
  { id: 'placas', nome: 'Plates' },
  { id: 'memorias', nome: 'Memories' },
  { id: 'zcristais', nome: 'Z-Crystals' },
  { id: 'lendarios', nome: 'Itens de lendários' },
  { id: 'terashards', nome: 'Tera Shards' },
  { id: 'chave', nome: 'Itens-chave' },
  { id: 'skins', nome: 'Skins' },
  { id: 'tickets', nome: 'Tickets' },
  { id: 'ovos', nome: 'Ovos' },
];
/** Abas da bolsa e filtros da Database: todas. */
export const CATEGORIAS_BOLSA: { id: CategoriaLoja; nome: string }[] = [...CATEGORIAS, ...CATEGORIAS_FORA_DA_LOJA];
export const nomeCategoriaItem = (c: CategoriaLoja) => CATEGORIAS_BOLSA.find((x) => x.id === c)?.nome ?? c;

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
  /** endereço completo da imagem (Tera Shards, que não existem no Showdown nem na PokéAPI) */
  imagem?: string;
  /** vendido na loja? (false: só tickets/Admin) */
  naLoja: boolean;
  /** Tera Shards: tipo que a shard dá */
  teraTipo?: string;
  /** skins: de qual Pokémon */
  skin?: { especie: number; shiny: boolean };
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

/** Tera Shards: juntando esta quantidade, troca o Tera Type de um Pokémon (como em Scarlet/Violet). */
export const SHARDS_POR_TROCA = 50;
/** Imagens das Tera Shards (baixadas do Serebii para client/public/itens; não existem no Showdown nem na PokéAPI). */
const imagemShard = (tipo: string) => `itens/terashard-${tipo.toLowerCase()}.png`;

/**
 * Categoria de um item do Showdown, ou null se ele fica fora do jogo (sem uso: fósseis, cartas, Bottle Caps,
 * itens da 2ª geração, Mega Stones — Mega Evolução ainda não existe no jogo).
 * Regras do dono para a LOJA: só bolas, remédios, evolução e itens de batalha; frutas, gems, plates, memories,
 * Z-Crystals e itens de lendários ficam fora dela.
 */
function classificarItem(i: ReturnType<typeof Dex.items.get>): CategoriaLoja | null {
  const desc = i.shortDesc || i.desc || '';
  if (i.isNonstandard && i.isNonstandard !== 'Past') return null;
  if (i.isPokeball || i.megaStone || /^tr\d\d$/.test(i.id)) return null;
  if (/^\(Gen \d\)|No competitive use|Though this feather|big nugget|Hyper Training|Can be revived|Can revive|Cannot be given/i.test(desc)) return null;
  if (i.id === 'machobrace') return null;
  if (i.isBerry) return i.isNonstandard ? null : 'frutas';
  if (i.isGem) return 'gems';
  // Z-Crystals de tipo também têm onPlate (Arceus muda de tipo com eles): checar antes das Plates
  if (i.zMove) return 'zcristais';
  if (i.onPlate || /plate$/.test(i.id)) return 'placas';
  if (/memory$/.test(i.id)) return 'memorias';
  if (i.itemUser?.length && i.itemUser.every(ehLendario)) return 'lendarios';
  if (/^Evolves/.test(desc)) return 'evolucao';
  return 'batalha';
}
const NA_LOJA = new Set<CategoriaLoja>(['bolas', 'remedios', 'evolucao', 'batalha', 'tm', 'tr']);

function montarCatalogo(): ItemLoja[] {
  const itens: ItemLoja[] = [];
  const add = (item: Omit<ItemLoja, 'preco' | 'naLoja'>) => {
    const naLoja = NA_LOJA.has(item.categoria);
    itens.push({ ...item, naLoja, preco: naLoja ? preco(item.id) : 0 });
  };

  for (const id of Object.keys(ITENS) as ItemId[]) {
    const i = ITENS[id];
    add({ id, nome: i.nome, categoria: i.categoria === 'bola' ? 'bolas' : 'remedios', descricao: i.descricao });
  }

  for (const id of PEDRAS_EVOLUCAO) {
    const i = Dex.items.get(id);
    add({ id, nome: i.name, categoria: 'evolucao', descricao: traduzir(i.shortDesc || i.desc) || 'Faz certos Pokémon evoluírem.' });
  }
  add({ id: CABO_DE_LIGACAO, nome: 'Linking Cord', categoria: 'evolucao', descricao: 'Faz evoluir Pokémon que evoluem por troca (se precisar de item, ele deve estar equipado).' });

  // todos os itens do Showdown que têm uso no jogo (inclusive os de gerações passadas: incensos, Z-Crystals, gems…)
  for (const i of Dex.items.all()) {
    if (!i.exists || PEDRAS_EVOLUCAO.includes(i.id)) continue;
    const categoria = classificarItem(i);
    if (!categoria) continue;
    add({ id: i.id, nome: i.name, categoria, descricao: traduzir(i.shortDesc || i.desc) });
  }

  for (const tipo of TIPOS_TERA)
    add({
      id: `terashard-${tipo.toLowerCase()}`,
      nome: `${tipo} Tera Shard`,
      categoria: 'terashards',
      teraTipo: tipo,
      imagem: imagemShard(tipo),
      descricao: `Junte ${SHARDS_POR_TROCA} para mudar o Tera Type de um Pokémon para ${tipo}.`,
    });

  for (const m of maquinas as { id: string; golpe: string }[]) {
    const golpe = Dex.moves.get(m.golpe);
    const tr = m.id.startsWith('tr');
    const numero = m.id.slice(2);
    const nome = `${tr ? 'TR' : 'TM'}${tr ? numero.padStart(2, '0') : numero.padStart(3, '0')} ${golpe.name}`;
    add({ id: m.id, nome, categoria: tr ? 'tr' : 'tm', golpe: golpe.id, descricao: `${nomeTipo(golpe.type)} · ${nomeCategoria(golpe.category)} · Poder ${golpe.basePower || '—'} · ${traduzir(golpe.shortDesc)}` });
  }
  return itens;
}

/** Todos os itens do jogo (Database, bolsa e Admin). */
export const TODOS_OS_ITENS: ItemLoja[] = [
  ...montarCatalogo(),
  // itens nossos: skins e itens-chave (sem uso por enquanto)
  ...ITENS_CUSTOM.map((i): ItemLoja => ({ ...i, preco: 0, naLoja: false })),
  ...TICKETS.map((t): ItemLoja => ({ id: t.id, nome: t.nome, categoria: 'tickets', descricao: t.descricao, preco: 0, naLoja: false, sprite: 'eon-ticket' })),
  ...OVOS.map((o): ItemLoja => ({ id: o.id, nome: o.nome, categoria: 'ovos', descricao: o.descricao, preco: 0, naLoja: false })),
];
/** O que a loja vende. */
export const CATALOGO: ItemLoja[] = TODOS_OS_ITENS.filter((i) => i.naLoja);
const porId = new Map(TODOS_OS_ITENS.map((i) => [i.id, i]));

export function itemDaLoja(id: string): ItemLoja | undefined {
  return porId.get(id);
}
