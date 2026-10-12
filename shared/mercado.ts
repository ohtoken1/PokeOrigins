// Mercado negro: jogadores anunciam Pokémon, itens e gold, e outros compram. Regras e formatos usados pelo jogo
// e pelo servidor (server/src/mercado.ts). Sem imports: o servidor lê este arquivo direto.
// Números provisórios, fáceis de ajustar (o dono ainda vai definir a economia).

/** Parte do preço que o mercado fica quando a venda acontece (some do jogo). */
export const TAXA_MERCADO = 0.05;
/** Quantos anúncios um jogador pode ter ao mesmo tempo. */
export const MAX_ANUNCIOS_POR_JOGADOR = 10;
/** Anúncio que ninguém comprou volta para o dono depois deste tempo. */
export const VALIDADE_ANUNCIO_MS = 24 * 60 * 60 * 1000;
export const PRECO_MAXIMO_MERCADO = 999_999_999;
export const QUANTIDADE_MAXIMA_MERCADO = 9999;
/** Quantos anúncios a lista mostra (os mais novos). */
export const ANUNCIOS_NA_LISTA = 300;

export type MoedaMercado = 'silver' | 'gold';
export type TipoAnuncio = 'pokemon' | 'item' | 'gold';

/** Taxa de uma venda (arredonda para baixo: preço menor que 20 não paga taxa). */
export const taxaDaVenda = (preco: number): number => Math.floor(preco * TAXA_MERCADO);
/** Quanto o vendedor recebe. */
export const valorDoVendedor = (preco: number): number => preco - taxaDaVenda(preco);

/** O que o comprador vê de um Pokémon anunciado: tier e IVs só se o vendedor já avaliou (pedido do dono). */
export interface PokemonAnunciado {
  especieId: number;
  nivel: number;
  shiny: boolean;
  genero: string;
  natureza: string;
  habilidade: string;
  item: string | null;
  golpes: string[];
  avaliado: boolean;
  tier?: string;
  /** IVs exatos: só para quem é VIP (ou se o Pokémon tem os IVs sempre à mostra). */
  ivs?: Record<string, number>;
  /** Faixa de cada IV: para quem não é VIP. */
  faixas?: Record<string, [number, number]>;
}

export interface AnuncioMercado {
  id: number;
  tipo: TipoAnuncio;
  vendedor: string;
  meu: boolean;
  preco: number;
  moeda: MoedaMercado;
  expiraEm: number;
  pokemon?: PokemonAnunciado;
  /** Item anunciado (id) e quantidade; em anúncio de gold, `quantidade` é o gold. */
  item?: string;
  quantidade?: number;
}

/** Venda feita ou anúncio vencido que o vendedor ainda não buscou. */
export interface AcertoMercado {
  motivo: 'vendido' | 'venceu';
  tipo: TipoAnuncio;
  especieId?: number;
  item?: string;
  quantidade?: number;
  /** Só em venda: quanto entrou, já sem a taxa. */
  valor?: number;
  moeda?: MoedaMercado;
}
