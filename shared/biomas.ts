// Biomas: cada um é uma lista de tipos. Cada Pokémon mora em UM bioma só, o do seu tipo principal
// (regra em `biomaDoPokemon`, shared/encontros.ts). Divisão em 6 biomas escolhida pelo dono.
export interface Bioma {
  id: string;
  nome: string;
  descricao: string;
  tipos: string[];
  /** Cores usadas para desenhar o mapa até termos arte própria. */
  cores: { chao: number; zona: number; detalhe: number; obstaculo: number };
}

export const BIOMAS: Bioma[] = [
  {
    id: 'grama',
    nome: 'Campos Verdes',
    descricao: 'Campos com Pokémon de grama, inseto, normais e venenosos.',
    tipos: ['grass', 'bug', 'normal', 'poison'],
    cores: { chao: 0x8fd16a, zona: 0x4f9e3a, detalhe: 0x2f6e22, obstaculo: 0x2b5a1e },
  },
  {
    id: 'agua',
    nome: 'Mar Profundo',
    descricao: 'Águas profundas e correntes subaquáticas.',
    tipos: ['water'],
    cores: { chao: 0x7fc8e8, zona: 0x2d7fb8, detalhe: 0x1b5a8a, obstaculo: 0x3c4a5a },
  },
  {
    id: 'vulcao',
    nome: 'Vulcão',
    descricao: 'Rochas quentes, rios de lava e Pokémon de fogo, de terra e dragões.',
    // dragão fica por último: só vale para quem é dragão puro (os outros vão pelo outro tipo)
    tipos: ['fire', 'ground', 'dragon'],
    cores: { chao: 0x8a5a48, zona: 0xd2552a, detalhe: 0xffb03a, obstaculo: 0x3a2622 },
  },
  {
    id: 'caverna',
    nome: 'Caverna Rochosa',
    descricao: 'Túneis de pedra, com Pokémon de pedra, de aço e lutadores.',
    tipos: ['rock', 'fighting', 'steel'],
    cores: { chao: 0xa58e72, zona: 0x7a654e, detalhe: 0x544433, obstaculo: 0x3b3028 },
  },
  {
    id: 'torre',
    nome: 'Torre Assombrada',
    descricao: 'Fantasmas e Pokémon psíquicos vagam pelos andares.',
    tipos: ['ghost', 'psychic', 'dark'],
    cores: { chao: 0x5a4a6e, zona: 0x8a6ab8, detalhe: 0xd0b8ff, obstaculo: 0x2a2236 },
  },
  {
    id: 'pico',
    nome: 'Pico Nevado',
    descricao: 'Montanha de neve e vento, com Pokémon de gelo, voadores, elétricos e fadas.',
    tipos: ['ice', 'flying', 'electric', 'fairy'],
    cores: { chao: 0xeef4fa, zona: 0x6fb2d2, detalhe: 0xa9dcf0, obstaculo: 0x24604a },
  },
];

export function biomaPorId(id: string): Bioma {
  const bioma = BIOMAS.find((b) => b.id === id);
  if (!bioma) throw new Error(`Bioma desconhecido: ${id}`);
  return bioma;
}
