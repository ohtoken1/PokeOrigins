// Biomas: cada um reúne os Pokémon que têm pelo menos um dos tipos listados.
// Um Pokémon de dois tipos pode aparecer em dois biomas (ex.: Geodude pedra/terra).
export interface Bioma {
  id: string;
  nome: string;
  descricao: string;
  tipos: string[];
  /** Faixa de nível dos Pokémon de primeiro estágio; evoluções somam +10 por estágio. */
  nivel: [number, number];
  /** Cores usadas para desenhar o mapa até termos arte própria. */
  cores: { chao: number; zona: number; detalhe: number; obstaculo: number };
}

export const BIOMAS: Bioma[] = [
  {
    id: 'grama',
    nome: 'Campos Verdes',
    descricao: 'Campos com Pokémon de grama, inseto, normais, elétricos e venenosos.',
    tipos: ['grass', 'bug', 'normal', 'electric', 'poison'],
    nivel: [2, 8],
    cores: { chao: 0x8fd16a, zona: 0x4f9e3a, detalhe: 0x2f6e22, obstaculo: 0x2b5a1e },
  },
  {
    id: 'agua',
    nome: 'Mar Profundo',
    descricao: 'Águas, correntes subaquáticas e mares gelados.',
    tipos: ['water', 'ice'],
    nivel: [4, 12],
    cores: { chao: 0x7fc8e8, zona: 0x2d7fb8, detalhe: 0x1b5a8a, obstaculo: 0x3c4a5a },
  },
  {
    id: 'vulcao',
    nome: 'Vulcão',
    descricao: 'Rochas quentes e rios de lava.',
    tipos: ['fire'],
    nivel: [8, 16],
    cores: { chao: 0x8a5a48, zona: 0xd2552a, detalhe: 0xffb03a, obstaculo: 0x3a2622 },
  },
  {
    id: 'caverna',
    nome: 'Caverna Rochosa',
    descricao: 'Túneis de pedra e terra, com lutadores, dragões e fadas.',
    tipos: ['rock', 'ground', 'fighting', 'steel', 'dragon', 'fairy'],
    nivel: [6, 14],
    cores: { chao: 0xa58e72, zona: 0x7a654e, detalhe: 0x544433, obstaculo: 0x3b3028 },
  },
  {
    id: 'torre',
    nome: 'Torre Assombrada',
    descricao: 'Fantasmas e Pokémon psíquicos vagam pelos andares.',
    tipos: ['ghost', 'psychic', 'dark'],
    nivel: [12, 20],
    cores: { chao: 0x5a4a6e, zona: 0x8a6ab8, detalhe: 0xd0b8ff, obstaculo: 0x2a2236 },
  },
];

export function biomaPorId(id: string): Bioma {
  const bioma = BIOMAS.find((b) => b.id === id);
  if (!bioma) throw new Error(`Bioma desconhecido: ${id}`);
  return bioma;
}
