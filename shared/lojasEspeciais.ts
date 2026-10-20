// Lojas especiais (pedido do dono, 20/10/2026). Sem imports: o servidor lê este arquivo. Quem vende é o SERVIDOR
// (server/src/lojas.ts): ele confere o preço, o saldo e a rotação do dia no save guardado.
// • Loja do dia (aba do Pokémarket): 4 Mega Stones e 1 Z-Crystal sorteados à meia-noite de Brasília (iguais para
//   todos). Mega Stone pelo valor em Origin Coins da planilha do dono (`VALOR_MEGA_STONE`); Z-Crystal por 300. As Mega Stones saíram da loja normal: só aparecem aqui e na Loja da Liga.
// • Loja da Liga: Mega Stones RU e UU, em League Coins. • Loja da Liga Nightmare: Mega Stones OU e Ubers, em League
//   Coins Nightmare. Preços pela planilha do dono (`VALOR_MEGA_STONE`).

/** Preço do Z-Crystal (e de qualquer item sem valor na planilha) na Loja do dia, em Origin Coins. */
export const PRECO_LOJA_DO_DIA_GOLD = 300;
export const MEGAS_POR_DIA = 4;
export const Z_POR_DIA = 1;

export type IdLojaLiga = 'liga' | 'nightmare';
/** Moeda (campo do save) de cada Loja da Liga; os preços estão em `VALOR_MEGA_STONE` (fim do arquivo). */
export const LOJAS_DA_LIGA: Record<IdLojaLiga, { nome: string; moeda: 'leagueCoins' | 'leagueCoinsNightmare'; nomeMoeda: string }> = {
  liga: { nome: 'Loja da Liga', moeda: 'leagueCoins', nomeMoeda: 'League Coins' },
  nightmare: { nome: 'Loja da Liga Nightmare', moeda: 'leagueCoinsNightmare', nomeMoeda: 'League Coins Nightmare' },
};

const BRASILIA_MS = -3 * 3600_000;
/** Dia da rotação ("2026-10-20"), que vira à meia-noite de Brasília. */
export const diaDaLoja = (agora: number) => new Date(agora + BRASILIA_MS).toISOString().slice(0, 10);
/** Quando a rotação troca (próxima meia-noite de Brasília). */
export function proximaRotacao(agora: number): number {
  const br = new Date(agora + BRASILIA_MS);
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() + 1) - BRASILIA_MS;
}

