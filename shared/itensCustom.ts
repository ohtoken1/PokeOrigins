// Itens nossos (não existem no Showdown): skins de lendários, cubos dos Pokémon do passado/futuro e itens-chave de forma (Prison Bottle, DNA Splicers,
// Reveal Glass, Teal Mask). Saem dos tickets. A skin escolhida como "bônus" dá bônus (shared/skins.ts);
// os itens-chave ainda não têm uso (pedido do dono).
import { TIPOS_DOS_CHARMS, idCharm, nomeCharm } from './charms';
import { BONUS_SKIN, BONUS_SKIN_SHINY, SKINS_ESPECIAIS, TEXTO_ORIGEM_SKIN, textoBonusSkin } from './skins';

export type CategoriaCustom = 'skins' | 'chave' | 'cubos' | 'charms';
/** De onde vem o Pokémon do cubo: do passado, do futuro ou lendário (Koraidon e Miraidon). */
export type EraCubo = 'passado' | 'futuro' | 'lendario';

export interface ItemCustom {
  id: string;
  nome: string;
  categoria: CategoriaCustom;
  descricao: string;
  /** imagem da PokéAPI (sprites/items/<sprite>.png) */
  sprite?: string;
  /** endereço completo da imagem */
  imagem?: string;
  /** charms: o tipo (o ícone é pintado na cor dele) */
  charm?: string;
  /** desenho provisório do ícone (itens ainda sem arte) */
  simbolo?: string;
  /** skins: de qual Pokémon (o ícone mostra ele) */
  skin?: { especie: number; shiny: boolean };
  /** cubos: de qual Pokémon (o ícone mostra ele dentro do cubo) */
  cubo?: { especie: number; era: EraCubo };
}

/** Lendários com skin nos tickets (número da Pokédex, nome). */
const COM_SKIN: [number, string][] = [
  [382, 'Kyogre'],
  [383, 'Groudon'],
  [487, 'Giratina'],
  [720, 'Hoopa'],
  [483, 'Dialga'],
  [484, 'Palkia'],
  [646, 'Kyurem'],
  [888, 'Zacian'],
  [889, 'Zamazenta'],
];

export const idSkin = (nome: string, shiny = false) => `skin-${nome.toLowerCase()}${shiny ? '-shiny' : ''}`;

/**
 * Pokémon do passado e do futuro (Paradox) e os dois lendários de Paldea: número da Pokédex, nome e de quem são a
 * versão de outra era (números da Pokédex). Não aparecem nos mapas: usar o cubo num Pokémon de origem transforma
 * ele (como uma pedra de evolução). O cubo sai da Chave Temporal (shared/tickets.ts) ou da loja do Viajante do tempo.
 */
export const POKEMON_DOS_CUBOS: Record<EraCubo, [number, string, number[]][]> = {
  passado: [
    [984, 'Great Tusk', [232]], // Donphan
    [985, 'Scream Tail', [39]], // Jigglypuff
    [986, 'Brute Bonnet', [591]], // Amoonguss
    [987, 'Flutter Mane', [200]], // Misdreavus
    [988, 'Slither Wing', [637]], // Volcarona
    [989, 'Sandy Shocks', [82]], // Magneton
    [1005, 'Roaring Moon', [373]], // Salamence
    [1009, 'Walking Wake', [245]], // Suicune
    [1020, 'Gouging Fire', [244]], // Entei
    [1021, 'Raging Bolt', [243]], // Raikou
  ],
  futuro: [
    [990, 'Iron Treads', [232]], // Donphan
    [991, 'Iron Bundle', [225]], // Delibird
    [992, 'Iron Hands', [297]], // Hariyama
    [993, 'Iron Jugulis', [635]], // Hydreigon
    [994, 'Iron Moth', [637]], // Volcarona
    [995, 'Iron Thorns', [248]], // Tyranitar
    [1006, 'Iron Valiant', [282, 475]], // Gardevoir ou Gallade
    [1010, 'Iron Leaves', [640]], // Virizion
    [1022, 'Iron Boulder', [639]], // Terrakion
    [1023, 'Iron Crown', [638]], // Cobalion
  ],
  lendario: [
    [1007, 'Koraidon', [967]], // Cyclizar
    [1008, 'Miraidon', [967]],
  ],
};
export const idCubo = (nome: string) => `cubo-${nome.toLowerCase().replace(/[^a-z]/g, '')}`;
/** ids dos cubos de uma era (para a Chave Temporal). */
export const cubosDaEra = (era: EraCubo): string[] => POKEMON_DOS_CUBOS[era].map(([, nome]) => idCubo(nome));
/** Nomes dos Pokémon de origem (para a descrição do item). */
const NOME_ORIGEM: Record<number, string> = { 232: 'Donphan', 39: 'Jigglypuff', 591: 'Amoonguss', 200: 'Misdreavus', 637: 'Volcarona', 82: 'Magneton', 373: 'Salamence', 245: 'Suicune', 244: 'Entei', 243: 'Raikou', 225: 'Delibird', 297: 'Hariyama', 635: 'Hydreigon', 248: 'Tyranitar', 282: 'Gardevoir', 475: 'Gallade', 640: 'Virizion', 639: 'Terrakion', 638: 'Cobalion', 967: 'Cyclizar' };
const TEXTO_ERA: Record<EraCubo, string> = { passado: 'do passado', futuro: 'do futuro', lendario: 'lendário de outra era' };

