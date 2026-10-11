// Ovos: ao chocar, sai um Pokémon do grupo do ovo (chance igual entre eles), nível 1, 5% shiny.
// - Ovo Misterioso (comum / A / S): QUALQUER Pokémon; com letra, IVs garantidos do tier ou superior.
// - Ovo Lendário (comum / A / S / S+): lendário/mítico/Ultra Beast (forma base).
// - Ovo Inicial (comum / A): um dos 27 iniciais.
// Cada ovo tem uma versão "(NT)" (id com -nt): o ovo não pode ser trocado e o Pokémon que nasce também não.
// Fica em shared/ porque, no MMO, quem sorteia é o servidor.
import type { Atributos } from './batalha/pokemon';
import { TIERS_IV } from './tierIv';
import { SUFIXO_NT } from './naoTrocavel';

export type TierOvo = 'S+' | 'S' | 'A';

export interface Ovo {
  /** id na bolsa */
  id: string;
  nome: string;
  /** cor do ícone: S, A e C = Misterioso (dourado, roxo, cinza), L = Lendário, I = Inicial */
  letra: 'S' | 'A' | 'C' | 'L' | 'I';
  /** o que vem escrito no ícone (o tier, ou a letra do grupo quando não tem tier) */
  rotulo: string;
  /** quem pode nascer */
  grupo: 'todos' | 'lendarios' | 'iniciais';
  /** tier mínimo garantido (soma dos IVs); sem tier = IVs normais (0–31) */
  tier?: TierOvo;
  /** versão NT: o ovo e o Pokémon que nasce não podem ser trocados */
  nt?: boolean;
  descricao: string;
}

/** Nível do Pokémon que nasce do ovo. */
export const NIVEL_OVO = 1;
/** Chance de o Pokémon do ovo ser shiny. */
export const CHANCE_SHINY_OVO = 0.05;

const SOMA: Record<TierOvo, string> = { 'S+': '171+', S: '145+', A: '120+' };
const QUEM: Record<Ovo['grupo'], string> = {
  todos: 'Choca um Pokémon qualquer (até lendário)',
  lendarios: 'Choca um lendário, mítico ou Ultra Beast (só a primeira forma da linha, ex.: Cosmog; chance igual para todos)',
  iniciais: 'Choca um dos 27 iniciais de todas as regiões (chance igual para todos)',
};
const NOME_GRUPO: Record<Ovo['grupo'], string> = { todos: 'Ovo Misterioso', lendarios: 'Ovo Lendário', iniciais: 'Ovo Inicial' };
const ID_GRUPO: Record<Ovo['grupo'], string> = { todos: 'ovo-misterioso', lendarios: 'ovo-lendario', iniciais: 'ovo-inicial' };

function ovo(grupo: Ovo['grupo'], tier?: TierOvo): Ovo {
  const letra = grupo === 'lendarios' ? 'L' : grupo === 'iniciais' ? 'I' : tier === 'S' ? 'S' : tier === 'A' ? 'A' : 'C';
  return {
    id: `${ID_GRUPO[grupo]}${tier ? `-${tier.toLowerCase().replace('+', 'plus')}` : ''}`,
    nome: `${NOME_GRUPO[grupo]}${tier ? ` ${tier}` : ''}`,
    letra,
    rotulo: tier ?? letra,
    grupo,
    tier,
    descricao: `${QUEM[grupo]}${tier ? ` com IVs de tier ${tier} ou superior (soma ${SOMA[tier]})` : ''}. 5% de chance de shiny.`,
  };
}

const NORMAIS: Ovo[] = [
  ovo('todos', 'S'),
  ovo('todos', 'A'),
  ovo('todos'),
  ovo('lendarios'),
  ovo('lendarios', 'A'),
  ovo('lendarios', 'S'),
  ovo('lendarios', 'S+'),
  ovo('iniciais'),
  ovo('iniciais', 'A'),
];

export const OVOS: Ovo[] = [
  ...NORMAIS,
  ...NORMAIS.map((o): Ovo => ({ ...o, id: `${o.id}${SUFIXO_NT}`, nome: `${o.nome} (NT)`, nt: true, descricao: `${o.descricao} NT: o ovo e o Pokémon que nascer não podem ser trocados.` })),
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

/** IV mínimo de cada atributo no tier S+ (sem isso, quase nenhum sorteio chegaria à soma 171). */
const IV_MINIMO_SPLUS = 20;

/** Choca o ovo: espécie com chance igual entre `especies`, shiny 5%, IVs do tier garantido ou acima. */
export function chocarOvo(ovo: Ovo, especies: number[], minimoShiny: number, aleatorio = Math.random): ResultadoOvo {
  const especie = especies[Math.floor(aleatorio() * especies.length)];
  const shiny = aleatorio() < CHANCE_SHINY_OVO;
  const minimo = Math.max(shiny ? minimoShiny : 0, ovo.tier === 'S+' ? IV_MINIMO_SPLUS : 0);
  return { especie, shiny, ivs: sortearIvs(ovo.tier ? minimoDoTier(ovo.tier) : 0, minimo, aleatorio) };
}
