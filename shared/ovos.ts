// Ovos: ao chocar, sai um Pokémon do grupo do ovo (chance igual entre eles), nível 1, 5% shiny.
// - Ovo Misterioso S/A: QUALQUER Pokémon, com IVs garantidos do tier ou superior.
// - Ovo Lendário: lendário/mítico/Ultra Beast (forma base); Ovo Inicial: um dos 27 iniciais. IVs normais.
// Fica em shared/ porque, no MMO, quem sorteia é o servidor.
import type { Atributos } from './batalha/pokemon';
import { TIERS_IV } from './tierIv';

export interface Ovo {
  /** id na bolsa */
  id: string;
  nome: string;
  /** letra e cor do ícone */
  letra: 'S' | 'A' | 'L' | 'I';
  /** quem pode nascer */
  grupo: 'todos' | 'lendarios' | 'iniciais';
  /** tier mínimo garantido (soma dos IVs); sem tier = IVs normais (0–31) */
  tier?: 'S' | 'A';
  descricao: string;
}

/** Nível do Pokémon que nasce do ovo. */
export const NIVEL_OVO = 1;
/** Chance de o Pokémon do ovo ser shiny. */
export const CHANCE_SHINY_OVO = 0.05;

export const OVOS: Ovo[] = [
  { id: 'ovo-misterioso-s', nome: 'Ovo Misterioso S', letra: 'S', grupo: 'todos', tier: 'S', descricao: 'Choca um Pokémon qualquer (até lendário) com IVs de tier S ou superior (soma 145+). 5% de chance de shiny.' },
  { id: 'ovo-misterioso-a', nome: 'Ovo Misterioso A', letra: 'A', grupo: 'todos', tier: 'A', descricao: 'Choca um Pokémon qualquer (até lendário) com IVs de tier A ou superior (soma 120+). 5% de chance de shiny.' },
  { id: 'ovo-lendario', nome: 'Ovo Lendário', letra: 'L', grupo: 'lendarios', descricao: 'Choca um lendário, mítico ou Ultra Beast (só a primeira forma da linha, ex.: Cosmog; chance igual para todos). 5% de chance de shiny.' },
  { id: 'ovo-inicial', nome: 'Ovo Inicial', letra: 'I', grupo: 'iniciais', descricao: 'Choca um dos 27 iniciais de todas as regiões (chance igual para todos). 5% de chance de shiny.' },
];

export const ovoPorId = (id: string) => OVOS.find((o) => o.id === id);
const minimoDoTier = (tier: string) => TIERS_IV.find((t) => t.tier === tier)!.minimo;

/** IVs aleatórios (cada um de `minimo` a 31) cuja soma é pelo menos `soma`: sorteia de novo até cair na faixa. */
export function sortearIvs(soma: number, minimo = 0, aleatorio = Math.random): Atributos {
  const sortear = (): Atributos => {
    const iv = () => minimo + Math.floor(aleatorio() * (32 - minimo));
    return { hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv() };
  };
  for (let i = 0; i < 100000; i++) {
    const ivs = sortear();
    if (Object.values(ivs).reduce((s, v) => s + v, 0) >= soma) return ivs;
  }
  // praticamente impossível chegar aqui; garante o mínimo subindo os IVs por igual
  const base = Math.ceil(soma / 6);
  return { hp: base, atk: base, def: base, spa: base, spd: base, spe: base };
}

export interface ResultadoOvo {
  especie: number;
  shiny: boolean;
  ivs: Atributos;
}

/** Choca o ovo: espécie com chance igual entre `especies`, shiny 5%, IVs do tier garantido ou acima. */
export function chocarOvo(ovo: Ovo, especies: number[], minimoShiny: number, aleatorio = Math.random): ResultadoOvo {
  const especie = especies[Math.floor(aleatorio() * especies.length)];
  const shiny = aleatorio() < CHANCE_SHINY_OVO;
  return { especie, shiny, ivs: sortearIvs(ovo.tier ? minimoDoTier(ovo.tier) : 0, shiny ? minimoShiny : 0, aleatorio) };
}
