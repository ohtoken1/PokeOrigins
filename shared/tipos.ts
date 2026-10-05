// Formato dos dados gerados por scripts/baixar-pokeapi.mjs (shared/data/pokemon-<regiao>.json).
export interface PokemonBase {
  id: number;
  nome: string;
  slug: string;
  tipos: string[];
  stats: {
    hp: number;
    ataque: number;
    defesa: number;
    ataqueEspecial: number;
    defesaEspecial: number;
    velocidade: number;
  };
  altura: number;
  peso: number;
  experienciaBase: number | null;
  taxaCaptura: number;
  crescimento: string | null;
  lendario: boolean;
  mitico: boolean;
  bebe: boolean;
  evoluiDe: string | null;
  cadeiaEvolucao: number;
  habilidades: { nome: string; oculta: boolean }[];
  sprites: {
    frente: string | null;
    frenteShiny: string | null;
    costas: string | null;
    costasShiny: string | null;
    gif: string | null;
    gifShiny: string | null;
    gifCostas: string | null;
    gifCostasShiny: string | null;
  };
}
