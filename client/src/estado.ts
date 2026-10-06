// Save local no navegador. TEMPORÁRIO: quando o servidor existir, o save fica na conta do jogador.
import { atributosZerados, curar, gerarIndividuo, hpMaximo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { IV_INICIAL } from '../../shared/regioes';
import { ITENS_INICIAIS } from '../../shared/itens';
import { SILVER_INICIAL } from '../../shared/loja';
import { pokemonPorId } from './dados';
import type { Aparencia } from './personagem/lpc';

export type PokemonDoJogador = PokemonIndividual & {
  /** Box do PC onde está guardado (0 a NUMERO_BOXES − 1); só vale para quem está no PC. */
  box?: number;
};

export interface Save {
  regiao: string;
  time: PokemonDoJogador[];
  /** PC: Pokémon guardados fora do time. */
  caixa: PokemonDoJogador[];
  /** Quantidade de cada item na bolsa (id do item → quantidade). */
  itens: Record<string, number>;
  /** Moeda do jogo. */
  silver: number;
  /** Moeda paga (futuramente comprada; por enquanto o Admin dá). Começa em 0. */
  gold: number;
  passos: number;
  /** XP total do treinador (o nível sai de shared/treinador.ts). */
  xpTreinador: number;
  /** Nível escolhido para os encontros (treinador 35+); null = automático. */
  nivelEncontro: number | null;
  vistos: number[];
  /** Espécies que o jogador já teve (capturou, ganhou ou evoluiu), mesmo se soltou depois. */
  capturados: number[];
  /** Visual do personagem (camadas LPC + detalhes Pokémon); sem isso, usa APARENCIA_PADRAO. */
  aparencia?: Aparencia;
}

/** Marca a espécie como capturada na Pokédex. */
export function registrarCapturado(save: Save, especieId: number): void {
  if (!save.vistos.includes(especieId)) save.vistos.push(especieId);
  if (!save.capturados.includes(especieId)) save.capturados.push(especieId);
}

export const TAMANHO_MAXIMO_TIME = 6;
export const NUMERO_BOXES = 20;
export const TAMANHO_BOX = 30;

/** Pokémon da box, na ordem em que aparecem. */
export function pokemonsDaBox(save: Save, box: number): PokemonDoJogador[] {
  return save.caixa.filter((p) => p.box === box);
}

/**
 * Guarda no PC: na box `preferida` se couber, senão na próxima com espaço. Devolve a box usada.
 * (Com o PC todo cheio, fica na última box mesmo passando do limite.)
 */
export function guardarNoPC(save: Save, p: PokemonDoJogador, preferida = 0): number {
  let box = NUMERO_BOXES - 1;
  for (let i = 0; i < NUMERO_BOXES; i++) {
    const b = (preferida + i) % NUMERO_BOXES;
    if (pokemonsDaBox(save, b).length < TAMANHO_BOX) {
      box = b;
      break;
    }
  }
  p.box = box;
  save.caixa.push(p);
  return box;
}
const CHAVE = 'jogo-claude:save';

export function novoPokemon(especieId: number, nivel: number, shiny = false): PokemonDoJogador {
  return gerarIndividuo(especieId, nivel, { shiny, crescimento: pokemonPorId(especieId).crescimento });
}

/** Inicial: IVs 20 em tudo e inegociável (NT). */
function novoInicial(especieId: number): PokemonDoJogador {
  const p = novoPokemon(especieId, 5);
  for (const a of Object.keys(p.ivs) as (keyof typeof p.ivs)[]) p.ivs[a] = IV_INICIAL;
  p.hp = hpMaximo(p);
  p.inegociavel = true;
  p.ivsRevelados = true;
  return p;
}

export function novoSave(regiao: string, inicial: number, aparencia?: Aparencia): Save {
  return {
    regiao,
    aparencia,
    time: [novoInicial(inicial)],
    caixa: [],
    itens: { ...ITENS_INICIAIS },
    silver: SILVER_INICIAL,
    gold: 0,
    passos: 0,
    xpTreinador: 0,
    nivelEncontro: null,
    vistos: [inicial],
    capturados: [inicial],
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
    // o inicial já nasce com IVs conhecidos (20)
    if (novo.inegociavel) novo.ivsRevelados ??= true;
    return novo;
  };
  save.time = save.time.map(atualizar);
  save.caixa = (save.caixa ?? []).map(atualizar);
  // saves antigos (PC sem boxes): distribui pela ordem, 30 por box
  save.caixa.forEach((p, i) => (p.box ??= Math.min(NUMERO_BOXES - 1, Math.floor(i / TAMANHO_BOX))));

  const itens: Record<string, number> = { ...ITENS_INICIAIS, ...(save.itens ?? {}) };
  if ('pokebola' in itens) {
    itens.pokeball = itens.pokebola;
    delete itens.pokebola;
  }
  save.itens = itens;
  save.silver ??= SILVER_INICIAL;
  save.gold ??= 0;
  save.xpTreinador ??= 0;
  save.nivelEncontro ??= null;
  // saves antigos: começa o histórico com quem está no time e no PC
  save.capturados ??= [...new Set([...save.time, ...save.caixa].map((p) => p.especieId))];
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

// save da tela de jogo aberta (região/bioma): quem dono dos Pokémon mostrados nas fichas
let saveEmUso: Save | null = null;
export function usarSave(save: Save): void {
  saveEmUso = save;
}
/** O save em uso, se este Pokémon for dele (time ou PC). */
export function saveDoPokemon(p: PokemonDoJogador): Save | null {
  return saveEmUso && (saveEmUso.time.includes(p) || saveEmUso.caixa.includes(p)) ? saveEmUso : null;
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
