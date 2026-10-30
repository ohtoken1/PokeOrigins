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
  readonly turno: number;
  empatar(): void;
  eventos(lado: 0 | 1): EventoPvp[];
  foto(lado: 0 | 1): FotoPvp;
  escolherIa(lado: 0 | 1, nivel?: 'facil' | 'medio' | 'dificil'): void;
  timeFinal(lado: 0 | 1): Record<string, unknown>[];
  /** Boss (eventos): vida enorme para o lado 1 e fim no turno `turnos` (antes de `iniciar`). */
  modoBoss(turnos: number): void;
  readonly danoNoBoss: number;
}

const caminho = (relativo: string) => String(new URL(relativo, import.meta.url));
export interface MecanicasPvp { mega: boolean; dynamax: boolean; z: boolean; tera: boolean }
const pvp = (await import(caminho('../../shared/batalha/pvp.ts'))) as { BatalhaPvp: new (a: JogadorPvp, b: JogadorPvp, regras?: string[], mecanicas?: MecanicasPvp, curar?: [boolean, boolean]) => BatalhaPvp };
const torneioTime = (await import(caminho('../../shared/torneioTime.ts'))) as { problemasDoTime(time: Record<string, unknown>[], regras: unknown, nome: (p: { especieId: number }) => string): string[] };
const loja = (await import(caminho('../../shared/loja.ts'))) as { TODOS_OS_ITENS: { id: string; categoria: string; nome: string }[] };
/** Prêmio já sorteado de um ticket/Orb (shared/tickets.ts). */
export type PremioDoTicket =
  | { tipo: 'item'; id: string; quantidade: number } | { tipo: 'silver'; quantidade: number } | { tipo: 'gold'; quantidade: number } | { tipo: 'vip'; dias: number }
  | { tipo: 'titulo'; id: string } | { tipo: 'pokemon'; especie: number; nivel: number; ivMinimo: number; chanceShiny: number };
export interface ResultadoDoTicket { raridade: string; pacote: PremioDoTicket[]; shiny: boolean[] }
const tickets = (await import(caminho('../../shared/tickets.ts'))) as {
  TICKETS: { id: string; nome: string }[]; itensDoGrupo(grupo: string): string[];
  ticketPorId(id: string): { id: string; nome: string } | undefined; abrirTicket(t: unknown): ResultadoDoTicket;
};
/** Ticket/Orb (ou a Chave Temporal) pelo id do item. */
export const ticketPorId = (id: string) => tickets.ticketPorId(id);
/** Sorteia um ticket/Orb (o mesmo sorteio do jogo). */
export const abrirTicket = (t: { id: string }) => tickets.abrirTicket(t);
export const itensDoGrupoDoTicket = (grupo: string) => tickets.itensDoGrupo(grupo);
/** Prêmio do Passe de batalha, antes de resolver o item aleatório. */
export type PremioDoPasse = PremioDoTicket | { tipo: 'aleatorio'; grupo: string; quantidade: number };
const passeTemporadas = (await import(caminho('../../shared/passeTemporadas.ts'))) as {
  temporadaAtual(agora?: number): { id: string; nome: string; fim: number; gratis: PremioDoPasse[]; premium: PremioDoPasse[] } | null;
  PASSE_PREMIUM: string;
};
const passeRegras = (await import(caminho('../../shared/passe.ts'))) as { nivelPasse(xp: number): number; NIVEIS_PASSE: number };
export const temporadaDoPasse = (agora?: number) => passeTemporadas.temporadaAtual(agora);
export const nivelDoPasse = (xp: number) => passeRegras.nivelPasse(xp);
export const NIVEIS_DO_PASSE = passeRegras.NIVEIS_PASSE;
export const ITEM_PASSE_PREMIUM = passeTemporadas.PASSE_PREMIUM;
const conquistasDados = (await import(caminho('../../shared/conquistas.ts'))) as { TITULOS: { id: string; nome: string }[] };
export const nomeDoTitulo = (id: string) => conquistasDados.TITULOS.find((t) => t.id === id)?.nome ?? id;
const tiers = (await import(caminho('../../shared/tiers.ts'))) as { definirAjustesTiers(a: unknown): void };
const dados = (await import(caminho('../../client/src/dados.ts'))) as { pokemonPorId(id: number): { nome: string } | undefined };

export const novaBatalhaPvp = (a: JogadorPvp, b: JogadorPvp, regras: string[] = [], mecanicas?: MecanicasPvp, curar?: [boolean, boolean]) => new pvp.BatalhaPvp(a, b, regras, mecanicas, curar);
/** Tiers mudadas pela staff (server/src/ajustes.ts) valem também nas regras do Torneio e do Ranqueado. */
export const aplicarAjustesTiers = (a: unknown) => tiers.definirAjustesTiers(a);
export const nomeDaEspecie = (id: number) => dados.pokemonPorId(id)?.nome ?? `#${id}`;
const legalidade = (await import(caminho('../../shared/legalidade.ts'))) as { problemasDeLegalidade(time: Record<string, unknown>[], nome: (p: Record<string, unknown>) => string): string[] };
/**
 * Pokémon do time que o jogo não consegue dar (nível, IVs, EVs, Nature, Ability, golpes ou item mexidos no save):
 * lista vazia = legal. Conferido antes de toda batalha do servidor (PvP, Torneio, Ranqueado, Liga).
 */
