// Save do jogador: fica na conta (servidor), com o objeto único em memória e uma cópia no navegador até chegar lá.
import { atributosZerados, curar, gerarIndividuo, hpMaximo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { IV_INICIAL } from '../../shared/regioes';
import { ITENS_INICIAIS } from '../../shared/itens';
import { SILVER_INICIAL } from '../../shared/loja';
import { ehLendario } from '../../shared/encontros';
import { pokemonPorId } from './dados';
import type { Aparencia } from './personagem/lpc';
import type { EstadoPasse } from '../../shared/passe';
import { api, ErroApi } from './conta';

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
  /** ANTIGO (opção removida da aba Opções). */
  nomeReal?: string;
  /** ANTIGO (opção removida: o nome aparece sempre). */
  mostrarNome?: boolean;
  /** Outros jogadores veem o time no perfil (padrão: sim). */
  mostrarTime?: boolean;
  /** Aceitar pedidos de troca de outros jogadores (padrão: sim; desligado recusa sozinho). */
  aceitarTrocas?: boolean;
  /** Aceitar desafios de duelo de outros jogadores (padrão: sim; desligado recusa sozinho). */
  aceitarDuelos?: boolean;
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
 *
 * O save mora na CONTA (servidor). `salvar` muda a memória na hora e manda para o servidor logo depois (juntando
 * vários salvamentos seguidos num envio só). Enquanto não chega, uma cópia fica no navegador (`pendente`): se a
 * página fechar antes, ela sobe no próximo login. `versao` evita que duas abas/computadores apaguem um ao outro.
 */
let emMemoria: Save | null = null;

export function carregarSave(): Save | null {
  return emMemoria;
}

/** Save que ficou no navegador antes das contas (para levar para a conta no primeiro login). */
export function saveAntigoDoNavegador(): Save | null {
  try {
    const texto = localStorage.getItem(CHAVE);
    return texto ? normalizar(JSON.parse(texto) as Save) : null;
  } catch {
    return null;
  }
}
/** Depois de levar o save antigo para a conta: guarda uma cópia de segurança e tira da chave antiga. */
export function arquivarSaveAntigo(): void {
  try {
    const texto = localStorage.getItem(CHAVE);
    if (texto) localStorage.setItem(`${CHAVE}-backup`, texto);
    localStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento
  }
}

// ---- sincronização com o servidor ----
type Copia = { save: Save; versao: number; pendente: boolean };
let contaId = 0;
let versao = 0;
let envio: ReturnType<typeof setTimeout> | undefined;
let enviando = false;
let pendente = false;
/** Recomeçar apaga no servidor; o próximo envio espera o apagar terminar (senão a versão não bate). */
let apagando: Promise<unknown> | null = null;
const ESPERA_ENVIO_MS = 1000;
const ESPERA_SEM_CONEXAO_MS = 5000;
const chaveCopia = () => `${CHAVE}-conta-${contaId}`;

export type EstadoSincronia = 'salvo' | 'salvando' | 'sem-conexao' | 'conflito' | 'sessao';
const aoMudarSincroniaFns: ((estado: EstadoSincronia, mensagem?: string) => void)[] = [];
export const aoMudarSincronia = (fn: (estado: EstadoSincronia, mensagem?: string) => void) => void aoMudarSincroniaFns.push(fn);
const avisar = (estado: EstadoSincronia, mensagem?: string) => aoMudarSincroniaFns.forEach((fn) => fn(estado, mensagem));

function guardarCopia(): void {
  if (!emMemoria || !contaId) return;
  try {
    localStorage.setItem(chaveCopia(), JSON.stringify({ save: emMemoria, versao, pendente } satisfies Copia));
  } catch {
    // sem espaço: o servidor continua sendo a fonte
  }
}

/**
 * Começa a sessão de jogo com o save que veio do servidor. Se ficou no navegador uma cópia ainda não enviada
 * da MESMA versão (a página fechou antes de mandar), ela é mais nova: entra no lugar e sobe agora.
 */
export function iniciarSaveDaConta(id: number, doServidor: Save | null, versaoServidor: number): void {
  contaId = id;
  versao = versaoServidor;
  emMemoria = doServidor ? normalizar(doServidor) : null;
  try {
    const copia = JSON.parse(localStorage.getItem(chaveCopia()) ?? 'null') as Copia | null;
    if (copia?.pendente && copia.versao === versaoServidor) {
      emMemoria = normalizar(copia.save);
      agendarEnvio(0);
    } else localStorage.removeItem(chaveCopia());
  } catch {
    // cópia estragada: vale a do servidor
  }
}

function agendarEnvio(espera = ESPERA_ENVIO_MS): void {
  pendente = true;
  avisar('salvando');
  clearTimeout(envio);
  envio = setTimeout(enviar, espera);
}

async function enviar(): Promise<void> {
  if (enviando) return agendarEnvio();
  if (!emMemoria || !pendente) return;
  enviando = true;
  pendente = false;
  try {
    if (apagando) await apagando;
    const r = await api<{ versao: number }>('PUT', '/save', { save: emMemoria, versao });
    versao = r.versao;
    guardarCopia();
    if (!pendente) avisar('salvo');
  } catch (e) {
    pendente = true;
    guardarCopia();
    const status = e instanceof ErroApi ? e.status : 0;
    if (status === 409) avisar('conflito', (e as Error).message);
    else if (status === 401) avisar('sessao', (e as Error).message);
    else {
      avisar('sem-conexao', status ? (e as Error).message : undefined);
      envio = setTimeout(enviar, ESPERA_SEM_CONEXAO_MS);
    }
  } finally {
    enviando = false;
  }
}

// fechando a página com algo por enviar: tenta mandar (a cópia local cobre se não der)
window.addEventListener('pagehide', () => {
  if (!pendente || !emMemoria || enviando) return;
  const corpo = { save: emMemoria, versao };
  // keepalive só aceita pedidos pequenos
  if (JSON.stringify(corpo).length < 60_000) void api('PUT', '/save', corpo, { keepalive: true }).catch(() => {});
});

/** Manda agora o que estiver pendente e espera chegar (antes de ações que o servidor confere no save, como trocas). */
export async function salvarAgora(): Promise<void> {
  clearTimeout(envio);
  for (let i = 0; i < 50 && enviando; i++) await new Promise((ok) => setTimeout(ok, 100));
  if (pendente) await enviar();
  if (pendente) throw new ErroApi('Não foi possível salvar seu progresso agora. Tente de novo.', 0);
}

/**
 * O servidor mudou o save (ex.: troca feita): troca o conteúdo do objeto único em memória pelo do servidor,
 * mantendo o MESMO objeto (as telas abertas seguram a referência) e avisa quem escuta `aoSalvar`.
 */
export function adotarSaveDoServidor(doServidor: Save, versaoServidor: number): void {
  clearTimeout(envio);
  pendente = false;
  versao = versaoServidor;
  const novo = normalizar(doServidor);
  if (emMemoria) {
    for (const chave of Object.keys(emMemoria)) delete (emMemoria as unknown as Record<string, unknown>)[chave];
    Object.assign(emMemoria, novo);
  } else emMemoria = novo;
  guardarCopia();
  avisar('salvo');
  for (const fn of aoSalvarFns) fn(emMemoria);
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
  pendente = true;
  guardarCopia();
  agendarEnvio();
  for (const fn of aoSalvarFns) fn(save);
}

export function apagarSave(): void {
  emMemoria = null;
  pendente = false;
  clearTimeout(envio);
  try {
    localStorage.removeItem(chaveCopia());
  } catch {
    // idem
  }
  apagando = api<{ versao: number }>('DELETE', '/save')
    .then((r) => (versao = r.versao))
    .catch(() => avisar('sem-conexao'))
    .finally(() => (apagando = null));
}
