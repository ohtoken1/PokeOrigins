export interface Regiao {
  id: string;
  nome: string;
  /** Faixa de números da Pokédex nacional que pertence à região. */
  pokedex: [number, number];
  iniciais: number[];
  /** false = aparece no menu como "em breve". */
  disponivel: boolean;
}

export const REGIOES: Regiao[] = [
  { id: 'kanto', nome: 'Kanto', pokedex: [1, 151], iniciais: [1, 4, 7], disponivel: true },
  { id: 'johto', nome: 'Johto', pokedex: [152, 251], iniciais: [152, 155, 158], disponivel: false },
  { id: 'hoenn', nome: 'Hoenn', pokedex: [252, 386], iniciais: [252, 255, 258], disponivel: false },
  { id: 'sinnoh', nome: 'Sinnoh', pokedex: [387, 493], iniciais: [387, 390, 393], disponivel: false },
  { id: 'unova', nome: 'Unova', pokedex: [494, 649], iniciais: [495, 498, 501], disponivel: false },
  { id: 'kalos', nome: 'Kalos', pokedex: [650, 721], iniciais: [650, 653, 656], disponivel: false },
  { id: 'alola', nome: 'Alola', pokedex: [722, 809], iniciais: [722, 725, 728], disponivel: false },
  { id: 'galar', nome: 'Galar', pokedex: [810, 905], iniciais: [810, 813, 816], disponivel: false },
  { id: 'paldea', nome: 'Paldea', pokedex: [906, 1025], iniciais: [906, 909, 912], disponivel: false },
];

export function regiaoPorId(id: string): Regiao {
  const regiao = REGIOES.find((r) => r.id === id);
  if (!regiao) throw new Error(`Região desconhecida: ${id}`);
  return regiao;
}
