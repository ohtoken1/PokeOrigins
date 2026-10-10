// Ranking com todos os jogadores: os números saem dos saves guardados (os mesmos de shared/ranking.ts).
// A lista é refeita no máximo a cada 30 segundos.
import * as banco from './banco.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import type { DadosRanking } from '../../shared/ranking.ts';

const VALIDADE_MS = 30_000;
let guardado: { em: number; lista: (DadosRanking & { usuario: string })[] } | null = null;
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function listar(): (DadosRanking & { usuario: string })[] {
  if (guardado && Date.now() - guardado.em < VALIDADE_MS) return guardado.lista;
  const lista = banco.linhasDoRanking().map((l) => {
    const xp = numero(l.xp);
    return {
      usuario: l.usuario,
      nome: typeof l.nome === 'string' && l.nome ? l.nome : l.usuario,
      capturas: numero(l.capturas),
      capturasShiny: numero(l.shiny),
      capturasLendarios: numero(l.lendarios),
      nivel: nivelTreinador(xp),
      xp,
      medalhas: numero(l.medalhas),
      missoes: numero(l.missoes),
      silver: numero(l.silver),
      gold: numero(l.gold),
    };
  });
  guardado = { em: Date.now(), lista };
  return lista;
}
