// Ponte entre o servidor e o código do JOGO (shared/batalha/pvp.ts e os dados das espécies em client/src/dados.ts).
// Esses arquivos são escritos para o navegador (imports sem ".ts"); o servidor consegue rodá-los graças aos ganchos
// de importarShared.mjs + a opção --experimental-transform-types (scripts do server/package.json).
// Os tipos abaixo são só o pedaço que o servidor usa: o tsc do servidor não lê o código do jogo.

export type EspecialPvp = 'z' | 'tera' | 'mega' | 'dynamax' | null;
export type EscolhaPvp = { tipo: 'golpe'; indice: number; especial: EspecialPvp } | { tipo: 'troca'; posicao: number };
export interface EventoPvp { tipo: string; [campo: string]: unknown }
export interface FotoPvp { pedido: { tipo: 'acao' | 'troca' | 'espera' | 'fim' }; [campo: string]: unknown }
export interface JogadorPvp { nome: string; time: Record<string, unknown>[]; nomes: string[] }

export interface BatalhaPvp {
  iniciar(): [EventoPvp[], EventoPvp[]];
  readonly terminou: boolean;
  readonly vencedor: 0 | 1 | null;
  precisaEscolher(lado: 0 | 1): boolean;
  escolher(lado: 0 | 1, escolha: EscolhaPvp): boolean;
  desistir(lado: 0 | 1): void;
  empatar(): void;
  eventos(lado: 0 | 1): EventoPvp[];
  foto(lado: 0 | 1): FotoPvp;
  escolherIa(lado: 0 | 1, nivel?: 'facil' | 'medio' | 'dificil'): void;
  timeFinal(lado: 0 | 1): Record<string, unknown>[];
}

const caminho = (relativo: string) => String(new URL(relativo, import.meta.url));
export interface MecanicasPvp { mega: boolean; dynamax: boolean; z: boolean; tera: boolean }
const pvp = (await import(caminho('../../shared/batalha/pvp.ts'))) as { BatalhaPvp: new (a: JogadorPvp, b: JogadorPvp, regras?: string[], mecanicas?: MecanicasPvp, curar?: [boolean, boolean]) => BatalhaPvp };
const torneioTime = (await import(caminho('../../shared/torneioTime.ts'))) as { problemasDoTime(time: Record<string, unknown>[], regras: unknown, nome: (p: { especieId: number }) => string): string[] };
const loja = (await import(caminho('../../shared/loja.ts'))) as { TODOS_OS_ITENS: { id: string; categoria: string; nome: string }[] };
const tickets = (await import(caminho('../../shared/tickets.ts'))) as { TICKETS: { id: string; nome: string }[]; itensDoGrupo(grupo: string): string[] };
const tiers = (await import(caminho('../../shared/tiers.ts'))) as { definirAjustesTiers(a: unknown): void };
const dados = (await import(caminho('../../client/src/dados.ts'))) as { pokemonPorId(id: number): { nome: string } | undefined };

export const novaBatalhaPvp = (a: JogadorPvp, b: JogadorPvp, regras: string[] = [], mecanicas?: MecanicasPvp, curar?: [boolean, boolean]) => new pvp.BatalhaPvp(a, b, regras, mecanicas, curar);
/** Tiers mudadas pela staff (server/src/ajustes.ts) valem também nas regras do Torneio e do Ranqueado. */
export const aplicarAjustesTiers = (a: unknown) => tiers.definirAjustesTiers(a);
export const nomeDaEspecie = (id: number) => dados.pokemonPorId(id)?.nome ?? `#${id}`;
/** Problemas do time para o Torneio (lista vazia = pode jogar). */
export const problemasDoTimeNoTorneio = (time: Record<string, unknown>[], regras: unknown) => torneioTime.problemasDoTime(time, regras, (p) => nomeDaEspecie(p.especieId));
/** Nome de um item do jogo (para as mensagens de prêmio). */
export const nomeDoItem = (id: string) => loja.TODOS_OS_ITENS.find((i) => i.id === id)?.nome ?? id;
/** Sorteia um item de um grupo das roletas: Mint, Charm ou Orb aleatória. */
export function itemAleatorio(grupo: 'mint' | 'charm' | 'orb' | 'terashard'): string {
  const lista = grupo === 'terashard' ? tickets.itensDoGrupo('terashard') : grupo === 'mint' ? loja.TODOS_OS_ITENS.filter((i) => i.categoria === 'mints').map((i) => i.id) : grupo === 'charm' ? tickets.itensDoGrupo('charm') : tickets.TICKETS.map((t) => t.id);
  return lista[Math.floor(Math.random() * lista.length)];
}
/** Ids de todos os itens de uma categoria do jogo (Mega Stones, Z-Crystals…), para as lojas especiais. */
export const idsDaCategoria = (categoria: string) => loja.TODOS_OS_ITENS.filter((i) => i.categoria === categoria && !i.id.endsWith('-nt')).map((i) => i.id);