export interface Cubo {
  /** id do item na bolsa */
  id: string;
  nome: string;
  era: EraCubo;
  /** em quem o Pokémon de origem se transforma */
  especie: number;
  /** quem pode usar o cubo */
  origens: number[];
}
export const CUBOS: Cubo[] = (Object.keys(POKEMON_DOS_CUBOS) as EraCubo[]).flatMap((era) =>
  POKEMON_DOS_CUBOS[era].map(([especie, nome, origens]): Cubo => ({ id: idCubo(nome), nome: `Cubo de ${nome}`, era, especie, origens })));
export const cuboPorItem = (itemId: string): Cubo | undefined => CUBOS.find((c) => c.id === itemId);
/** O cubo que cria esta espécie (Iron Moth → Cubo de Iron Moth). */
export const cuboDaEspecie = (especie: number): Cubo | undefined => CUBOS.find((c) => c.especie === especie);
/** Os cubos que esta espécie pode usar (Volcarona → Slither Wing e Iron Moth). */
export const cubosDaOrigem = (especie: number): Cubo[] => CUBOS.filter((c) => c.origens.includes(especie));

/** Moeda da loja do Viajante do tempo (`save.fragmentos`). */
export const NOME_FRAGMENTO = 'Fragmento Temporal';
export const ICONE_FRAGMENTO = 'itens/fragmento-temporal.svg';
/** Preço de cada cubo em Fragmentos Temporais (provisório). */
export const PRECO_CUBO: Record<EraCubo, number> = { passado: 1, futuro: 1, lendario: 1 };

/** Moedas dos eventos sazonais (ainda sem imagem e sem uso: o dono vai desenhar). */
export const MOEDAS_SAZONAIS: { id: string; nome: string; evento: string }[] = [
  { id: 'moeda-quaquaval', nome: 'Quaquaval Coin', evento: 'Carnaval' },
  { id: 'moeda-bunnelby', nome: 'Bunnelby Coin', evento: 'Páscoa' },
  { id: 'moeda-enamorus', nome: 'Enamorus Coin', evento: 'Dia dos Namorados' },
  { id: 'moeda-pokeorigins', nome: 'Poke Origins Coin', evento: 'Aniversário do Poke Origins' },
  { id: 'moeda-mimikyu', nome: 'Mimikyu Coin', evento: 'Halloween' },
  { id: 'moeda-delibird', nome: 'Delibird Coin', evento: 'Natal' },
];
/** Selos dos eventos sazonais (pedido do dono: ficam na Database, fora da loja e do painel Admin; uso com o sistema sazonal). */
export const SELOS_SAZONAIS: { id: string; nome: string; evento: string }[] = [
  { id: 'selo-carnaval', nome: 'Selo do Carnaval', evento: 'Carnaval' },
  { id: 'selo-pascoa', nome: 'Selo da Páscoa', evento: 'Páscoa' },
  { id: 'selo-namorados', nome: 'Selo do Dia dos Namorados', evento: 'Dia dos Namorados' },
  { id: 'selo-aniversario', nome: 'Selo do Aniversário Poke Origins', evento: 'Aniversário do Poke Origins' },
  { id: 'selo-halloween', nome: 'Selo do Halloween', evento: 'Halloween' },
  { id: 'selo-natal', nome: 'Selo do Natal', evento: 'Natal' },
];
export const ehSeloSazonal = (id: string) => id.startsWith('selo-');
export const VALE_POKE_S = 'vale-poke-s';
export const KIT_INICIANTE = 'kit-iniciante';

