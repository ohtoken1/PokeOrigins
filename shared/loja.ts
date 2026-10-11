// Todos os itens do jogo: bolas e remédios nossos + itens do Pokémon Showdown (pedras, itens de batalha, frutas,
// gems, plates, memories, Z-Crystals, itens de lendários) + Tera Shards + TMs (Scarlet/Violet) e TRs (Sword/Shield).
// `naLoja` diz o que a loja vende (regras do dono em classificarItem); o resto sai de tickets/Admin.
// Preços provisórios (1 silver); o dono vai ajustar a economia em PRECOS.
import { Dex } from '@pkmn/sim';
import maquinas from './data/maquinas.json';
import { ITENS, type ItemId } from './itens';
import { CHAVE_TEMPORAL, TICKETS } from './tickets';
import { TIPOS_TERA } from './tera';
import { ITENS_CUSTOM } from './itensCustom';
import { MEGA_STONES, PRECO_MEGA_STONE_GOLD, RAYQUAZITE, megaDaPedra } from './megas';

export { TIPOS_TERA };
import { OVOS } from './ovos';
import { nomeCategoria, nomeTipo, traduzir } from './traducao';

export type CategoriaLoja =
  | 'bolas' | 'remedios' | 'evolucao' | 'batalha' | 'up' | 'mints' | 'megapedras' | 'frutas' | 'gems' | 'placas' | 'memorias' | 'zcristais' | 'lendarios'
  | 'terashards' | 'chave' | 'charms' | 'skins' | 'cubos' | 'tm' | 'tr' | 'tickets' | 'ovos';

/** Abas da loja. */
export const CATEGORIAS: { id: CategoriaLoja; nome: string }[] = [
  { id: 'bolas', nome: 'Pokébolas' },
  { id: 'remedios', nome: 'Remédios' },
  { id: 'evolucao', nome: 'Evolução' },
  { id: 'batalha', nome: 'Itens de batalha' },
  { id: 'up', nome: 'Up' },
  { id: 'megapedras', nome: 'Mega Stones' },
  { id: 'tm', nome: 'TMs' },
  { id: 'tr', nome: 'TRs' },
];
/** Categorias fora da loja (saem de tickets e, por enquanto, do Admin). */
export const CATEGORIAS_FORA_DA_LOJA: { id: CategoriaLoja; nome: string }[] = [
  { id: 'mints', nome: 'Mints' },
  { id: 'frutas', nome: 'Berries' },
  { id: 'gems', nome: 'Gems' },
  { id: 'placas', nome: 'Plates' },
  { id: 'memorias', nome: 'Memories' },
  { id: 'zcristais', nome: 'Z-Crystals' },
  { id: 'lendarios', nome: 'Itens de lendários' },
  { id: 'terashards', nome: 'Tera Shards' },
  { id: 'chave', nome: 'Itens-chave' },
  { id: 'charms', nome: 'Charms' },
  { id: 'skins', nome: 'Skins' },
  { id: 'cubos', nome: 'Cubos' },
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
  /** moeda do preço na loja (padrão: silver; Mega Stones: gold) */
  moeda?: 'silver' | 'gold';
  /** Tera Shards: tipo que a shard dá */
  teraTipo?: string;
  /** skins: de qual Pokémon */
  skin?: { especie: number; shiny: boolean };
  /** mints: a Nature que ela dá */
  natureza?: string;
  /** charms: o tipo */
  charm?: string;
  /** desenho provisório do ícone (itens nossos ainda sem arte) */
  simbolo?: string;
  /** cubos: de qual Pokémon e de que era (shared/itensCustom.ts) */
  cubo?: { especie: number; era: 'passado' | 'futuro' | 'lendario' };
}

/** Moeda do jogo. */
export const MOEDA = 'silver';
/** Preço com a moeda certa ("1 silver", "1 gold"). */
export const textoPreco = (i: Pick<ItemLoja, 'preco' | 'moeda'>, quantidade = 1) => `${(i.preco * quantidade).toLocaleString('pt-BR')} ${i.moeda ?? MOEDA}`;
export const PRECO_PADRAO = 1;
/** Preços específicos (id do item → preço). Vazio por enquanto: tudo custa PRECO_PADRAO. */
export const PRECOS: Record<string, number> = {};
/** Silver inicial (provisório). Silver só se ganha vencendo treinadores e ginásios; selvagens não dão (pedido do dono). */
export const SILVER_INICIAL = 1000;
/**
 * Preço em silver para avaliar os IVs de um Pokémon (provisório). Uma forma só de pagar (pedido do dono): depois de
 * avaliado, quem é VIP vê o valor exato e quem não é vê a FAIXA de cada IV.
 */
