// Ovos Misteriosos: ao chocar, sai QUALQUER Pokémon (comum, lendário, mítico… chance igual para todos)
// com IVs garantidos de um tier ou superior (pedido do dono). Fica em shared/ porque, no MMO, quem
// sorteia é o servidor.
import type { Atributos } from './batalha/pokemon';
import { TIERS_IV } from './tierIv';

export interface Ovo {
  /** id na bolsa */
  id: string;
  nome: string;
  /** tier mínimo garantido (soma dos IVs) */
  tier: 'S' | 'A';
  descricao: string;
}

/** Nível do Pokémon que nasce do ovo. */
export const NIVEL_OVO = 1;
/** Chance de o Pokémon do ovo ser shiny. */
export const CHANCE_SHINY_OVO = 0.05;

export const OVOS: Ovo[] = [
  { id: 'ovo-misterioso-s', nome: 'Ovo Misterioso S', tier: 'S', descricao: 'Choca um Pokémon qualquer (até lendário) com IVs de tier S ou superior (soma 145+). 5% de chance de shiny.' },
  { id: 'ovo-misterioso-a', nome: 'Ovo Misterioso A', tier: 'A', descricao: 'Choca um Pokémon qualquer (até lendário) com IVs de tier A ou superior (soma 120+). 5% de chance de shiny.' },
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
  return { especie, shiny, ivs: sortearIvs(minimoDoTier(ovo.tier), shiny ? minimoShiny : 0, aleatorio) };
}