export const ITENS_CUSTOM: ItemCustom[] = [
  ...SKINS_ESPECIAIS.map((s): ItemCustom => ({ id: s.id, nome: s.nome, categoria: 'skins', simbolo: s.simbolo, descricao: `${TEXTO_ORIGEM_SKIN[s.origem]}. Bônus ao escolher como skin de bônus: ${textoBonusSkin(s.bonus)}.` })),
  ...TIPOS_DOS_CHARMS.map((t): ItemCustom => ({ id: idCharm(t), nome: nomeCharm(t), categoria: 'charms', charm: t, descricao: `Amuleto raro: use para os Pokémon do tipo ${t[0].toUpperCase()}${t.slice(1)} terem 20% a mais de chance de aparecer shiny por 30 minutos. Só um deste tipo por vez.` })),
  ...SELOS_SAZONAIS.map((s): ItemCustom => ({ id: s.id, nome: s.nome, categoria: 'chave', simbolo: '🏵️', descricao: `Selo do evento de ${s.evento}. Uso em breve.` })),
  { id: VALE_POKE_S, nome: 'Vale Poke S', categoria: 'chave', simbolo: '🎟️', descricao: 'Procure a staff para ganhar um Pokémon à escolha S.' },
  { id: KIT_INICIANTE, nome: 'Kit iniciante', categoria: 'chave', simbolo: '🎒', descricao: 'Um kit para quem está começando. O conteúdo ainda vai ser definido. NT: não pode ser trocado.' },
  ...MOEDAS_SAZONAIS.map((m): ItemCustom => ({ id: m.id, nome: m.nome, categoria: 'chave', simbolo: '🪙', descricao: `Moeda do evento de ${m.evento}. Uso em breve.` })),
  ...CUBOS.map((c): ItemCustom => ({ id: c.id, nome: c.nome, categoria: 'cubos', cubo: { especie: c.especie, era: c.era }, descricao: `Transforma ${c.origens.map((n) => NOME_ORIGEM[n]).join(' ou ')} em ${c.nome.replace('Cubo de ', '')}, um Pokémon ${TEXTO_ERA[c.era]}. Use nele como uma pedra de evolução: IVs, EVs, natureza e shiny continuam os mesmos.` })),
  ...COM_SKIN.flatMap(([especie, nome]): ItemCustom[] => [
    { id: idSkin(nome), nome: `Skin ${nome}`, categoria: 'skins', skin: { especie, shiny: false }, descricao: `Visual especial para o ${nome}. Bônus ao escolher como skin de bônus: ${textoBonusSkin(BONUS_SKIN)}.` },
    { id: idSkin(nome, true), nome: `Skin ${nome} Shiny`, categoria: 'skins', skin: { especie, shiny: true }, descricao: `Visual especial para o ${nome} shiny. Bônus ao escolher como skin de bônus: ${textoBonusSkin(BONUS_SKIN_SHINY)}.` },
  ]),
  { id: 'prisonbottle', nome: 'Prison Bottle', categoria: 'chave', sprite: 'prison-bottle', descricao: 'Garrafa que liberta o Hoopa Unbound. Uso em breve.' },
  { id: 'dnasplicers', nome: 'DNA Splicers', categoria: 'chave', sprite: 'dna-splicers', descricao: 'Junta o Kyurem com Reshiram ou Zekrom (White/Black Kyurem). Uso em breve.' },
  { id: 'revealglass', nome: 'Reveal Glass', categoria: 'chave', sprite: 'reveal-glass', descricao: 'Troca Tornadus, Thundurus, Landorus e Enamorus entre as formas Incarnate e Therian. Uso em breve.' },
  { id: 'tealmask', nome: 'Teal Mask', categoria: 'chave', imagem: 'itens/tealmask.png', descricao: 'A máscara turquesa da Ogerpon. Uso em breve.' },
];
