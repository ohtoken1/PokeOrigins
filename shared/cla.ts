// Clãs: regras e números (usado pelo jogo e pelo servidor; este arquivo não importa nada).

/** Vagas de um clã (contando o líder). */
export const VAGAS_CLA = 5;
/** Preço para criar um clã, em gold. */
export const PRECO_CRIAR_CLA_GOLD = 1;
export const NIVEL_MAX_CLA = 10;
/** XP que um Pokémon (curva média) precisa do nível 1 ao 100. */
export const XP_POKEMON_1_AO_100 = 1_000_000;
/** Pokémon "upados do 1 ao 100" para subir de nível: 10 × o nível do clã. */
export const POKEMONS_POR_NIVEL_CLA = 10;
/** XP para o clã sair do nível `nivel` e ir ao próximo (o jogo só mostra a porcentagem). */
export const xpParaSubirCla = (nivel: number) => POKEMONS_POR_NIVEL_CLA * nivel * XP_POKEMON_1_AO_100;

/**
 * Missões que o clã precisa cumprir (além do XP) para sair de cada nível. O dono ainda vai definir:
 * enquanto a lista do nível estiver vazia, só o XP conta.
 */
export const MISSOES_CLA: Record<number, { id: string; texto: string }[]> = {};

export const NOME_CLA_MIN = 3;
export const NOME_CLA_MAX = 16;
export const DESCRICAO_CLA_MAX = 120;
/** Letras do nosso alfabeto (com acento), números e espaço, sem espaço nas pontas. */
export const NOME_CLA_VALIDO = /^[\p{Script=Latin}0-9](?:[\p{Script=Latin}0-9 ]{1,14})[\p{Script=Latin}0-9]$/u;
/** Nome como vai ser guardado: acentos numa letra só e um espaço entre as palavras. */
export const limparNomeCla = (nome: string) => nome.normalize('NFC').replace(/\s+/g, ' ').trim();
/** Para não existirem dois clãs "iguais": sem acentos e em minúsculas ("Ação" = "ACAO" = "acao"). */
export const chaveDoNomeCla = (nome: string) => nome.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ---- bandeira: cada campo é a posição na lista ----
export const FORMAS_BANDEIRA = ['Flâmula', 'Ponta', 'Cauda de andorinha', 'Escudo'];
export const PADROES_BANDEIRA = ['Liso', 'Metade vertical', 'Metade horizontal', 'Diagonal', 'Listras', 'Faixa', 'Xadrez', 'Borda', 'Divisa'];
export const SIMBOLOS_BANDEIRA = ['Poké Ball', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Estrela', 'Coroa', 'Lua', 'Garras', 'Rock', 'Psychic', 'Pata'];
export const CORES_BANDEIRA = [
  '#e53935', '#fb8c00', '#fdd835', '#43a047', '#26a69a', '#1e88e5', '#283593',
  '#8e24aa', '#ec407a', '#6d4c41', '#78909c', '#1f2430', '#f5f5f5', '#d4a017',
];

export interface Bandeira {
  forma: number;
  padrao: number;
  cor1: number;
  cor2: number;
  simbolo: number;
  corSimbolo: number;
}
export const BANDEIRA_PADRAO: Bandeira = { forma: 2, padrao: 1, cor1: 0, cor2: 12, simbolo: 0, corSimbolo: 11 };

/** Confere o que veio de fora (cada campo dentro da sua lista); null = inválida. */
export function lerBandeira(b: unknown): Bandeira | null {
  if (!b || typeof b !== 'object') return null;
  const v = b as Record<string, unknown>;
  const ok = (x: unknown, lista: unknown[]) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < lista.length;
  if (!ok(v.forma, FORMAS_BANDEIRA) || !ok(v.padrao, PADROES_BANDEIRA) || !ok(v.simbolo, SIMBOLOS_BANDEIRA)) return null;
  if (!ok(v.cor1, CORES_BANDEIRA) || !ok(v.cor2, CORES_BANDEIRA) || !ok(v.corSimbolo, CORES_BANDEIRA)) return null;
  return { forma: v.forma as number, padrao: v.padrao as number, cor1: v.cor1 as number, cor2: v.cor2 as number, simbolo: v.simbolo as number, corSimbolo: v.corSimbolo as number };
}
