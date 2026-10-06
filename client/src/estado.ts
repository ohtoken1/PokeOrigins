// Save local no navegador. TEMPORÁRIO: quando o servidor existir, o save fica na conta do jogador.
import { atributosZerados, curar, gerarIndividuo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { ITENS, ITENS_INICIAIS, type ItemId } from '../../shared/itens';
import { pokemonPorId } from './dados';

export type PokemonDoJogador = PokemonIndividual;

export interface Save {
  regiao: string;
  time: PokemonDoJogador[];
  /** PC: Pokémon guardados fora do time. */
  caixa: PokemonDoJogador[];
  itens: Record<ItemId, number>;
  passos: number;
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
    passos: 0,
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

  const antigos = (save.itens ?? {}) as Record<string, number>;
  const renomeados: Record<string, string> = { pokebola: 'pokeball' };
  const itens = { ...ITENS_INICIAIS };
  for (const id of Object.keys(ITENS) as ItemId[]) {
    const antigo = Object.entries(renomeados).find(([, novo]) => novo === id)?.[0];
    itens[id] = antigos[id] ?? (antigo ? antigos[antigo] : undefined) ?? ITENS_INICIAIS[id];
  }
  save.itens = itens;
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
