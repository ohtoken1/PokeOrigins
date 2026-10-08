// Itens nossos (não existem no Showdown): skins de lendários e itens-chave de forma (Prison Bottle, DNA Splicers,
// Reveal Glass, Teal Mask). Por enquanto só existem e saem dos tickets; a utilidade vem depois (pedido do dono).

export type CategoriaCustom = 'skins' | 'chave';

export interface ItemCustom {
  id: string;
  nome: string;
  categoria: CategoriaCustom;
  descricao: string;
  /** imagem da PokéAPI (sprites/items/<sprite>.png) */
  sprite?: string;
  /** endereço completo da imagem */
  imagem?: string;
  /** skins: de qual Pokémon (o ícone mostra ele) */
  skin?: { especie: number; shiny: boolean };
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

export const ITENS_CUSTOM: ItemCustom[] = [
  ...COM_SKIN.flatMap(([especie, nome]): ItemCustom[] => [
    { id: idSkin(nome), nome: `Skin ${nome}`, categoria: 'skins', skin: { especie, shiny: false }, descricao: `Visual especial para o ${nome}. Uso em breve.` },
    { id: idSkin(nome, true), nome: `Skin ${nome} Shiny`, categoria: 'skins', skin: { especie, shiny: true }, descricao: `Visual especial para o ${nome} shiny. Uso em breve.` },
  ]),
  { id: 'prisonbottle', nome: 'Prison Bottle', categoria: 'chave', sprite: 'prison-bottle', descricao: 'Garrafa que liberta o Hoopa Unbound. Uso em breve.' },
  { id: 'dnasplicers', nome: 'DNA Splicers', categoria: 'chave', sprite: 'dna-splicers', descricao: 'Junta o Kyurem com Reshiram ou Zekrom (White/Black Kyurem). Uso em breve.' },
  { id: 'revealglass', nome: 'Reveal Glass', categoria: 'chave', sprite: 'reveal-glass', descricao: 'Troca Tornadus, Thundurus, Landorus e Enamorus entre as formas Incarnate e Therian. Uso em breve.' },
  { id: 'tealmask', nome: 'Teal Mask', categoria: 'chave', imagem: 'itens/tealmask.png', descricao: 'A máscara turquesa da Ogerpon. Uso em breve.' },
];
