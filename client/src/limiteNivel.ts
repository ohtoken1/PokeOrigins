// Limite de nível dos Pokémon pelo nível de treinador (regras em shared/treinador.ts; pedido do dono): do treinador 1
// ao 9 o jogador só usa Pokémon até 10 × o nível dele; acima disso o Pokémon fica no PC. Administrador não tem limite.
import { nivelMaximoPokemon, nivelTreinador, treinadorParaUsar } from '../../shared/treinador';
import { ehAdministrador } from './bonificacao';
import { guardarNoPC, type PokemonDoJogador, type Save } from './estado';

/** Até que nível este jogador pode usar um Pokémon agora. */
export const tetoDoJogador = (save: Save): number => (ehAdministrador() ? 100 : nivelMaximoPokemon(nivelTreinador(save.xpTreinador)));
/** Este Pokémon pode entrar no time? */
export const podeUsar = (save: Save, p: { nivel: number }): boolean => p.nivel <= tetoDoJogador(save);
/** "Requer treinador nível 4" (para o Pokémon que ainda não pode ser usado). */
export const textoDoLimite = (p: { nivel: number }): string => `Requer treinador nível ${treinadorParaUsar(p.nivel)} para usar um Pokémon de nível ${p.nivel}`;

/**
 * Tira do time quem está acima do limite (saves de antes da regra) e manda para o PC. O time nunca fica vazio:
 * se todos passam do limite, fica o de menor nível. Devolve quantos foram guardados.
 */
export function ajustarTimeAoLimite(save: Save): number {
  const teto = tetoDoJogador(save);
  const acima = save.time.filter((p) => p.nivel > teto);
  if (!acima.length) return 0;
  const ficam = save.time.filter((p) => p.nivel <= teto);
  // todos acima: o de menor nível continua no time
  if (!ficam.length) ficam.push(acima.splice(acima.indexOf(acima.reduce((a, b) => (b.nivel < a.nivel ? b : a))), 1)[0]);
  save.time = ficam;
  for (const p of acima) guardarNoPC(save, p as PokemonDoJogador);
  return acima.length;
}
