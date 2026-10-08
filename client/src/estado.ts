// Save local no navegador. TEMPORÁRIO: quando o servidor existir, o save fica na conta do jogador.
import { atributosZerados, curar, gerarIndividuo, hpMaximo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { IV_INICIAL } from '../../shared/regioes';
import { ITENS_INICIAIS } from '../../shared/itens';
import { SILVER_INICIAL } from '../../shared/loja';
import { ehLendario } from '../../shared/encontros';
import { pokemonPorId } from './dados';
import type { Aparencia } from './personagem/lpc';
import type { EstadoPasse } from '../../shared/passe';

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
  /** Nome real (opcional, aba Opções). */
  nomeReal?: string;
  /** Mostrar o nome de treinador em cima do personagem (padrão: sim). */
  mostrarNome?: boolean;
  /** Insígnias conquistadas (ids dos líderes de ginásio, shared/ginasios.ts). */
  insignias?: string[];
  /** VIP: data/hora (ms) em que acaba (shared/vip.ts). PRÉ-SISTEMA: no MMO fica na conta. */
  vipAte?: number | null;
  /** Contadores para os rankings (capturas em batalha; ovos e tickets não contam). */
  estatisticas?: Estatisticas;
  /** Próximo ID de Pokémon (em ordem de captura). */
  proximoIdPokemon?: number;
  /** Passe de batalha: XP e missões do dia (client/src/passe.ts). */
  passe?: EstadoPasse;
  /** Quando virou treinador (ms). No MMO = data do cadastro da conta. */
  criadoEm?: number;
}

export interface Estatisticas {
  capturas: number;
  capturasShiny: number;
  /** Lendários, míticos e Ultra Beasts. */
  capturasLendarios: number;
  /** Total de medalhas de torneio (soma de ouro, prata e bronze). */
  medalhas: number;
  medalhasOuro?: number;
  medalhasPrata?: number;
  medalhasBronze?: number;
}

/** Conta uma captura feita em batalha (para os rankings). */
export function registrarCapturaNoRanking(save: Save, p: PokemonDoJogador): void {
  const e = save.estatisticas!;
  e.capturas++;
  if (p.shiny) e.capturasShiny++;
  if (ehLendario(pokemonPorId(p.especieId))) e.capturasLendarios++;
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
    criadoEm: Date.now(),
  };
}

/** Centro Pokémon: HP, status e PP de todo o time voltam ao máximo. */
export function curarTime(save: Save): void {
  for (const p of save.time) curar(p);
  salvar(save);
}

/** ID para mostrar: "#000001". */
export const formatarId = (uid: number) => `#${String(uid).padStart(6, '0')}`;

/**
 * Todo Pokémon do jogador tem um ID único em ordem de chegada: quem não tem (acabou de ser capturado, saiu de ovo
 * ou ticket) recebe o próximo número. Saves antigos: o inicial (NT) primeiro, depois o time e o PC na ordem em que estão.
 */
function garantirIds(save: Save): void {
  const todos = [...save.time, ...save.caixa];
  const usados = new Set<number>();
  let proximo = Math.max(save.proximoIdPokemon ?? 1, ...todos.map((p) => (p.uid ?? 0) + 1));
  const semId: PokemonDoJogador[] = [];
  for (const p of todos) {
    // ID repetido (cópia de objeto) também ganha um novo
    if (p.uid && !usados.has(p.uid)) usados.add(p.uid);
    else semId.push(p);
  }
  semId.sort((a, b) => Number(!!b.inegociavel) - Number(!!a.inegociavel));
  for (const p of semId) p.uid = proximo++;
  save.proximoIdPokemon = proximo;
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
  garantirIds(save);

  const itens: Record<string, number> = { ...ITENS_INICIAIS, ...(save.itens ?? {}) };
  if ('pokebola' in itens) {
    itens.pokeball = itens.pokebola;
    delete itens.pokebola;
  }
  save.itens = itens;
  save.silver ??= SILVER_INICIAL;
  save.gold ??= 0;
  save.xpTreinador ??= 0;
  // saves de antes da data de cadastro: conta a partir de quando abriu o jogo com esta versão
  save.criadoEm ??= Date.now();
  save.nivelEncontro ??= null;
  // saves antigos: começa o histórico com quem está no time e no PC
  save.capturados ??= [...new Set([...save.time, ...save.caixa].map((p) => p.especieId))];
  // saves antigos: começa a contar pelos Pokémon que o jogador tem hoje (menos o inicial NT)
  if (!save.estatisticas) {
    const tem = [...save.time, ...save.caixa].filter((p) => !p.inegociavel);
    save.estatisticas = {
      capturas: tem.length,
      capturasShiny: tem.filter((p) => p.shiny).length,
      capturasLendarios: tem.filter((p) => ehLendario(pokemonPorId(p.especieId))).length,
      medalhas: 0,
    };
  }
  return save;
}

/**
 * O save fica num objeto só, compartilhado por todas as telas e menus (cabeçalho, PC, Bolsa, Admin, batalha).
 * Antes cada um lia uma cópia do localStorage: um Pokémon capturado no bioma não aparecia na Bolsa/PC abertos
 * pelo cabeçalho até apertar F5 (e uma cópia velha podia apagar o que a outra salvou).
 */
let emMemoria: Save | null = null;

export function carregarSave(): Save | null {
  if (emMemoria) return emMemoria;
  try {
    const texto = localStorage.getItem(CHAVE);
    emMemoria = texto ? normalizar(JSON.parse(texto) as Save) : null;
    return emMemoria;
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
  // o save único em memória vale em qualquer tela (antes só região/bioma registravam o save: no Início os botões ficavam travados)
  const save = carregarSave() ?? saveEmUso;
  return save && (save.time.includes(p) || save.caixa.includes(p)) ? save : null;
}

// avisados a cada salvar (ex.: carteira do cabeçalho mostra silver/gold na hora)
const aoSalvarFns: ((save: Save) => void)[] = [];
export function aoSalvar(fn: (save: Save) => void): void {
  aoSalvarFns.push(fn);
}

export function salvar(save: Save): void {
  emMemoria = save;
  // quem entrou no time/PC desde o último save (captura, ovo, ticket…) ganha o ID único aqui
  garantirIds(save);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(save));
  } catch {
    // sem armazenamento disponível: o jogo continua, só não guarda o progresso
  }
  for (const fn of aoSalvarFns) fn(save);
}

export function apagarSave(): void {
  emMemoria = null;
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}
