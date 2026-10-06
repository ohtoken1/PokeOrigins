// Save local no navegador. TEMPORÁRIO: quando o servidor existir, o save fica na conta do jogador.
import { atributosZerados, curar, gerarIndividuo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { ITENS_INICIAIS } from '../../shared/itens';
import { SILVER_INICIAL } from '../../shared/loja';
import { pokemonPorId } from './dados';

export type PokemonDoJogador = PokemonIndividual;

export interface Save {
  regiao: string;
  time: PokemonDoJogador[];
  /** PC: Pokémon guardados fora do time. */
  caixa: PokemonDoJogador[];
  /** Quantidade de cada item na bolsa (id do item → quantidade). */
  itens: Record<string, number>;
  /** Moeda do jogo. */
  silver: number;
  passos: number;
  /** XP total do treinador (o nível sai de shared/treinador.ts). */
  xpTreinador: number;
  /** Nível escolhido para os encontros (treinador 35+); null = automático. */
  nivelEncontro: number | null;
  vistos: number[];
}

export const TAMANHO_MAXIMO_TIME = 6;
const CHAVE = 'jogo-claude:save';

export function novoPokemon(especieId: number, nivel: number, shiny = false): PokemonDoJogador {
  return gerarIndividuo(especieId, nivel, { shiny, crescimento: pokemonPorId(especieId).crescimento });
}

export function novoSave(regiao: string, inicial: number): Save {
  return {
    regiao,
    time: [novoPokemon(inicial, 5)],
    caixa: [],
    itens: { ...ITENS_INICIAIS },
    silver: SILVER_INICIAL,
    passos: 0,
    xpTreinador: 0,
    nivelEncontro: null,
    vistos: [inicial],
  };
}

/** Centro Pokémon: HP, status e PP de todo o time voltam ao máximo. */
export function curarTime(save: Save): void {
  for (const p of save.time) curar(p);
  salvar(save);
}

/** Completa saves de versões antigas do jogo com os campos novos. */
function normalizar(save: Save): Save {
  const atualizar = (p: PokemonDoJogador) => {
    const novo = p.golpes ? p : novoPokemon(p.especieId, p.nivel, p.shiny);
    novo.evs ??= atributosZerados();
    return novo;
  };
  save.time = save.time.map(atualizar);
  save.caixa = (save.caixa ?? []).map(atualizar);

  const itens: Record<string, number> = { ...ITENS_INICIAIS, ...(save.itens ?? {}) };
  if ('pokebola' in itens) {
    itens.pokeball = itens.pokebola;
    delete itens.pokebola;
  }
  save.itens = itens;
  save.silver ??= SILVER_INICIAL;
  save.xpTreinador ??= 0;
  save.nivelEncontro ??= null;
  return save;
}

export function carregarSave(): Save | null {
  try {
    const texto = localStorage.getItem(CHAVE);
    return texto ? normalizar(JSON.parse(texto) as Save) : null;
  } catch {
    return null;
  }
}

export function salvar(save: Save): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(save));
  } catch {
    // sem armazenamento disponível: o jogo continua, só não guarda o progresso
  }
}

export function apagarSave(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}
