// Sorteio de Pokémon selvagens. Fica em shared/ porque, no MMO, quem vai sortear é o
// servidor (para ninguém trapacear); por enquanto o cliente usa o mesmo código.
import { BIOMAS, type Bioma } from './biomas';
import type { PokemonBase } from './tipos';

/** Chance de um Pokémon ser shiny. O original é 1/4096; aqui é configurável. */
export const CHANCE_SHINY = 1 / 512;
/** Chance de aparecer um Pokémon a cada passo (1 = todo passo). */
export const CHANCE_ENCONTRO_POR_PASSO = 1;
/** Peso fixo de lendários e míticos no sorteio (um comum tem ~45 a 255): ~0,1% num bioma. */
export const PESO_LENDARIO = 1;
/** Nível dos lendários, como nos jogos originais de Kanto. */
export const NIVEL_LENDARIO = 50;

export interface EntradaTabela {
  pokemon: PokemonBase;
  /** Peso no sorteio; quanto maior, mais comum. Usa a taxa de captura oficial. */
  peso: number;
  /** 1 = forma básica, 2 = primeira evolução, 3 = segunda evolução. */
  estagio: number;
}

export interface Encontro {
  pokemon: PokemonBase;
  nivel: number;
  shiny: boolean;
}

/**
 * Cada Pokémon mora em um único bioma: o do seu tipo principal (o primeiro).
 * Se nenhum bioma tiver o tipo principal, vale o segundo tipo.
 */
export function biomaDoPokemon(p: PokemonBase): string | null {
  for (const tipo of p.tipos) {
    const bioma = BIOMAS.find((b) => b.tipos.includes(tipo));
    if (bioma) return bioma.id;
  }
  return null;
}

export function montarTabela(bioma: Bioma, pokemons: PokemonBase[], excluir: number[] = []): EntradaTabela[] {
  const porSlug = new Map(pokemons.map((p) => [p.slug, p]));
  const estagio = (p: PokemonBase): number => {
    const anterior = p.evoluiDe ? porSlug.get(p.evoluiDe) : undefined;
    return anterior ? 1 + estagio(anterior) : 1;
  };

  return pokemons
    .filter((p) => !excluir.includes(p.id))
    .filter((p) => biomaDoPokemon(p) === bioma.id)
    .map((p) => ({
      pokemon: p,
      peso: p.lendario || p.mitico ? PESO_LENDARIO : Math.max(1, p.taxaCaptura),
      estagio: estagio(p),
    }));
}

/** Probabilidade (0 a 1) de cada entrada sair, na mesma ordem da tabela. */
export function probabilidades(tabela: EntradaTabela[]): number[] {
  const total = tabela.reduce((soma, e) => soma + e.peso, 0);
  return tabela.map((e) => e.peso / total);
}

export function sortearEncontro(tabela: EntradaTabela[], bioma: Bioma, aleatorio = Math.random): Encontro {
  const total = tabela.reduce((soma, e) => soma + e.peso, 0);
  let sorteio = aleatorio() * total;
  let escolhido = tabela[tabela.length - 1];
  for (const entrada of tabela) {
    sorteio -= entrada.peso;
    if (sorteio < 0) {
      escolhido = entrada;
      break;
    }
  }
  const [min, max] = bioma.nivel;
  const lendario = escolhido.pokemon.lendario || escolhido.pokemon.mitico;
  const nivel = lendario ? NIVEL_LENDARIO : Math.min(100, min + Math.floor(aleatorio() * (max - min + 1)) + (escolhido.estagio - 1) * 10);
  return { pokemon: escolhido.pokemon, nivel, shiny: aleatorio() < CHANCE_SHINY };
}
