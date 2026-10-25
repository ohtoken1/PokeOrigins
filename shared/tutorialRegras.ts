// Presentes do tutorial (pedido do dono, 24/10/2026): quando um conteúdo é liberado pelo nível, o Professor Carvalho
// dá o necessário para o jogador experimentar (uma semente para plantar, materiais para fazer uma Pokébola…).
// Cada presente sai UMA vez por conta, entregue pelo servidor (server/src/tutorial.ts). SEM imports.

export interface PresenteTutorial {
  /** itens que entram na bolsa */
  itens?: Record<string, number>;
  silver?: number;
  /** sementes de graça nos canteiros da Artesã (save.sementesGratis) */
  sementes?: number;
  /** como o Professor descreve o presente */
  texto: string;
}

/** Chave = conteúdo da tranca (shared/trancas.ts). */
export const PRESENTES_TUTORIAL: Record<string, PresenteTutorial> = {
  canteiros: { sementes: 1, texto: '1 semente de presente' },
  craftBola: { itens: { 'apricorn-pink': 1, 'apricorn-white': 1 }, silver: 800, texto: '1 Pink Apricorn, 1 White Apricorn e 800 Poké Dólares' },
  craftCharm: { itens: { occaberry: 100, 'energy-fire': 100 }, silver: 50_000, texto: '100 Occa Berries, 100 Fire Energies e 50.000 Poké Dólares' },
};
