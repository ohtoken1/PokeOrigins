// Bonificação (aba Administração): multiplicadores que a administração liga para todos os jogadores
// (ex.: fim de semana com 2x silver). No MMO, o servidor guarda e aplica; por enquanto fica no navegador.

export type ChaveBonus = 'silver' | 'xp' | 'shiny' | 'lendario';

export interface Bonificacao {
  /** silver ganho por vitória */
  silver: number;
  /** XP dos Pokémon e do treinador */
  xp: number;
  /** chance de shiny nos encontros */
  shiny: number;
  /** chance de lendários, míticos e Ultra Beasts nos encontros */
  lendario: number;
}

/** Valores que a administração pode escolher (de 1x até 3x). */
export const VALORES_BONUS = [1, 1.5, 2, 2.5, 3];

export const BONIFICACAO_PADRAO: Bonificacao = { silver: 1, xp: 1, shiny: 1, lendario: 1 };

export const NOMES_BONUS: Record<ChaveBonus, { nome: string; descricao: string }> = {
  silver: { nome: 'Silver', descricao: 'Silver ganho ao vencer batalhas.' },
  xp: { nome: 'XP', descricao: 'Experiência dos Pokémon e do treinador.' },
  shiny: { nome: 'Aparição de shiny', descricao: 'Chance de um selvagem ser shiny.' },
  lendario: { nome: 'Aparição de lendário', descricao: 'Chance de lendários, míticos e Ultra Beasts nos encontros.' },
};

/** Garante um valor permitido (1 a 3). */
export const valorBonus = (v: unknown): number => (VALORES_BONUS.includes(Number(v)) ? Number(v) : 1);

/** "2x", "1,5x". */
export const textoBonus = (v: number) => `${v.toLocaleString('pt-BR')}x`;
