// Rankings (aba "Ranking" da barra do topo). Sem servidor, só o próprio jogador aparece;
// quando houver contas, o servidor monta a lista com todos usando estas mesmas regras.

/** Números de um jogador que entram nos rankings. */
export interface DadosRanking {
  nome: string;
  capturas: number;
  capturasShiny: number;
  /** Lendários, míticos e Ultra Beasts capturados. */
  capturasLendarios: number;
  nivel: number;
  xp: number;
  medalhas: number;
  silver: number;
  gold: number;
}

/** Pontos do ranking geral (provisório, o dono ajusta). Silver e gold não contam (gold é moeda paga). */
export const PONTOS_GERAL = { captura: 1, shiny: 25, lendario: 50, nivel: 100, medalha: 200 };

export function pontosGerais(d: DadosRanking): number {
  return (
    d.capturas * PONTOS_GERAL.captura +
    d.capturasShiny * PONTOS_GERAL.shiny +
    d.capturasLendarios * PONTOS_GERAL.lendario +
    d.nivel * PONTOS_GERAL.nivel +
    d.medalhas * PONTOS_GERAL.medalha
  );
}

export type CategoriaRanking = 'geral' | 'capturas' | 'shiny' | 'lendarios' | 'nivel' | 'medalhas' | 'silver' | 'gold';

export const CATEGORIAS_RANKING: { id: CategoriaRanking; nome: string; coluna: string; descricao: string; valor: (d: DadosRanking) => number; emBreve?: boolean }[] = [
  {
    id: 'geral',
    nome: 'Geral',
    coluna: 'Pontos',
    descricao: `Soma de pontos: ${PONTOS_GERAL.captura} por captura, ${PONTOS_GERAL.shiny} por shiny, ${PONTOS_GERAL.lendario} por lendário, ${PONTOS_GERAL.nivel} por nível de treinador e ${PONTOS_GERAL.medalha} por medalha de torneio.`,
    valor: pontosGerais,
  },
  { id: 'capturas', nome: 'Capturas', coluna: 'Capturas', descricao: 'Pokémon capturados em batalha (ovos e tickets não contam).', valor: (d) => d.capturas },
  { id: 'shiny', nome: 'Capturas shiny', coluna: 'Shiny', descricao: 'Pokémon shiny capturados em batalha.', valor: (d) => d.capturasShiny },
  { id: 'lendarios', nome: 'Lendários', coluna: 'Lendários', descricao: 'Lendários, míticos e Ultra Beasts capturados em batalha.', valor: (d) => d.capturasLendarios },
  { id: 'nivel', nome: 'Nível', coluna: 'Nível', descricao: 'Nível de treinador (empate: quem tem mais XP).', valor: (d) => d.nivel },
  { id: 'medalhas', nome: 'Medalhas de torneio', coluna: 'Medalhas', descricao: 'Medalhas ganhas nos torneios online.', valor: (d) => d.medalhas, emBreve: true },
  { id: 'silver', nome: 'Silver', coluna: 'Silver', descricao: 'Silver na carteira.', valor: (d) => d.silver },
  { id: 'gold', nome: 'Gold', coluna: 'Gold', descricao: 'Gold na carteira.', valor: (d) => d.gold },
];

/** Ordena do maior para o menor; no nível, o XP desempata. */
export function ordenarRanking(lista: DadosRanking[], categoria: CategoriaRanking): DadosRanking[] {
  const c = CATEGORIAS_RANKING.find((x) => x.id === categoria)!;
  return [...lista].sort((a, b) => c.valor(b) - c.valor(a) || (categoria === 'nivel' ? b.xp - a.xp : 0));
}
