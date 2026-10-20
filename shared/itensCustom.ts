// Itens nossos (não existem no Showdown): skins de lendários, cubos dos Pokémon do passado/futuro e itens-chave de forma (Prison Bottle, DNA Splicers,
// Reveal Glass, Teal Mask). Saem dos tickets. A skin escolhida como "bônus" dá bônus (shared/skins.ts);
// os itens-chave de forma são USADOS pela bolsa (regras em shared/formasPorItem.ts); são gastos a cada uso. As máscaras da Ogerpon são itens de evolução.
import { TIPOS_DOS_CHARMS, idCharm, nomeCharm } from './charms';
import { CORES_DOS_APRICORNS, TIPOS_DAS_ENERGIAS, idApricorn, idEnergia, nomeApricorn, nomeEnergia } from './materiais';
import { BONUS_SKIN, BONUS_SKIN_SHINY, SKINS_ESPECIAIS, TEXTO_ORIGEM_SKIN, textoBonusSkin } from './skins';

export type CategoriaCustom = 'skins' | 'chave' | 'cubos' | 'charms' | 'evolucao' | 'formas' | 'materiais' | 'tickets' | 'mints';
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
  /** Energies: o tipo (o ícone é uma esfera na cor dele) */
  energia?: string;
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
  // pedido do dono: os lendários não precisam de origem, o cubo GERA o Pokémon (IVs aleatórios)
  lendario: [
    [1007, 'Koraidon', []],
    [1008, 'Miraidon', []],
  ],
};
export const idCubo = (nome: string) => `cubo-${nome.toLowerCase().replace(/[^a-z]/g, '')}`;
/** ids dos cubos de uma era (para a Chave Temporal). */
export const cubosDaEra = (era: EraCubo): string[] => POKEMON_DOS_CUBOS[era].map(([, nome]) => idCubo(nome));
/** Nomes dos Pokémon de origem (para a descrição do item). */
const NOME_ORIGEM: Record<number, string> = { 232: 'Donphan', 39: 'Jigglypuff', 591: 'Amoonguss', 200: 'Misdreavus', 637: 'Volcarona', 82: 'Magneton', 373: 'Salamence', 245: 'Suicune', 244: 'Entei', 243: 'Raikou', 225: 'Delibird', 297: 'Hariyama', 635: 'Hydreigon', 248: 'Tyranitar', 282: 'Gardevoir', 475: 'Gallade', 640: 'Virizion', 639: 'Terrakion', 638: 'Cobalion' };
const TEXTO_ERA: Record<EraCubo, string> = { passado: 'do passado', futuro: 'do futuro', lendario: 'lendário de outra era' };

