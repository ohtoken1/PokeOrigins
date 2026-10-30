// Clãs: regras e números (usado pelo jogo e pelo servidor; este arquivo não importa nada).

/** Vagas de um clã (contando o líder). */
export const VAGAS_CLA = 5;
/** Preço para criar um clã, em gold. */
export const PRECO_CRIAR_CLA_GOLD = 100;
export const NIVEL_MAX_CLA = 10;
/**
 * XP da guilda = PONTOS por ação dos membros (regra do dono; não é mais o XP de treinador e nenhum bônus mexe nele):
 * cada selvagem derrotado ou capturado, cada Pokémon do time de um treinador vencido (duelo ou ginásio) e cada
 * torneio de que o membro participa.
 */
export const XP_CLA_POR_SELVAGEM = 1;
export const XP_CLA_POR_POKEMON_DE_TREINADOR = 1;
export const XP_CLA_POR_TORNEIO = 20;
/** Curva do dono: 1.000 pontos para sair do nível 1 e mais 1.000 a cada nível (45.000 no total até o 10). */
export const XP_CLA_POR_NIVEL = 1000;
/** XP para o clã sair do nível `nivel` e ir ao próximo (o jogo só mostra a porcentagem). */
export const xpParaSubirCla = (nivel: number) => XP_CLA_POR_NIVEL * nivel;

/**
 * Bônus que o nível da guilda dá a TODOS os membros (regra do dono): +1% a cada nível, intercalado. Níveis ímpares
 * sobem shiny e XP (de Pokémon e de treinador); níveis pares sobem raros (lendário, mítico, Ultra Beast e inicial)
 * e silver. No nível 10 os quatro chegam a 5%.
 */
export interface BonusCla {
  shiny: number;
  xp: number;
  raros: number;
  silver: number;
}
export function bonusDoCla(nivel: number): BonusCla {
  const n = Math.max(0, Math.min(NIVEL_MAX_CLA, Math.floor(nivel)));
  const impares = Math.ceil(n / 2) / 100;
  const pares = Math.floor(n / 2) / 100;
  return { shiny: impares, xp: impares, raros: pares, silver: pares };
}

/**
 * Missões que o clã precisa cumprir (além do XP) para sair de cada nível. O dono ainda vai definir:
 * enquanto a lista do nível estiver vazia, só o XP conta.
 */
export const MISSOES_CLA: Record<number, { id: string; texto: string }[]> = {};

export const NOME_CLA_MIN = 3;
export const NOME_CLA_MAX = 16;
export const DESCRICAO_CLA_MAX = 120;
/**
 * Letras do nosso alfabeto (A a Z, com os acentos do português e do espanhol), números e espaço, sem espaço nas pontas.
 * Só essas: letras "parecidas" de outras línguas (ı, ł, ø…) deixavam imitar o nome de outra guilda.
 */
export const NOME_CLA_VALIDO = /^[A-Za-z0-9ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ](?:[A-Za-z0-9ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ ]{1,14})[A-Za-z0-9ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ]$/u;
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
