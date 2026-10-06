// Catálogo da loja: bolas e remédios do jogo + itens do Pokémon Showdown (pedras de evolução,
// itens de batalha, frutas) + TMs (Scarlet/Violet) e TRs (Sword/Shield) da PokéAPI.
// Preços provisórios (1 silver); o dono vai ajustar a economia em PRECOS.
import { Dex } from '@pkmn/sim';
import maquinas from './data/maquinas.json';
import { ITENS, type ItemId } from './itens';
import { nomeCategoria, nomeTipo, traduzir } from './traducao';

export type CategoriaLoja = 'bolas' | 'remedios' | 'evolucao' | 'batalha' | 'frutas' | 'tm' | 'tr';

export const CATEGORIAS: { id: CategoriaLoja; nome: string }[] = [
  { id: 'bolas', nome: 'Pokébolas' },
  { id: 'remedios', nome: 'Remédios' },
  { id: 'evolucao', nome: 'Evolução' },
  { id: 'batalha', nome: 'Itens de batalha' },
  { id: 'frutas', nome: 'Frutas' },
  { id: 'tm', nome: 'TMs' },
  { id: 'tr', nome: 'TRs' },
];

export interface ItemLoja {
  /** id usado na bolsa (ids do Showdown para itens de batalha: "eviolite", "firestone"…) */
  id: string;
  nome: string;
  categoria: CategoriaLoja;
  descricao: string;
  preco: number;
  /** TMs e TRs: golpe ensinado (id do Showdown) */
  golpe?: string;
}

/** Moeda do jogo. */
export const MOEDA = 'silver';
export const PRECO_PADRAO = 1;
/** Preços específicos (id do item → preço). Vazio por enquanto: tudo custa PRECO_PADRAO. */
export const PRECOS: Record<string, number> = {};
/** Silver inicial e recompensa por vitória: provisórios até o dono definir a economia. */
export const SILVER_INICIAL = 1000;
export const SILVER_POR_VITORIA = 10;

/** Pedras que fazem Pokémon evoluir ao serem usadas. */
export const PEDRAS_EVOLUCAO = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone', 'shinystone', 'duskstone', 'dawnstone', 'icestone'];
/** Item nosso (não existe no Showdown): faz evoluir quem evolui por troca, como o Linking Cord do Legends: Arceus. */
export const CABO_DE_LIGACAO = 'linkingcord';

const preco = (id: string) => PRECOS[id] ?? PRECO_PADRAO;

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

  // itens de batalha e frutas: os padrões da 9ª geração, menos bolas e pedras de evolução
  for (const i of Dex.items.all()) {
    if (i.isNonstandard || i.isPokeball || PEDRAS_EVOLUCAO.includes(i.id)) continue;
    add({ id: i.id, nome: i.name, categoria: i.isBerry ? 'frutas' : 'batalha', descricao: traduzir(i.shortDesc || i.desc) });
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
const porId = new Map(CATALOGO.map((i) => [i.id, i]));

export function itemDaLoja(id: string): ItemLoja | undefined {
  return porId.get(id);
}
