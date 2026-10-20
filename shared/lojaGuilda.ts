// Loja da guilda (pedido do dono, 20/10/2026). Paga em Pontos de guilda (save.pontosGuilda, que vêm do Boss da
// guilda). A loja é a MESMA para todos e troca todo mês (dia 1º, meia-noite de Brasília); cada jogador compra na sua
// própria cópia, com limites por mês que zeram na virada (save.lojaGuilda). Sem imports: o servidor também lê.

const BRASILIA_MS = -3 * 3600_000;

/** Mês da loja, "2026-10" (Brasília). */
export const mesDaLoja = (agora: number) => new Date(agora + BRASILIA_MS).toISOString().slice(0, 7);

/** Quando a loja troca (dia 1º do mês seguinte, 00:00 de Brasília). */
export function proximoMesDaLoja(agora: number): number {
  const d = new Date(agora + BRASILIA_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - BRASILIA_MS;
}

/** Os 27 iniciais (Kanto a Paldea): um deles é sorteado para o mês, igual para todos. */
export const INICIAIS_GUILDA = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912];

/** Sorteio com semente do mês: o mesmo inicial para todos durante o mês inteiro. */
export function inicialDoMes(mes: string): number {
  let h = 2166136261;
  for (const c of `guilda-${mes}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return INICIAIS_GUILDA[(h >>> 0) % INICIAIS_GUILDA.length];
}

/** As Pokébolas que a Artesã faz (mesma lista de RECEITAS_BOLA em shared/craft.ts). */
export const BOLAS_GUILDA = ['dreamball', 'heavyball', 'moonball', 'quickball', 'repeatball', 'duskball', 'nestball', 'fastball', 'netball', 'luxuryball', 'diveball', 'loveball'];

/** Inicial da loja: nível 1, cada IV de 10 a 31, 5% shiny (como Orbs e ovos). */
export const IV_MINIMO_INICIAL_GUILDA = 10;
export const CHANCE_SHINY_INICIAL_GUILDA = 0.05;

export interface ProdutoGuilda {
  id: string;
  preco: number;
  /** quantas compras por mês */
  limite: number;
  /** unidades por compra (bolas: pack de 10) */
  quantidade: number;
  item?: string;
  /** sorteado na compra; `terashard` = UM tipo sorteado, e as `quantidade` unidades vêm todas desse tipo */
  aleatorio?: 'mint' | 'charm' | 'terashard';
  inicial?: number;
  nome?: string;
}

/** Os produtos do mês (números do dono). */
export function produtosDaGuilda(mes: string): ProdutoGuilda[] {
  return [
    { id: 'inicial', preco: 20, limite: 1, quantidade: 1, inicial: inicialDoMes(mes) },
    { id: 'mint-aleatoria', preco: 6, limite: 5, quantidade: 1, aleatorio: 'mint', nome: 'Mint aleatória' },
    { id: 'charm-aleatorio', preco: 5, limite: 10, quantidade: 1, aleatorio: 'charm', nome: 'Charm aleatório' },
    // pedido do dono: 10 Tera Shards de um tipo sorteado (as 10 do mesmo tipo) por 5 pontos
    { id: 'pack-terashard', preco: 5, limite: 10, quantidade: 10, aleatorio: 'terashard', nome: '10 Tera Shards (tipo aleatório)' },
    ...BOLAS_GUILDA.map((b) => ({ id: `pack-${b}`, preco: 1, limite: 10, quantidade: 10, item: b })),
  ];
}

/** Compras do mês (zeram quando o mês muda). */
export interface EstadoLojaGuilda { mes: string; compras: Record<string, number> }
export const comprasDoMes = (estado: EstadoLojaGuilda | undefined, mes: string): Record<string, number> =>
  estado?.mes === mes ? estado.compras : {};
