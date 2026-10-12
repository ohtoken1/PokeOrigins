// Homem Suspeito (NPC da cidade): serviços que desfazem coisas num Pokémon do time. Sem imports.
export type ServicoSuspeito = 'evs' | 'nivel' | 'evolucao' | 'separar';

export const SERVICOS_SUSPEITO: { id: ServicoSuspeito; nome: string; descricao: string }[] = [
  { id: 'evs', nome: 'Resetar EVs', descricao: 'Zera todos os EVs do Pokémon. Os IVs, a Nature e o nível continuam.' },
  { id: 'nivel', nome: 'Resetar nível', descricao: 'O Pokémon volta para o nível 1. A espécie, os golpes, os IVs e os EVs continuam.' },
  { id: 'evolucao', nome: 'Resetar evolução', descricao: 'O Pokémon volta para a primeira forma da linha dele, no mesmo nível, e esquece os golpes que ela não pode ter. Também desfaz mudança de forma por item (Deoxys, Rotom, Hoopa…), menos fusão.' },
  { id: 'separar', nome: 'Separar Pokémon', descricao: 'Desfaz uma fusão (Black/White Kyurem, Necrozma, Calyrex): os dois voltam como eram, cada um com os IVs originais.' },
];

/** Preço de cada serviço em silver (Poké Dólares), definido pelo dono. */
export const PRECO_SUSPEITO: Record<ServicoSuspeito, number> = { evs: 50_000, nivel: 25_000, evolucao: 200_000, separar: 200_000 };