export function problemasDeLegalidade(time: Record<string, unknown>[]): string[] {
  try {
    if (!Array.isArray(time) || time.some((p) => !p || typeof p !== 'object' || !dados.pokemonPorId(p.especieId as number))) return ['O time tem um Pokémon inválido.'];
    return legalidade.problemasDeLegalidade(time, (p) => nomeDaEspecie(Number(p.especieId)));
  } catch (e) {
    console.error('Conferência da legalidade falhou', e);
    return ['O time tem um Pokémon inválido.'];
  }
}
/** Problemas do time para o Torneio (lista vazia = pode jogar). */
export function problemasDoTimeNoTorneio(time: Record<string, unknown>[], regras: unknown): string[] {
  // save forjado ou estragado (Pokémon vazio, espécie que não existe — pokemonPorId dá erro): fica fora das regras, sem derrubar o servidor
  try {
    if (!Array.isArray(time) || time.some((p) => !p || typeof p !== 'object' || !dados.pokemonPorId(p.especieId as number))) return ['O time tem um Pokémon inválido.'];
    return [...problemasDeLegalidade(time), ...torneioTime.problemasDoTime(time, regras, (p) => nomeDaEspecie(p.especieId))];
  } catch (e) {
    console.error('Conferência do time falhou', e);
    return ['O time tem um Pokémon inválido.'];
  }
}
/** Nome de um item do jogo (para as mensagens de prêmio). */
export const nomeDoItem = (id: string) => loja.TODOS_OS_ITENS.find((i) => i.id === id)?.nome ?? id;
const IDS_DOS_ITENS = new Set(loja.TODOS_OS_ITENS.map((i) => i.id));
/** O item existe no jogo? (a staff não pode mandar um id inventado: ele virava uma chave estranha na bolsa) */
export const itemExiste = (id: string) => IDS_DOS_ITENS.has(id);
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

// ---- Quadro de missões: o servidor sorteia as MESMAS missões que o jogo mostra (shared/missoesQuadro.ts) ----
export interface MissaoDoQuadro { id: string; especie: number; natureza: string; iv: string; qualidade: string; desde: number; ate: number }
type Base = { id: number };
const tabelas = (await import(caminho('../../shared/encontros.ts'))) as {
  montarTabela(bioma: unknown, daRegiao: Base[], forcados: unknown[], todos: Base[]): { pokemon: Base; grupo?: unknown }[];
  definirAjustesBiomas(a: unknown): void;
};
const biomas = (await import(caminho('../../shared/biomas.ts'))) as { BIOMAS: unknown[] };
const regioes = (await import(caminho('../../shared/regioes.ts'))) as { REGIOES: { id: string; disponivel: boolean }[] };
const quadro = (await import(caminho('../../shared/missoesQuadro.ts'))) as {
  missoesDoQuadro(agora: number, comuns: number[]): MissaoDoQuadro[];
  cumpreMissao(m: MissaoDoQuadro, p: Record<string, unknown>): boolean;
};
const mapas = dados as unknown as { todosOsPokemons(): Base[]; pokemonsDosMapasDe(regiao: string): Base[] };
let comunsDoQuadro: number[] | null = null;
/** Espécies comuns soltas em algum mapa: a MESMA conta de client/src/missoesQuadro.ts (com os ajustes de bioma da staff). */
function especiesComuns(): number[] {
  if (comunsDoQuadro) return comunsDoQuadro;
  const todos = mapas.todosOsPokemons();
  const ids = new Set<number>();
  for (const r of regioes.REGIOES.filter((x) => x.disponivel))
    for (const bioma of biomas.BIOMAS) for (const e of tabelas.montarTabela(bioma, mapas.pokemonsDosMapasDe(r.id), [], todos)) if (!e.grupo) ids.add(e.pokemon.id);
  return (comunsDoQuadro = [...ids].sort((a, b) => a - b));
}
/** Ajustes de bioma da staff (server/src/ajustes.ts): valem aqui também, e o quadro é refeito. */
export function aplicarAjustesBiomas(a: unknown): void {
  tabelas.definirAjustesBiomas(a);
  comunsDoQuadro = null;
}
/** As missões do quadro agora (as mesmas para todos). */
export const missoesDoQuadroAgora = (agora = Date.now()) => quadro.missoesDoQuadro(agora, especiesComuns());
/** O Pokémon cumpre a missão? (espécie, Nature, IV 31 e qualidade pela soma dos IVs) */
export function pokemonCumpreMissao(m: MissaoDoQuadro, p: Record<string, unknown>): boolean {
  try {
    return !!p.ivs && typeof p.ivs === 'object' && quadro.cumpreMissao(m, p);
  } catch {
    return false;
  }
}

// ---- Boss: golpes proibidos no time (Curse só conta para Pokémon Ghost, que usa a versão que tira vida) ----
const regrasEventos = (await import(caminho('../../shared/eventosRegras.ts'))) as { GOLPES_PROIBIDOS_BOSS: string[] };
const tiposDe = (await import(caminho('../../shared/batalha/pokemon.ts'))) as { especie(id: number): { types: string[] } };
export function golpesProibidosNoBoss(time: Record<string, unknown>[]): string[] {
  const achados: string[] = [];
  for (const p of time) {
    for (const g of (Array.isArray(p.golpes) ? p.golpes : []) as { id?: unknown }[]) {
      const id = String(g?.id ?? '');
      if (!regrasEventos.GOLPES_PROIBIDOS_BOSS.includes(id)) continue;
      if (id === 'curse' && !tiposDe.especie(Number(p.especieId)).types.includes('Ghost')) continue;
      achados.push(`${nomeDaEspecie(Number(p.especieId))}: ${id}`);
    }
  }
  return achados;
}