export const PRECO_REVELAR_IVS = 100;
/** Trocar o nome de treinador e mudar a aparência do personagem depois de criado (provisório; criar é grátis). */
export const PRECO_TROCAR_NOME_GOLD = 1;
export const PRECO_TROCAR_APARENCIA_GOLD = 1;
/** Faixas de IV mostradas a quem não é VIP (o 31 fica junto com 26+). */
export const FAIXAS_IV: [number, number][] = [[0, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 31]];
export const faixaDoIv = (iv: number): [number, number] => FAIXAS_IV.find(([a, b]) => iv >= a && iv <= b) ?? [iv, iv];

/** Pedras que fazem Pokémon evoluir ao serem usadas. */
export const PEDRAS_EVOLUCAO = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone', 'shinystone', 'duskstone', 'dawnstone', 'icestone'];
/** Item nosso (não existe no Showdown): quem segura ganha XP e EVs da batalha mesmo sem entrar em campo. */
export const EXP_SHARE = 'expshare';
/** Itens nossos de segurar: o Pokémon só terastaliza segurando a Terastallizer Band (pedido do dono). */
export const TERASTALLIZER_BAND = 'terastallizerband';
/** Dynamax Band: item de segurar; o Dynamax ainda não existe (o simulador da 9ª geração não tem). */
export const DYNAMAX_BAND = 'dynamaxband';
/** Nomes dos itens de segurar que não existem no Showdown (não vão para o simulador). */
export const ITENS_DE_SEGURAR_NOSSOS: Record<string, string> = { [EXP_SHARE]: 'Exp. Share', [TERASTALLIZER_BAND]: 'Terastallizer Band', [DYNAMAX_BAND]: 'Dynamax Band', luckyegg: 'Lucky Egg', everstone: 'Everstone', amuletcoin: 'Amulet Coin', luckincense: 'Luck Incense' };
/** Descrições nossas para itens do Showdown cujo efeito no jogo é fora da batalha (EVs). */
const DESCRICAO_DE_CAMPO: Record<string, string> = {
  machobrace: 'Segurando, o Pokémon ganha o dobro de EVs de cada Pokémon derrotado. Na batalha, a Speed cai pela metade.',
  powerweight: 'Segurando, o Pokémon ganha +8 EVs de HP por Pokémon derrotado. Na batalha, a Speed cai pela metade.',
  powerbracer: 'Segurando, o Pokémon ganha +8 EVs de Attack por Pokémon derrotado. Na batalha, a Speed cai pela metade.',
  powerbelt: 'Segurando, o Pokémon ganha +8 EVs de Defense por Pokémon derrotado. Na batalha, a Speed cai pela metade.',
  powerlens: 'Segurando, o Pokémon ganha +8 EVs de Sp. Atk por Pokémon derrotado. Na batalha, a Speed cai pela metade.',
  powerband: 'Segurando, o Pokémon ganha +8 EVs de Sp. Def por Pokémon derrotado. Na batalha, a Speed cai pela metade.',
  poweranklet: 'Segurando, o Pokémon ganha +8 EVs de Speed por Pokémon derrotado. Na batalha, a Speed cai pela metade.',
};
/** Itens de usar que trocam a Ability (shared/usoItens.ts, `usarItemDeHabilidade`). */
export const ABILITY_CAPSULE = 'abilitycapsule';
export const ABILITY_PATCH = 'abilitypatch';
/** Itens do Showdown que moram na aba Up (treino: EVs), junto com Exp. Share, Lucky Egg e Everstone. */
const ITENS_DE_UP = new Set(['machobrace', 'powerweight', 'powerbracer', 'powerbelt', 'powerlens', 'powerband', 'poweranklet']);
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
 * itens da 2ª geração, Mega Stones de Megas que o jogo não tem).
 * Regras do dono para a LOJA: só bolas, remédios, evolução e itens de batalha; frutas, gems, plates, memories,
 * Z-Crystals e itens de lendários ficam fora dela.
 */