export interface Cubo {
  /** id do item na bolsa */
  id: string;
  nome: string;
  era: EraCubo;
  /** em quem o Pokémon de origem se transforma */
  especie: number;
  /** quem pode usar o cubo (vazio = o cubo gera o Pokémon direto: Koraidon e Miraidon) */
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
/** Preço de cada cubo em Fragmentos Temporais (pedido do dono: 25; Koraidon e Miraidon 100). */
export const PRECO_CUBO: Record<EraCubo, number> = { passado: 25, futuro: 25, lendario: 100 };
/** Quanto o Viajante do tempo devolve ao desmontar um cubo que o jogador não quer (metade do preço). */
/** A Chave Temporal também é vendida pelo Viajante (pedido do dono). */
export const PRECO_CHAVE_TEMPORAL = 10;
export const RECICLAGEM_CUBO: Record<EraCubo, number> = { passado: 12, futuro: 12, lendario: 50 };

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

/**
 * Seletores de Orb (pedido do dono): usados pela bolsa, o jogador ESCOLHE uma das Orbs da lista e ganha 1 dela.
 * Não existem seletor nem Orb NT (pedido do dono). Novos seletores: acrescentar aqui (ids das Orbs = `ticket-<nome>`).
 */
export const SELETORES_ORB: { id: string; nome: string; orbs: string[] }[] = [
  { id: 'seletor-orb-1', nome: 'Seletor de Orb 1', orbs: ['ticket-giratina', 'ticket-dialga', 'ticket-palkia'] },
  { id: 'seletor-orb-2', nome: 'Seletor de Orb 2', orbs: ['ticket-kyogre', 'ticket-groudon'] },
  { id: 'seletor-orb-3', nome: 'Seletor de Orb 3', orbs: ['ticket-kyogre', 'ticket-groudon', 'ticket-giratina', 'ticket-hoopa', 'ticket-dialga', 'ticket-palkia', 'ticket-therian', 'ticket-kyurem', 'ticket-zacian', 'ticket-zamazenta', 'ticket-ogerpon'] },
];
export const seletorDeOrb = (id: string) => SELETORES_ORB.find((s) => s.id === id);
/** Seletores de Mint e de Charm (Loja da Liga Nightmare): usados pela bolsa, o jogador escolhe 1 Mint / 1 Charm. */
export const SELETORES_ITEM: { id: string; nome: string; categoria: 'mints' | 'charms'; descricao: string }[] = [
  { id: 'seletor-mint', nome: 'Seletor de Mint', categoria: 'mints', descricao: 'Use pela bolsa e escolha 1 Mint (qualquer Nature).' },
  { id: 'seletor-charm', nome: 'Seletor de Charm', categoria: 'charms', descricao: 'Use pela bolsa e escolha 1 Charm (qualquer tipo).' },
];
export const seletorDeItem = (id: string) => SELETORES_ITEM.find((s) => s.id === id);

export const ITENS_CUSTOM: ItemCustom[] = [
  ...SELETORES_ITEM.map((s): ItemCustom => ({ id: s.id, nome: s.nome, categoria: s.categoria, simbolo: s.categoria === 'mints' ? '🌿' : '✨', descricao: s.descricao })),
  ...SELETORES_ORB.map((s): ItemCustom => ({ id: s.id, nome: s.nome, categoria: 'tickets', simbolo: '🔮', descricao: `Use pela bolsa e escolha 1 Orb entre: ${s.orbs.map((o) => o.slice(7).replace(/^./, (c) => c.toUpperCase())).join(', ')}.` })),
  ...SKINS_ESPECIAIS.map((s): ItemCustom => ({ id: s.id, nome: s.nome, categoria: 'skins', simbolo: s.simbolo, descricao: `${TEXTO_ORIGEM_SKIN[s.origem]}. Bônus ao escolher como skin de bônus: ${textoBonusSkin(s.bonus)}.` })),
  // materiais de craft (o sistema de craft vem depois)
  ...TIPOS_DAS_ENERGIAS.map((t): ItemCustom => ({ id: idEnergia(t), nome: nomeEnergia(t), categoria: 'materiais', energia: t, descricao: `Energia do tipo ${t[0].toUpperCase()}${t.slice(1)}. Às vezes fica para trás quando você derrota ou captura um Pokémon selvagem desse tipo. Material de craft.` })),
  ...CORES_DOS_APRICORNS.map((cor): ItemCustom => ({ id: idApricorn(cor), nome: nomeApricorn(cor), categoria: 'materiais', sprite: `${cor}-apricorn`, descricao: 'Um Apricorn. Material de craft.' })),
  ...TIPOS_DOS_CHARMS.map((t): ItemCustom => ({ id: idCharm(t), nome: nomeCharm(t), categoria: 'charms', charm: t, descricao: `Amuleto raro: use para os Pokémon do tipo ${t[0].toUpperCase()}${t.slice(1)} terem 20% a mais de chance de aparecer shiny por 30 minutos. Só um deste tipo por vez.` })),
  ...SELOS_SAZONAIS.map((s): ItemCustom => ({ id: s.id, nome: s.nome, categoria: 'chave', simbolo: '🏵️', descricao: `Selo do evento de ${s.evento}. Item de coleção: aparece no seu perfil, não na bolsa.` })),
  { id: VALE_POKE_S, nome: 'Vale Poke S', categoria: 'chave', simbolo: '🎟️', descricao: 'Procure a staff para ganhar um Pokémon à escolha S.' },
  { id: 'passe-premium', nome: 'Passe Premium', categoria: 'chave', simbolo: '👑', descricao: 'Libera a trilha premium do passe de batalha da temporada em vigor. Use pela bolsa.' },
  { id: KIT_INICIANTE, nome: 'Kit iniciante', categoria: 'chave', simbolo: '🎒', descricao: 'Um kit para quem está começando: 50 Poké Balls, 30 Great Balls, 20 Ultra Balls, 10 Potions, 7 Super Potions, 5 Hyper Potions, 7 Revives, 1 Max Revive, 20.000 Poké Dólares, uma skin sorteada (Ash, Gary, May ou Misty) e um Charm sorteado. O kit e os itens dele são NT: não podem ser trocados.' },
  ...MOEDAS_SAZONAIS.map((m): ItemCustom => ({ id: m.id, nome: m.nome, categoria: 'chave', simbolo: '🪙', descricao: `Moeda do evento de ${m.evento}. Uso em breve.` })),
  ...CUBOS.map((c): ItemCustom => ({ id: c.id, nome: c.nome, categoria: 'cubos', cubo: { especie: c.especie, era: c.era }, descricao: !c.origens.length
    ? `Gera um ${c.nome.replace('Cubo de ', '')}, um Pokémon ${TEXTO_ERA[c.era]}, nível 1 e com IVs de 10 a 31 em cada atributo. Use pela bolsa.`
    : `Transforma ${c.origens.map((n) => NOME_ORIGEM[n]).join(' ou ')} em ${c.nome.replace('Cubo de ', '')}, um Pokémon ${TEXTO_ERA[c.era]}. Use nele como uma pedra de evolução: IVs, EVs, natureza e shiny continuam os mesmos.` })),
  ...COM_SKIN.flatMap(([especie, nome]): ItemCustom[] => [
    { id: idSkin(nome), nome: `Skin ${nome}`, categoria: 'skins', skin: { especie, shiny: false }, descricao: `Visual especial para o ${nome}. Bônus ao escolher como skin de bônus: ${textoBonusSkin(BONUS_SKIN)}.` },
    { id: idSkin(nome, true), nome: `Skin ${nome} Shiny`, categoria: 'skins', skin: { especie, shiny: true }, descricao: `Visual especial para o ${nome} shiny. Bônus ao escolher como skin de bônus: ${textoBonusSkin(BONUS_SKIN_SHINY)}.` },
  ]),
  { id: 'prisonbottle', nome: 'Prison Bottle', categoria: 'formas', sprite: 'prison-bottle', descricao: 'Muda o Hoopa para a forma Unbound. Não tem volta. É gasto no uso.' },
  { id: 'dnasplicers', nome: 'DNA Splicers', categoria: 'formas', sprite: 'dna-splicers', descricao: 'Junta o Kyurem com o Zekrom (Black Kyurem) ou o Reshiram (White Kyurem) que estiver no time. Não tem volta. É gasto no uso.' },
  { id: 'revealglass', nome: 'Reveal Glass', categoria: 'formas', sprite: 'reveal-glass', descricao: 'Muda Tornadus, Thundurus, Landorus e Enamorus para a forma Therian. Não tem volta. É gasto no uso.' },
  // itens de forma dos jogos oficiais (regras em shared/formasPorItem.ts); ícones oficiais da PokéAPI e do Serebii
  { id: 'gracidea', nome: 'Gracidea', categoria: 'formas', sprite: 'gracidea', descricao: 'Muda o Shaymin para a forma Sky. Não tem volta. É gasta no uso.' },
  { id: 'meteorite', nome: 'Meteorite', categoria: 'formas', sprite: 'meteorite', descricao: 'Muda o Deoxys para a forma Attack, Defense ou Speed (você escolhe). Não tem volta. É gasto no uso.' },
  { id: 'rotomcatalog', nome: 'Rotom Catalog', categoria: 'formas', imagem: 'itens/rotomcatalog.png', descricao: 'Muda o Rotom para Heat, Wash, Frost, Fan ou Mow (você escolhe). Não tem volta. É gasto no uso.' },
  { id: 'zygardecube', nome: 'Zygarde Cube', categoria: 'formas', sprite: 'zygarde-cube', descricao: 'Muda o Zygarde 50% para a forma 10%. Não tem volta. É gasto no uso.' },
  { id: 'nsolarizer', nome: 'N-Solarizer', categoria: 'formas', imagem: 'itens/nsolarizer.png', descricao: 'Junta o Necrozma com o Solgaleo que estiver no time (Dusk Mane). Não tem volta. É gasto no uso.' },
  { id: 'nlunarizer', nome: 'N-Lunarizer', categoria: 'formas', imagem: 'itens/nlunarizer.png', descricao: 'Junta o Necrozma com a Lunala que estiver no time (Dawn Wings). Não tem volta. É gasto no uso.' },
  { id: 'reinsofunity', nome: 'Reins of Unity', categoria: 'formas', imagem: 'itens/reinsofunity.png', descricao: 'Junta o Calyrex com o Glastrier (Ice Rider) ou o Spectrier (Shadow Rider) que estiver no time. Não tem volta. É gasto no uso.' },
  { id: 'scrollofdarkness', nome: 'Scroll of Darkness', categoria: 'evolucao', imagem: 'itens/scrollofdarkness.png', descricao: 'Evolui o Kubfu para Urshifu Single Strike (Fighting/Dark). É gasto.' },
  { id: 'scrollofwaters', nome: 'Scroll of Waters', categoria: 'evolucao', imagem: 'itens/scrollofwaters.png', descricao: 'Evolui o Kubfu para Urshifu Rapid Strike (Fighting/Water). É gasto.' },
  // pedras nossas (pedido do dono), desenhadas no molde das pedras de evolução; fora da loja por enquanto
  { id: 'peatblocksangrento', nome: 'Peat Block Sangrento', categoria: 'evolucao', imagem: 'itens/peatblocksangrento.svg', descricao: 'Bloco de turfa encharcado de vermelho, da cor da lua de sangue. Evolui o Ursaring para Ursaluna (Bloodmoon). É gasto.' },
  { id: 'goldstone', nome: 'Gold Stone', categoria: 'evolucao', imagem: 'itens/goldstone.svg', descricao: 'Pedra de ouro maciço. Evolui o Gimmighoul para Gholdengo. É gasta.' },
  { id: 'tealmask',nome: 'Teal Mask', categoria: 'evolucao', imagem: 'itens/tealmask.png', descricao: 'A máscara original da Ogerpon. Usada numa Ogerpon de outra máscara, ela volta para a forma padrão. É gasta.' },
];

/** Nível do Koraidon/Miraidon gerado pelo cubo (como os Pokémon de Orbs e ovos). */
export const NIVEL_CUBO_LENDARIO = 1;
/** IV mínimo de cada atributo do Koraidon/Miraidon gerado pelo cubo (pedido do dono: 10 a 31). */
export const IV_MINIMO_CUBO_LENDARIO = 10;
/** Chance de shiny do Koraidon/Miraidon gerado pelo cubo (a mesma das Orbs). */
export const CHANCE_SHINY_CUBO_LENDARIO = 0.05;
