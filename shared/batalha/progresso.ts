// Experiência, subida de nível, golpes novos e evolução depois de uma batalha.
import { evolucaoPorAmizade, evolucaoPorGolpe } from '../amizade';
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
  // evolução: a Ability acompanha a espécie nova, no mesmo lugar (1ª, 2ª ou Hidden); sem esse lugar, a 1ª
  if (mudanca.especieId !== undefined && mudanca.especieId !== p.especieId) {
    const [velhas, novas] = [especie(p.especieId).abilities, especie(mudanca.especieId).abilities];
    const lugar = (['0', '1', 'H'] as const).find((l) => velhas[l] === p.habilidade);
    p.habilidade = (lugar && novas[lugar]) || novas['0'];
  }
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
  /** nível em que o Pokémon para de ganhar XP (limite pelo nível de treinador; padrão: o máximo do jogo) */
  limite = NIVEL_MAXIMO,
): ResultadoProgresso {
  const r: ResultadoProgresso = { mensagens: [], golpesPendentes: [], evolucao: null };
  const teto = Math.min(NIVEL_MAXIMO, limite);
  if (p.nivel >= NIVEL_MAXIMO) return r;
  if (p.nivel >= teto) {
    r.mensagens.push(`${nomeDe(p.especieId)} já está no nível máximo para o seu nível de treinador e não ganhou experiência.`);
    return r;
  }

  const nome = nomeDe(p.especieId);
  p.exp += quantidade;
  r.mensagens.push(`${nome} ganhou ${quantidade} pontos de experiência!`);

  const crescimento = crescimentoDe(p.especieId);
  // vários níveis de uma vez (ex.: 20 → 30) viram UMA mensagem com o nível final (pedido do dono);
  // os golpes aprendidos no caminho vêm depois dela
  const nivelAntes = p.nivel;
  const aprendidos: ResultadoProgresso = { mensagens: [], golpesPendentes: r.golpesPendentes, evolucao: null };
  while (p.nivel < teto && p.exp >= expParaNivel(crescimento, p.nivel + 1)) {
    mudarNivelOuEspecie(p, { nivel: p.nivel + 1 });
    for (const golpe of golpesNoNivel(p.especieId, p.nivel)) aprender(p, golpe, nome, aprendidos);
  }
  if (p.nivel > nivelAntes) r.mensagens.push(`${nome} subiu para o nível ${p.nivel}!`, ...aprendidos.mensagens);
  // no limite, o XP para ali (não fica guardado para depois)
  if (p.nivel >= teto) p.exp = expParaNivel(crescimento, teto);

  // por nível; ou, se subiu de nível com amizade alta, por amizade (Golbat → Crobat, Eevee → Espeon/Umbreon…)
  // Everstone: quem segura não evolui (nome fixo aqui para não importar shared/campo.ts, que importa encontros)
  // sabendo um golpe (Lickitung com Rollout), também só ao subir de nível; vem antes da amizade (Eevee com golpe Fairy = Sylveon)
  const para = p.item === 'everstone' ? null : (evolucaoPorNivel(p.especieId, p.nivel, undefined, p) ?? (p.nivel > nivelAntes ? (evolucaoPorGolpe(p) ?? evolucaoPorAmizade(p)) : null));
  if (para && especie(para)) r.evolucao = { de: p.especieId, para };
  return r;
}

/** Homem Suspeito: volta para o nível 1 (a experiência também); espécie, golpes, IVs e EVs continuam. */
export function resetarNivel(p: PokemonIndividual, crescimento: string | null): void {
  mudarNivelOuEspecie(p, { nivel: 1 });
  p.exp = expParaNivel(crescimento, 1);
}

/** Homem Suspeito: troca a espécie sem aprender nada (voltar a evolução, separar fusão); a Ability acompanha. */
export function voltarEspecie(p: PokemonIndividual, para: number): void {
  mudarNivelOuEspecie(p, { especieId: para });
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
