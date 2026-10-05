// Save local no navegador. TEMPORÁRIO: quando o servidor existir, o save fica na conta do jogador.
export interface PokemonDoJogador {
  especieId: number;
  nivel: number;
  shiny: boolean;
}

export interface Save {
  regiao: string;
  time: PokemonDoJogador[];
  passos: number;
  vistos: number[];
}

export const TAMANHO_MAXIMO_TIME = 6;
const CHAVE = 'jogo-claude:save';

export function carregarSave(): Save | null {
  try {
    const texto = localStorage.getItem(CHAVE);
    return texto ? (JSON.parse(texto) as Save) : null;
  } catch {
    return null;
  }
}

export function salvar(save: Save): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(save));
  } catch {
    // sem armazenamento disponível: o jogo continua, só não guarda o progresso
  }
}

export function apagarSave(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}
