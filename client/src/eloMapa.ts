// O meu melhor elo do PvP ranqueado, para o símbolo ao lado do nome no mapa (cidade e biomas). Quem preenche é
// ui/ranqueado.ts (ao abrir o jogo e depois de cada partida); a cena escuta as mudanças.
import type { EloNoMapa } from '../../shared/ranqueado';

let meu: EloNoMapa | null = null;
const ouvintes = new Set<(e: EloNoMapa | null) => void>();

export const meuElo = () => meu;
export function definirMeuElo(e: EloNoMapa | null): void {
  if (JSON.stringify(e) === JSON.stringify(meu)) return;
  meu = e;
  ouvintes.forEach((f) => f(meu));
}
/** Escuta as mudanças; devolve a função que para de escutar. */
export function aoMudarMeuElo(f: (e: EloNoMapa | null) => void): () => void {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
}