function classificarItem(i: ReturnType<typeof Dex.items.get>): CategoriaLoja | null {
  const desc = i.shortDesc || i.desc || '';
  // Mega Stones (inclusive as de Legends: Z-A, "Future" no Showdown): vendidas por gold
  if (i.megaStone) return MEGA_STONES.has(i.id) ? 'megapedras' : null;
  if (i.isNonstandard && i.isNonstandard !== 'Past') return null;
  if (i.isPokeball || /^tr\d\d$/.test(i.id)) return null;
  if (/^\(Gen \d\)|No competitive use|Though this feather|big nugget|Hyper Training|Can be revived|Can revive|Cannot be given/i.test(desc)) return null;
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
const NA_LOJA = new Set<CategoriaLoja>(['bolas', 'remedios', 'evolucao', 'batalha', 'up', 'megapedras', 'tm', 'tr']);
/** Itens de categorias vendidas que ficam fora da loja (pedido do dono). */
const FORA_DA_LOJA = new Set(['amuletcoin', 'luckincense', 'destinyknot', 'healpowder', 'lavacookie', 'oldgateau', 'casteliacone', 'lumiosegalette', 'shaloursable', 'bigmalasada', 'ragecandybar']);
/** Das 25 Pokébolas, a loja só vende estas (pedido do dono); as outras saem de tickets/Admin. */
const BOLAS_NA_LOJA = new Set(['pokeball', 'greatball', 'ultraball']);

function montarCatalogo(): ItemLoja[] {
  const itens: ItemLoja[] = [];
  const add = (item: Omit<ItemLoja, 'preco' | 'naLoja'>) => {
    if (itens.some((i) => i.id === item.id)) return;
    const naLoja = NA_LOJA.has(item.categoria) && !FORA_DA_LOJA.has(item.id) && (item.categoria !== 'bolas' || BOLAS_NA_LOJA.has(item.id));
    // Mega Stones custam gold (pedido do dono)
    if (item.categoria === 'megapedras') itens.push({ ...item, naLoja, moeda: 'gold', preco: PRECOS[item.id] ?? PRECO_MEGA_STONE_GOLD });
    else itens.push({ ...item, naLoja, preco: naLoja ? preco(item.id) : 0 });
  };

  for (const id of Object.keys(ITENS) as ItemId[]) {
    const i = ITENS[id];
    add({ id, nome: i.nome, categoria: i.categoria === 'bola' ? 'bolas' : 'remedios', descricao: i.descricao });
  }

  for (const id of PEDRAS_EVOLUCAO) {
    const i = Dex.items.get(id);
    add({ id, nome: i.name, categoria: 'evolucao', descricao: traduzir(i.shortDesc || i.desc) || 'Faz certos Pokémon evoluírem.' });
  }
  add({ id: CABO_DE_LIGACAO, nome: 'Linking Cord', categoria: 'evolucao', imagem: 'itens/linkingcord.png', descricao: 'Faz evoluir Pokémon que evoluem por troca (se precisar de item, ele deve estar equipado).' });

  add({ id: EXP_SHARE, nome: 'Exp. Share', categoria: 'up', sprite: 'exp-share', descricao: 'Segurando, o Pokémon ganha XP e EVs de toda vitória ou captura, mesmo sem entrar em campo.' });
  // itens de segurar com efeito fora da batalha (shared/campo.ts); não existem no Showdown
  add({ id: 'luckyegg', nome: 'Lucky Egg', categoria: 'up', sprite: 'lucky-egg', descricao: 'Segurando, o Pokémon ganha 50% a mais de XP.' });
  add({ id: 'everstone', nome: 'Everstone', categoria: 'up', sprite: 'everstone', descricao: 'Segurando, o Pokémon não evolui por nível nem por amizade.' });
  add({ id: 'amuletcoin', nome: 'Amulet Coin', categoria: 'batalha', sprite: 'amulet-coin', descricao: 'Se quem segura entrar em campo, a batalha contra treinador ou ginásio dá 20% a mais de silver. Não acumula com o Luck Incense.' });
  add({ id: 'luckincense', nome: 'Luck Incense', categoria: 'batalha', sprite: 'luck-incense', descricao: 'Se quem segura entrar em campo, a batalha contra treinador ou ginásio dá 20% a mais de silver. Não acumula com a Amulet Coin.' });
  // trocam a Ability (usados pela bolsa)
  add({ id: ABILITY_CAPSULE, nome: 'Ability Capsule', categoria: 'up', sprite: 'ability-capsule', descricao: 'Troca a Ability do Pokémon pela outra Ability normal da espécie. Em quem tem a Hidden Ability, volta para a normal.' });
  add({ id: ABILITY_PATCH, nome: 'Ability Patch', categoria: 'up', imagem: 'itens/abilitypatch.png', descricao: 'Troca a Ability do Pokémon pela Hidden Ability da espécie. Em quem já tem a Hidden Ability, volta para a normal.' });
  const ATRIBUTO: Record<string, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
  // Mints (as 21 dos jogos): trocam a Nature. Fora da loja (pedido do dono)
  for (const n of Dex.natures.all()) {
    if (!n.plus && n.name !== 'Serious') continue;
    const efeito = n.plus && n.minus ? `+${ATRIBUTO[n.plus]}, −${ATRIBUTO[n.minus]}` : 'sem bônus nem redução';
    add({ id: `${n.id}mint`, nome: `${n.name} Mint`, categoria: 'mints', natureza: n.name, imagem: `itens/${n.id}mint.png`, descricao: `Muda a Nature do Pokémon para ${n.name} (${efeito}).` });
  }
  // ícones desenhados por nós (client/public/itens)
  add({ id: TERASTALLIZER_BAND, nome: 'Terastallizer Band', categoria: 'batalha', imagem: 'itens/terastallizerband.svg', descricao: 'Pulseira com um cristal Tera. O Pokémon só pode terastalizar se estiver segurando ela (uma vez por batalha).' });
  add({ id: DYNAMAX_BAND, nome: 'Dynamax Band', categoria: 'batalha', imagem: 'itens/dynamaxband.svg', descricao: 'Pulseira com uma Wishing Star para Dynamax e Gigantamax. O Dynamax ainda não existe no jogo.' });

  // todos os itens do Showdown que têm uso no jogo (inclusive os de gerações passadas: incensos, Z-Crystals, gems…)
  // a Rayquazite (pedra nossa) entra pelos dados do Showdown; garante que ela venha mesmo se a lista já estava pronta
  const doShowdown = Dex.items.all();
  for (const i of doShowdown.some((x) => x.id === RAYQUAZITE) ? doShowdown : [...doShowdown, Dex.items.get(RAYQUAZITE)]) {
    if (!i.exists || PEDRAS_EVOLUCAO.includes(i.id)) continue;
    const classificado = classificarItem(i);
    if (!classificado) continue;
    const categoria = ITENS_DE_UP.has(i.id) ? 'up' : classificado;
    const mega = categoria === 'megapedras' ? megaDaPedra(i.id) : undefined;
    const descricao = mega ? `Segurando, ${mega.nome.replace(/^Mega /, '')} pode megaevoluir em ${mega.nome} na batalha (uma vez por batalha).` : (DESCRICAO_DE_CAMPO[i.id] ?? traduzir(i.shortDesc || i.desc));
    add({ id: i.id, nome: i.name, categoria, descricao, imagem: i.id === RAYQUAZITE ? 'itens/rayquazite.png' : undefined });
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
  // Itens de batalha em ordem alfabética (pedido do dono)
  const batalha = itens.filter((i) => i.categoria === 'batalha').sort((a, b) => a.nome.localeCompare(b.nome, 'en'));
  return [...itens.filter((i) => i.categoria !== 'batalha'), ...batalha];
}

/** Todos os itens do jogo (Database, bolsa e Admin). */
export const TODOS_OS_ITENS: ItemLoja[] = [
  ...montarCatalogo(),
  // itens nossos: skins e itens-chave (sem uso por enquanto)
  ...ITENS_CUSTOM.map((i): ItemLoja => ({ ...i, preco: 0, naLoja: false })),
  ...TICKETS.map((t): ItemLoja => ({ id: t.id, nome: t.nome, categoria: 'tickets', descricao: t.descricao, preco: 0, naLoja: false, sprite: 'eon-ticket' })),
  // Chave Temporal: abre como um ticket (aba Tickets da bolsa)
  { id: CHAVE_TEMPORAL.id, nome: CHAVE_TEMPORAL.nome, categoria: 'tickets', descricao: CHAVE_TEMPORAL.descricao, preco: 0, naLoja: false, sprite: 'secret-key' },
  ...OVOS.map((o): ItemLoja => ({ id: o.id, nome: o.nome, categoria: 'ovos', descricao: o.descricao, preco: 0, naLoja: false })),
];
/** O que a loja vende. */
export const CATALOGO: ItemLoja[] = TODOS_OS_ITENS.filter((i) => i.naLoja);
const porId = new Map(TODOS_OS_ITENS.map((i) => [i.id, i]));

export function itemDaLoja(id: string): ItemLoja | undefined {
  return porId.get(id);
}
