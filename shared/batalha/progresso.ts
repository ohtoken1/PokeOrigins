// Experiência, subida de nível, golpes novos e evolução depois de uma batalha.
import {
  especie,
  evolucaoPorNivel,
  expParaNivel,
  golpesNoNivel,
  hpMaximo,
  nomeGolpe,
  ppMaximo,
  type PokemonIndividual,
} from './pokemon';

export const NIVEL_MAXIMO = 100;

export interface ResultadoProgresso {
  mensagens: string[];
  /** Golpes que o Pokémon quer aprender, mas ele já tem 4: o jogador decide. */
  golpesPendentes: string[];
  evolucao: { de: number; para: number } | null;
}

/** Muda o nível mantendo o dano sofrido (como nos jogos: o HP sobe junto com o máximo). */
function mudarNivelOuEspecie(p: PokemonIndividual, mudanca: Partial<Pick<PokemonIndividual, 'nivel' | 'especieId'>>) {
  const antes = hpMaximo(p);
  Object.assign(p, mudanca);
  if (p.hp > 0) p.hp = Math.max(1, p.hp + hpMaximo(p) - antes);
}

function aprender(p: PokemonIndividual, golpe: string, nome: string, r: ResultadoProgresso) {
  if (p.golpes.some((g) => g.id === golpe) || r.golpesPendentes.includes(golpe)) return;
  if (p.golpes.length < 4) {
    p.golpes.push({ id: golpe, pp: ppMaximo(golpe) });
    r.mensagens.push(`${nome} aprendeu ${nomeGolpe(golpe)}!`);
  } else {
    r.golpesPendentes.push(golpe);
  }
}

/**
 * Soma experiência e aplica tudo o que acontece em seguida.
 * `crescimentoDe` devolve a curva de experiência de uma espécie (vem dos dados da PokéAPI).
 */
export function ganharExperiencia(
  p: PokemonIndividual,
  quantidade: number,
  nomeDe: (especieId: number) => string,
  crescimentoDe: (especieId: number) => string | null,
): ResultadoProgresso {
  const r: ResultadoProgresso = { mensagens: [], golpesPendentes: [], evolucao: null };
  if (p.nivel >= NIVEL_MAXIMO) return r;

  const nome = nomeDe(p.especieId);
  p.exp += quantidade;
  r.mensagens.push(`${nome} ganhou ${quantidade} pontos de experiência!`);

  const crescimento = crescimentoDe(p.especieId);
  while (p.nivel < NIVEL_MAXIMO && p.exp >= expParaNivel(crescimento, p.nivel + 1)) {
    mudarNivelOuEspecie(p, { nivel: p.nivel + 1 });
    r.mensagens.push(`${nome} subiu para o nível ${p.nivel}!`);
    for (const golpe of golpesNoNivel(p.especieId, p.nivel)) aprender(p, golpe, nome, r);
  }
  if (p.nivel >= NIVEL_MAXIMO) p.exp = expParaNivel(crescimento, NIVEL_MAXIMO);

  const para = evolucaoPorNivel(p.especieId, p.nivel);
  if (para && especie(para)) r.evolucao = { de: p.especieId, para };
  return r;
}

/** Aplica a evolução e devolve as mensagens dos golpes aprendidos ao evoluir. */
export function evoluir(p: PokemonIndividual, para: number, nomeDe: (especieId: number) => string): ResultadoProgresso {
  const r: ResultadoProgresso = { mensagens: [], golpesPendentes: [], evolucao: null };
  mudarNivelOuEspecie(p, { especieId: para });
  const nome = nomeDe(para);
  for (const golpe of [...golpesNoNivel(para, 0), ...golpesNoNivel(para, p.nivel)]) aprender(p, golpe, nome, r);
  return r;
}

export function trocarGolpe(p: PokemonIndividual, esquecer: number, aprenderId: string): void {
  p.golpes[esquecer] = { id: aprenderId, pp: ppMaximo(aprenderId) };
}
