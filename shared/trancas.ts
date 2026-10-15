// Trancas de nível: conteúdos que só abrem a partir de um nível de treinador (pedido do dono; a cada conteúdo
// novo ele diz se quer tranca). Administradores passam por todas. Sem imports: o servidor também usa.

export type ConteudoTrancado = 'guilda' | 'mercadoNegro' | 'torneio' | 'liga' | 'suspeito' | 'safari' | 'canteiros' | 'craftBola' | 'craftCharm' | 'creche';

/** Nível de treinador mínimo de cada conteúdo. */
export const NIVEL_MINIMO: Record<ConteudoTrancado, number> = {
  guilda: 10,
  mercadoNegro: 3,
  torneio: 10,
  liga: 18,
  suspeito: 10,
  safari: 15,
  // craft (planilha do dono)
  canteiros: 5,
  craftBola: 7,
  craftCharm: 15,
  creche: 10,
};

/** O conteúdo está liberado para este nível de treinador? */
export const liberado = (conteudo: ConteudoTrancado, nivelTreinador: number, admin = false): boolean => admin || nivelTreinador >= NIVEL_MINIMO[conteudo];
/** "🔒 Requer treinador nível 10". */
export const textoTranca = (conteudo: ConteudoTrancado): string => `🔒 Requer treinador nível ${NIVEL_MINIMO[conteudo]}`;