const itens = (await import(caminho('../../shared/itens.ts'))) as { ITENS: Record<string, { reviverTime?: boolean; categoria?: string } | undefined>; usarRemedio(item: unknown, p: Record<string, unknown>, nome: string): string | null };
const pokemon = (await import(caminho('../../shared/batalha/pokemon.ts'))) as { hpMaximo(p: Record<string, unknown>): number };
/**
 * Usa um remédio (Potion, Revive, Full Restore…) num Pokémon do time da Liga, fora da batalha. `time` = o time todo
 * (Sacred Ash revive todos). Devolve a mensagem, ou null se não é remédio ou não teve efeito.
 */
export function usarRemedioNaLiga(itemId: string, time: Record<string, unknown>[], posicao: number): string | null {
  const item = itens.ITENS[itemId];
  if (!item || item.categoria !== 'remedio') return null;
  if (item.reviverTime) {
    const caidos = time.filter((p) => Number(p.hp) <= 0);
    caidos.forEach((p) => ((p.hp = pokemon.hpMaximo(p)), (p.status = null)));
    return caidos.length ? 'O time foi revivido!' : null;
  }
  const p = time[posicao];
  return p ? itens.usarRemedio(item, p, nomeDaEspecie(Number(p.especieId))) : null;
}

const especies = (await import(caminho('../../shared/batalha/pokemon.ts'))) as { gerarIndividuo(numero: number, nivel: number, opcoes: { shiny?: boolean; crescimento?: string | null }): Record<string, unknown> & { ivs: Record<string, number> } };
const dadosComCrescimento = dados as unknown as { pokemonPorId(id: number): { crescimento?: string | null } | undefined };
/**
 * Pokémon novo criado no servidor (Loja da guilda): o mesmo gerador do jogo; cada IV de `ivMinimo` a 31
 * (shiny: a partir de 15, como em todo shiny).
 */
export function gerarPokemon(especieId: number, nivel: number, opcoes: { shiny: boolean; ivMinimo: number }): Record<string, unknown> {
  const p = especies.gerarIndividuo(especieId, nivel, { shiny: opcoes.shiny, crescimento: dadosComCrescimento.pokemonPorId(especieId)?.crescimento ?? null });
  const minimo = Math.max(opcoes.ivMinimo, opcoes.shiny ? 15 : 0);
  for (const a of Object.keys(p.ivs)) p.ivs[a] = minimo + Math.floor(Math.random() * (32 - minimo));
  p.hp = pokemon.hpMaximo(p);
  return p;
}

// ---- Dashboard: categoria rara de cada espécie (a mesma regra dos encontros e do letreiro)
const encontros = (await import(caminho('../../shared/encontros.ts'))) as { categoriaRara(p: unknown, todos: unknown[]): 'inicial' | 'lendario' | 'mitico' | 'ultra' | null };
const dadosTodos = dados as unknown as { pokemonPorId(id: number): unknown; todosOsPokemons(): unknown[] };
const categorias = new Map<number, 'inicial' | 'lendario' | 'mitico' | 'ultra' | null>();
/** Inicial (a linha inteira), lendário, mítico, Ultra Beast ou null (comum). Guardada por espécie. */
export function categoriaDaEspecie(especieId: number): 'inicial' | 'lendario' | 'mitico' | 'ultra' | null {
  if (!categorias.has(especieId)) {
    const p = dadosTodos.pokemonPorId(especieId);
    categorias.set(especieId, p ? encontros.categoriaRara(p, dadosTodos.todosOsPokemons()) : null);
  }
  return categorias.get(especieId)!;
}
