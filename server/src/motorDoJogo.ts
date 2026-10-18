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
}

const caminho = (relativo: string) => String(new URL(relativo, import.meta.url));
export interface MecanicasPvp { mega: boolean; dynamax: boolean; z: boolean; tera: boolean }
const pvp = (await import(caminho('../../shared/batalha/pvp.ts'))) as { BatalhaPvp: new (a: JogadorPvp, b: JogadorPvp, regras?: string[], mecanicas?: MecanicasPvp) => BatalhaPvp };
const torneioTime = (await import(caminho('../../shared/torneioTime.ts'))) as { problemasDoTime(time: Record<string, unknown>[], regras: unknown, nome: (p: { especieId: number }) => string): string[] };
const loja = (await import(caminho('../../shared/loja.ts'))) as { TODOS_OS_ITENS: { id: string; categoria: string; nome: string }[] };
const tickets = (await import(caminho('../../shared/tickets.ts'))) as { TICKETS: { id: string; nome: string }[]; itensDoGrupo(grupo: string): string[] };
const dados = (await import(caminho('../../client/src/dados.ts'))) as { pokemonPorId(id: number): { nome: string } | undefined };

export const novaBatalhaPvp = (a: JogadorPvp, b: JogadorPvp, regras: string[] = [], mecanicas?: MecanicasPvp) => new pvp.BatalhaPvp(a, b, regras, mecanicas);
export const nomeDaEspecie = (id: number) => dados.pokemonPorId(id)?.nome ?? `#${id}`;
/** Problemas do time para o Torneio (lista vazia = pode jogar). */
export const problemasDoTimeNoTorneio = (time: Record<string, unknown>[], regras: unknown) => torneioTime.problemasDoTime(time, regras, (p) => nomeDaEspecie(p.especieId));
/** Nome de um item do jogo (para as mensagens de prêmio). */
export const nomeDoItem = (id: string) => loja.TODOS_OS_ITENS.find((i) => i.id === id)?.nome ?? id;
/** Sorteia um item de um grupo das roletas: Mint, Charm ou Orb aleatória. */
export function itemAleatorio(grupo: 'mint' | 'charm' | 'orb'): string {
  const lista = grupo === 'mint' ? loja.TODOS_OS_ITENS.filter((i) => i.categoria === 'mints').map((i) => i.id) : grupo === 'charm' ? tickets.itensDoGrupo('charm') : tickets.TICKETS.map((t) => t.id);
  return lista[Math.floor(Math.random() * lista.length)];
}
