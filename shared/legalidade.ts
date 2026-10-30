// Time legal (PvP, Torneio, Ranqueado e Liga): o servidor confere o save guardado antes de cada batalha contra outro
// jogador ou NPC do servidor, porque o save ainda vem do navegador e pode ter sido mexido (nível 999, IVs 99,
// Huge Power em qualquer um, golpe que a espécie nunca aprende…). Regra: só vale o que o JOGO consegue dar.
// Golpes e Abilities são conferidos contra a linha inteira (a forma, a forma normal dela e as anteriores), porque
// o Pokémon guarda o que aprendeu antes de evoluir, os Egg Moves e o que tinha antes de trocar de forma.
import { Dex } from '@pkmn/sim';
import { EV_MAX_ATRIBUTO, EV_MAX_TOTAL, especie } from './batalha/pokemon';
import { ITENS_DE_SEGURAR_NOSSOS } from './loja';
import './megas'; // põe a Rayquazite (pedra nossa) nos itens do Showdown

const ATRIBUTOS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const NIVEL_MAXIMO = 100;
const id = (s: unknown) => (typeof s === 'string' ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
const inteiroEntre = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

type Especie = ReturnType<typeof Dex.species.get>;
/** A forma, a forma normal dela (Rotom-Wash → Rotom, Kyurem-Black → Kyurem) e todas as anteriores na evolução. */
function linhaDe(s: Especie): Especie[] {
  const vistas = new Map<string, Especie>();
  const fila: Especie[] = [s];
  while (fila.length) {
    const x = fila.shift()!;
    if (!x?.exists || vistas.has(x.id)) continue;
    vistas.set(x.id, x);
    for (const nome of [x.baseSpecies, x.changesFrom, x.battleOnly, x.prevo].flat()) if (typeof nome === 'string' && nome) fila.push(Dex.species.get(nome));
  }
  return [...vistas.values()];
}

const golpesDaLinha = new Map<string, Set<string>>();
function podeTerGolpe(s: Especie, golpe: string): boolean {
  if (s.id === 'smeargle') return true; // Sketch: qualquer golpe
  let golpes = golpesDaLinha.get(s.id);
  if (!golpes) {
    golpes = new Set();
    for (const x of linhaDe(s)) for (const g of Object.keys(Dex.species.getLearnsetData(x.id).learnset ?? {})) golpes.add(g);
    golpesDaLinha.set(s.id, golpes);
  }
  return golpes.has(golpe);
}
const podeTerAbility = (s: Especie, ability: string) =>
  linhaDe(s).some((x) => Object.values(x.abilities).some((a) => id(a) === ability));

/** O que está errado neste Pokémon (null = legal). `nome` só para a mensagem. */
export function problemaDoPokemon(p: Record<string, unknown>, nome: string): string | null {
  let s: Especie;
  try {
    s = especie(p.especieId as number) as Especie;
  } catch {
    return `${nome}: espécie inválida.`;
  }
  if (!s?.exists) return `${nome}: espécie inválida.`;
  if (!inteiroEntre(p.nivel, 1, NIVEL_MAXIMO)) return `${nome}: nível inválido.`;
  const ivs = p.ivs as Record<string, unknown> | undefined;
  if (!ivs || typeof ivs !== 'object' || !ATRIBUTOS.every((a) => inteiroEntre(ivs[a], 0, 31))) return `${nome}: IVs inválidos.`;
  const evs = (p.evs ?? {}) as Record<string, unknown>;
  if (typeof evs !== 'object' || !ATRIBUTOS.every((a) => evs[a] === undefined || inteiroEntre(evs[a], 0, EV_MAX_ATRIBUTO))) return `${nome}: EVs inválidos.`;
  if (ATRIBUTOS.reduce((t, a) => t + (Number(evs[a]) || 0), 0) > EV_MAX_TOTAL) return `${nome}: EVs inválidos.`;
  if (!Dex.natures.get(String(p.natureza ?? '')).exists) return `${nome}: Nature inválida.`;
  if (!podeTerAbility(s, id(p.habilidade))) return `${nome}: Ability que a espécie não pode ter.`;
  const golpes = p.golpes as { id?: unknown }[] | undefined;
  if (!Array.isArray(golpes) || golpes.length < 1 || golpes.length > 4) return `${nome}: golpes inválidos.`;
  const ids = golpes.map((g) => id(g?.id));
  if (new Set(ids).size !== ids.length) return `${nome}: golpe repetido.`;
  for (const g of ids) {
    const golpe = Dex.moves.get(g);
    if (!golpe.exists || golpe.isZ || golpe.isMax) return `${nome}: golpe inválido.`;
    if (!podeTerGolpe(s, g)) return `${nome}: ${golpe.name} é um golpe que a espécie não aprende.`;
  }
  const item = p.item;
  if (item !== null && item !== undefined && item !== '') {
    if (typeof item !== 'string' || !(ITENS_DE_SEGURAR_NOSSOS[item] || Dex.items.get(item).exists)) return `${nome}: item inválido.`;
  }
  return null;
}

/** Os problemas do time inteiro (lista vazia = legal). */
export function problemasDeLegalidade(time: Record<string, unknown>[], nome: (p: Record<string, unknown>) => string): string[] {
  return time.map((p) => problemaDoPokemon(p, nome(p))).filter((x): x is string => !!x);
}