/** Sorteio com semente (o mesmo dia dá sempre o mesmo resultado, no jogo e no servidor). */
function aleatorioDe(semente: string): () => number {
  let h = 1779033703 ^ semente.length;
  for (let i = 0; i < semente.length; i++) h = Math.imul(h ^ semente.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sortear(lista: string[], quantos: number, aleatorio: () => number): string[] {
  const l = [...lista].sort();
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l.slice(0, quantos);
}

/** Itens da Loja do dia: `megas` e `zs` = ids de todas as Mega Stones e Z-Crystals do jogo. */
export function rotacaoDoDia(dia: string, megas: string[], zs: string[]): string[] {
  const aleatorio = aleatorioDe(`loja-do-dia:${dia}`);
  return [...sortear(megas, MEGAS_POR_DIA, aleatorio), ...sortear(zs, Z_POR_DIA, aleatorio)];
}

/**
 * Valor de cada Mega Stone em Origin Coins e a tier da Mega (planilha do dono "Mega Stones (2).xlsx", 20/10/2026).
 * Loja da Liga = Megas RU e UU por valor ÷ 10 em League Coins; Loja Nightmare = Megas OU e Ubers por valor ÷ 10 × 3
 * em League Coins Nightmare (`precoNaLiga`).
 */
export const VALOR_MEGA_STONE: Record<string, { tier: 'Ubers' | 'OU' | 'UU' | 'RU'; oc: number }> = {
  abomasite: { tier: 'RU', oc: 250 },
  absolite: { tier: 'RU', oc: 300 },
  aerodactylite: { tier: 'RU', oc: 350 },
  aggronite: { tier: 'RU', oc: 300 },
  alakazite: { tier: 'Ubers', oc: 700 },
  altarianite: { tier: 'RU', oc: 300 },
  ampharosite: { tier: 'RU', oc: 300 },
  audinite: { tier: 'RU', oc: 250 },
  banettite: { tier: 'RU', oc: 250 },
  barbaracite: { tier: 'OU', oc: 550 },
  baxcalibrite: { tier: 'Ubers', oc: 700 },
  beedrillite: { tier: 'UU', oc: 400 },
  blastoisinite: { tier: 'Ubers', oc: 700 },
  blazikenite: { tier: 'Ubers', oc: 750 },
  cameruptite: { tier: 'RU', oc: 300 },
  chandelurite: { tier: 'RU', oc: 350 },
  charizarditex: { tier: 'OU', oc: 600 },
  charizarditey: { tier: 'OU', oc: 650 },
  chesnaughtite: { tier: 'RU', oc: 350 },
  chimechite: { tier: 'RU', oc: 300 },
  clefablite: { tier: 'OU', oc: 550 },
  crabominite: { tier: 'RU', oc: 250 },
  darkranite: { tier: 'Ubers', oc: 700 },
  delphoxite: { tier: 'UU', oc: 500 },
  diancite: { tier: 'OU', oc: 750 },
  dragalgite: { tier: 'UU', oc: 500 },
  dragoninite: { tier: 'OU', oc: 750 },
  drampanite: { tier: 'RU', oc: 300 },
  eelektrossite: { tier: 'RU', oc: 450 },
  emboarite: { tier: 'RU', oc: 350 },
  excadrite: { tier: 'OU', oc: 550 },
  falinksite: { tier: 'RU', oc: 350 },
  feraligite: { tier: 'RU', oc: 250 },
  froslassite: { tier: 'OU', oc: 600 },
  galladite: { tier: 'RU', oc: 250 },
  garchompite: { tier: 'OU', oc: 650 },
  gardevoirite: { tier: 'OU', oc: 600 },
  gengarite: { tier: 'Ubers', oc: 750 },
  glalitite: { tier: 'RU', oc: 250 },
  glimmoranite: { tier: 'OU', oc: 600 },
  golisopite: { tier: 'OU', oc: 650 },
  golurkite: { tier: 'RU', oc: 250 },
  greninjite: { tier: 'UU', oc: 450 },
  gyaradosite: { tier: 'UU', oc: 500 },
  hawluchanite: { tier: 'UU', oc: 450 },
  heatranite: { tier: 'Ubers', oc: 750 },
  heracronite: { tier: 'RU', oc: 350 },
  houndoominite: { tier: 'RU', oc: 300 },
  kangaskhanite: { tier: 'RU', oc: 350 },
  latiasite: { tier: 'OU', oc: 650 },
  latiosite: { tier: 'OU', oc: 650 },
  lopunnite: { tier: 'OU', oc: 650 },
  lucarionite: { tier: 'Ubers', oc: 700 },
  magearnite: { tier: 'Ubers', oc: 800 },
  malamarite: { tier: 'RU', oc: 350 },
  manectite: { tier: 'RU', oc: 300 },
  mawilite: { tier: 'UU', oc: 500 },
  medichamite: { tier: 'OU', oc: 550 },
  meganiumite: { tier: 'OU', oc: 550 },
  meowsticite: { tier: 'RU', oc: 300 },
  metagrossite: { tier: 'OU', oc: 600 },
  mewtwonitex: { tier: 'Ubers', oc: 1200 },
  mewtwonitey: { tier: 'Ubers', oc: 1200 },
  pidgeotite: { tier: 'RU', oc: 350 },
  pinsirite: { tier: 'RU', oc: 350 },
  pyroarite: { tier: 'RU', oc: 350 },
  raichunitex: { tier: 'RU', oc: 450 },
  raichunitey: { tier: 'Ubers', oc: 800 },
  rayquazite: { tier: 'Ubers', oc: 1200 },
  sablenite: { tier: 'RU', oc: 300 },
  salamencite: { tier: 'Ubers', oc: 800 },
  sceptilite: { tier: 'RU', oc: 300 },
  scizorite: { tier: 'UU', oc: 500 },
  scolipite: { tier: 'RU', oc: 300 },
  scovillainite: { tier: 'RU', oc: 450 },
  scraftinite: { tier: 'RU', oc: 350 },
  sharpedonite: { tier: 'RU', oc: 300 },
  skarmorite: { tier: 'UU', oc: 400 },
  slowbronite: { tier: 'RU', oc: 300 },
  staraptite: { tier: 'UU', oc: 600 },
  starminite: { tier: 'Ubers', oc: 700 },
  steelixite: { tier: 'RU', oc: 300 },
  swampertite: { tier: 'UU', oc: 600 },
  tatsugirinite: { tier: 'OU', oc: 550 },
  tyranitarite: { tier: 'RU', oc: 350 },
  venusaurite: { tier: 'UU', oc: 500 },
  victreebelite: { tier: 'RU', oc: 300 },
  zeraorite: { tier: 'Ubers', oc: 750 },
  zygardite: { tier: 'Ubers', oc: 800 },
};

/** Em qual Loja da Liga a Mega Stone está e por quanto. */
export function precoNaLiga(pedra: string): { loja: IdLojaLiga; preco: number } | null {
  const v = VALOR_MEGA_STONE[pedra];
  if (!v) return null;
  return v.tier === 'RU' || v.tier === 'UU' ? { loja: 'liga', preco: v.oc / 10 } : { loja: 'nightmare', preco: (v.oc / 10) * 3 };
}
/** Itens (com preço) de uma Loja da Liga. */
export const itensDaLojaDaLiga = (loja: IdLojaLiga) =>
  Object.keys(VALOR_MEGA_STONE).flatMap((id) => {
    const p = precoNaLiga(id);
    return p && p.loja === loja ? [{ id, preco: p.preco }] : [];
  });

/** Preço de um item na Loja do dia, em Origin Coins: Mega Stone = valor da planilha; o resto (Z-Crystal) = 300. */
export const precoNoDia = (id: string) => VALOR_MEGA_STONE[id]?.oc ?? PRECO_LOJA_DO_DIA_GOLD;

/**
 * Produtos das Lojas da Liga além das Mega Stones (escolhas do dono, 20/10/2026; endgame = Liga Pokémon, tudo o que
 * é de doação também se consegue jogando). `item` = o que entra no save (`fragmentos` = saldo); `aleatorio` = sorteado
 * no servidor na compra; `titulo` = libera um título; `quantidade` = quantos vêm em cada compra.
 */
export interface ProdutoLiga { id: string; loja: IdLojaLiga; preco: number; item?: string; aleatorio?: 'mint' | 'charm'; titulo?: string; quantidade?: number; nome?: string }
export const PRODUTOS_LIGA: ProdutoLiga[] = [
  { id: 'mint-aleatoria', loja: 'liga', preco: 5, aleatorio: 'mint', nome: 'Mint aleatória' },
  { id: 'abilitycapsule', loja: 'liga', preco: 2 },
  { id: 'abilitypatch', loja: 'liga', preco: 5 },
  { id: 'charm-aleatorio', loja: 'liga', preco: 5, aleatorio: 'charm', nome: 'Charm aleatório' },
  { id: 'ovo-comum-s', loja: 'liga', preco: 10 },
  { id: 'ovo-misterioso-a', loja: 'liga', preco: 10 },
  { id: 'fragmento-temporal', loja: 'liga', preco: 2, item: 'fragmentos', nome: 'Fragmento Temporal' },
  { id: 'seletor-orb-1-x10', loja: 'nightmare', preco: 60, item: 'seletor-orb-1', quantidade: 10, nome: '10 Seletores de Orb 1' },
  { id: 'ovo-lendario', loja: 'nightmare', preco: 60 },
  { id: 'ovo-lendario-a', loja: 'nightmare', preco: 120 },
  { id: 'ovo-inicial-s', loja: 'nightmare', preco: 90 },
  { id: 'masterball', loja: 'nightmare', preco: 60 },
  { id: 'chave-temporal', loja: 'nightmare', preco: 30 },
  { id: 'destinyknot', loja: 'nightmare', preco: 30 },
  { id: 'seletor-mint', loja: 'nightmare', preco: 15 },
  { id: 'seletor-charm', loja: 'nightmare', preco: 5 },
  { id: 'titulo-mestre-nightmare', loja: 'nightmare', preco: 300, titulo: 'mestre-nightmare', nome: 'Título Mestre Nightmare' },
];
/** Z-Crystals (todos) na Loja da Liga e itens de forma (todos) na Loja Nightmare. */
export const PRECO_Z_NA_LIGA = 20;
export const PRECO_FORMA_NA_NIGHTMARE = 120;
