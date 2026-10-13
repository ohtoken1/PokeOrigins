// Tickets: itens raros que, ao abrir, sorteiam UM prêmio. Cada prêmio tem a sua chance (do total) e uma
// raridade (comum, raro, épico, lendário, mítico), que dá a cor na roleta. Conteúdo e porcentagens: planilha do dono
// (Tickets.xlsx). Fica em shared/ porque, no MMO, quem sorteia é o servidor.
import { Dex } from '@pkmn/sim';
import { ITENS } from './itens';
import { TIPOS_TERA } from './tera';
import { CORES_DOS_APRICORNS, TIPOS_DAS_ENERGIAS, idApricorn, idEnergia } from './materiais';
import { cubosDaEra, idSkin } from './itensCustom';

export type Raridade = 'comum' | 'raro' | 'epico' | 'passado' | 'futuro' | 'lendario' | 'mitico';

/** Nomes e ordem das raridades (as chances vêm de cada ticket). */
export const RARIDADES: { id: Raridade; nome: string }[] = [
  { id: 'comum', nome: 'Comum' },
  { id: 'raro', nome: 'Raro' },
  { id: 'epico', nome: 'Épico' },
  // só na Chave Temporal
  { id: 'passado', nome: 'Passado' },
  { id: 'futuro', nome: 'Futuro' },
  { id: 'lendario', nome: 'Lendário' },
  { id: 'mitico', nome: 'Mítico' },
];

/** Chance de ganhar um ticket (sorteado entre os existentes) ao vencer ou capturar um selvagem. */
export const CHANCE_TICKET_POR_BATALHA = 1 / 1000;

/** Grupos de "item aleatório": sorteia um item do grupo na hora de abrir (todos com a mesma chance). */
export type GrupoAleatorio = 'terashard' | 'bola' | 'placa' | 'fruta' | 'apricorn' | 'energia';

/** Um prêmio: item (id da bolsa), item aleatório de um grupo, silver, gold, dias de VIP ou Pokémon. */
export type Premio =
  | { tipo: 'item'; id: string; quantidade: number }
  | { tipo: 'aleatorio'; grupo: GrupoAleatorio; quantidade: number }
  | { tipo: 'silver'; quantidade: number }
  | { tipo: 'gold'; quantidade: number }
  | { tipo: 'vip'; dias: number }
  /** `ivMinimo`: cada IV vem entre ele e 31 (ex.: 15+) */
  | { tipo: 'pokemon'; especie: number; nivel: number; chanceShiny: number; ivMinimo: number };

/** Um pacote sai inteiro (hoje cada linha da planilha é um prêmio só). */
export type Pacote = Premio[];

/** Uma linha da planilha: raridade, chance (do total; as de um ticket somam 1) e o que sai. */
export interface LinhaPremio {
  raridade: Raridade;
  chance: number;
  pacote: Pacote;
}

export interface Ticket {
  /** id na bolsa */
  id: string;
  nome: string;
  descricao: string;
  premios: LinhaPremio[];
}

// ---------- prêmios que se repetem (planilha) ----------
const linha = (raridade: Raridade, chance: number, ...pacote: Premio[]): LinhaPremio => ({ raridade, chance, pacote });
/** Nível dos lendários dos tickets (o mesmo mínimo dos lendários selvagens). */
/** Nível 1 (pedido do dono): com o limite de nível pelo treinador, qualquer jogador pode usar o que tirou. */
const NIVEL_POKEMON_TICKET = 1;
const CHANCE_SHINY_TICKET = 0.05;
const pokemon = (especie: number, ivMinimo = 15): Premio => ({ tipo: 'pokemon', especie, nivel: NIVEL_POKEMON_TICKET, chanceShiny: CHANCE_SHINY_TICKET, ivMinimo });
const item = (id: string, quantidade = 1): Premio => ({ tipo: 'item', id, quantidade });

/** Comum (70% no total, dividido por igual entre os quatro; pedido do dono, no lugar das Tera Shards). */
const COMUM: LinhaPremio[] = [
  linha('comum', 0.175, { tipo: 'aleatorio', grupo: 'bola', quantidade: 25 }),
  linha('comum', 0.175, { tipo: 'aleatorio', grupo: 'fruta', quantidade: 20 }),
  linha('comum', 0.175, { tipo: 'aleatorio', grupo: 'apricorn', quantidade: 20 }),
  linha('comum', 0.175, { tipo: 'aleatorio', grupo: 'energia', quantidade: 20 }),
];
const RARO: LinhaPremio[] = [
  linha('raro', 0.06, { tipo: 'gold', quantidade: 20 }),
  linha('raro', 0.06, { tipo: 'vip', dias: 1 }),
  linha('raro', 0.06, { tipo: 'aleatorio', grupo: 'bola', quantidade: 50 }),
  linha('raro', 0.06, { tipo: 'silver', quantidade: 50_000 }),
];
const EPICO: LinhaPremio[] = [
  linha('epico', 0.01, { tipo: 'gold', quantidade: 50 }),
  linha('epico', 0.01, { tipo: 'vip', dias: 7 }),
  linha('epico', 0.01, item('masterball')),
  linha('epico', 0.01, { tipo: 'silver', quantidade: 100_000 }),
  linha('epico', 0.01, item('ovo-misterioso-a')),
];
/** Lendário: os prêmios dividem o total por igual (1% sem mítico: 5 → 0,2% cada; 0,9% com mítico: 3 → 0,3% cada). */
const lendarios = (premios: Premio[], total = 0.01): LinhaPremio[] => premios.map((p) => linha('lendario', total / premios.length, p));
/** Mítico (pedido do dono): a skin shiny, 0,1%; o lendário do ticket fica com 0,9%. */
const CHANCE_MITICO = 0.001;
/** Ticket padrão da planilha: comum + raro + épico iguais em todos; muda só o lendário. */
const padrao = (id: string, nome: string, descricao: string, ...lendario: Premio[]): Ticket => ({
  id,
  nome,
  descricao,
  premios: [...COMUM, ...RARO, ...EPICO, ...lendarios(lendario)],
});
/** Ticket do lendário: no lendário (0,9%) o próprio Pokémon, o item dele e a skin; no mítico (0,1%) a skin shiny. */
const deLendario = (nome: string, especie: number, itemId: string): Ticket => ({
  id: `ticket-${nome.toLowerCase()}`,
  nome: `Ticket de ${nome}`,
  descricao: `Abra para sortear um prêmio. No lendário: ${nome} (IVs 15+, 5% de chance de shiny), o item dele ou a skin. No mítico: a skin shiny.`,
  premios: [
    ...COMUM, ...RARO, ...EPICO,
    ...lendarios([pokemon(especie), item(itemId), item(idSkin(nome))], 0.01 - CHANCE_MITICO),
    linha('mitico', CHANCE_MITICO, item(idSkin(nome, true))),
  ],
});

export const TICKETS: Ticket[] = [
  deLendario('Kyogre', 382, 'blueorb'),
  deLendario('Groudon', 383, 'redorb'),
  deLendario('Giratina', 487, 'griseouscore'),
  deLendario('Hoopa', 720, 'prisonbottle'),
  deLendario('Dialga', 483, 'adamantcrystal'),
  deLendario('Palkia', 484, 'lustrousglobe'),
  {
    id: 'ticket-arceus',
    nome: 'Ticket de Arceus',
    descricao: 'Abra para sortear um prêmio. No épico: uma Plate aleatória. No lendário: Arceus (IVs 10+, 5% de chance de shiny).',
    premios: [...COMUM, ...RARO, linha('epico', 0.05, { tipo: 'aleatorio', grupo: 'placa', quantidade: 1 }), linha('lendario', 0.01, pokemon(493, 10))],
  },
  padrao('ticket-therian', 'Ticket Therian', 'Abra para sortear um prêmio. No lendário: Landorus, Thundurus, Tornadus ou Enamorus (IVs 15+, 5% de chance de shiny) ou a Reveal Glass.',
    pokemon(645), pokemon(642), pokemon(641), pokemon(905), item('revealglass')),
  deLendario('Kyurem', 646, 'dnasplicers'),
  deLendario('Zacian', 888, 'rustedsword'),
  deLendario('Zamazenta', 889, 'rustedshield'),
  padrao('ticket-ogerpon', 'Ticket de Ogerpon', 'Abra para sortear um prêmio. No lendário: Ogerpon (IVs 15+, 5% de chance de shiny) ou uma das 4 máscaras.',
    pokemon(1017), item('tealmask'), item('hearthflamemask'), item('wellspringmask'), item('cornerstonemask')),
];

/**
 * Chave Temporal (pedido do dono): funciona como um ticket, mas só dá cubos (shared/itensCustom.ts). Passado 49,5%,
 * Futuro 49,5% e Lendário 1% (Koraidon e Miraidon); dentro de cada grupo, todos com a mesma chance.
 * Fica fora de TICKETS para não cair nas batalhas (sortearTicketDaBatalha).
 */
export const CHANCES_CHAVE_TEMPORAL = { passado: 0.495, futuro: 0.495, lendario: 0.01 } as const;
const cubos = (era: keyof typeof CHANCES_CHAVE_TEMPORAL): LinhaPremio[] => {
  const ids = cubosDaEra(era);
  return ids.map((id) => linha(era, CHANCES_CHAVE_TEMPORAL[era] / ids.length, item(id)));
};
export const CHAVE_TEMPORAL: Ticket = {
  id: 'chave-temporal',
  nome: 'Chave Temporal',
  descricao: 'Use para abrir uma fenda no tempo e receber o cubo de um Pokémon do passado, do futuro ou, com muita sorte, de Koraidon ou Miraidon.',
  premios: [...cubos('passado'), ...cubos('futuro'), ...cubos('lendario')],
};

export function ticketPorId(id: string): Ticket | undefined {
  return id === CHAVE_TEMPORAL.id ? CHAVE_TEMPORAL : TICKETS.find((t) => t.id === id);
}

/** Chance total de cada raridade num ticket (soma das linhas). */
export function chancesDasRaridades(ticket: Ticket): { id: Raridade; nome: string; chance: number }[] {
  return RARIDADES.map((r) => ({ ...r, chance: ticket.premios.filter((l) => l.raridade === r.id).reduce((s, l) => s + l.chance, 0) })).filter((r) => r.chance > 0);
}

/** Itens de cada grupo aleatório. */
export function itensDoGrupo(grupo: GrupoAleatorio): string[] {
  if (grupo === 'terashard') return TIPOS_TERA.map((t) => `terashard-${t.toLowerCase()}`);
  if (grupo === 'fruta') return Dex.items.all().filter((i) => i.isBerry && !i.isNonstandard).map((i) => i.id);
  if (grupo === 'apricorn') return CORES_DOS_APRICORNS.map(idApricorn);
  if (grupo === 'energia') return TIPOS_DAS_ENERGIAS.map(idEnergia);
  if (grupo === 'bola') return Object.keys(ITENS).filter((id) => ITENS[id as keyof typeof ITENS].categoria === 'bola' && id !== 'masterball' && !id.endsWith('-nt'));
  return Dex.items.all().filter((i) => i.onPlate && !i.zMove).map((i) => i.id);
}

/** Prêmio já resolvido (item aleatório vira um item de verdade). */
export type PremioResolvido = Exclude<Premio, { tipo: 'aleatorio' }>;

export interface ResultadoTicket {
  raridade: Raridade;
  pacote: PremioResolvido[];
  /** shiny sorteado para cada prêmio de Pokémon (mesma posição do pacote) */
  shiny: boolean[];
}

/** Sorteia UMA linha pela chance dela e resolve os itens aleatórios. */
export function abrirTicket(ticket: Ticket, aleatorio = Math.random): ResultadoTicket {
  const total = ticket.premios.reduce((s, l) => s + l.chance, 0);
  let sorteio = aleatorio() * total;
  let escolhida = ticket.premios[ticket.premios.length - 1];
  for (const l of ticket.premios) {
    sorteio -= l.chance;
    if (sorteio < 0) {
      escolhida = l;
      break;
    }
  }
  const pacote = escolhida.pacote.map((p): PremioResolvido => {
    if (p.tipo !== 'aleatorio') return p;
    const lista = itensDoGrupo(p.grupo);
    return { tipo: 'item', id: lista[Math.floor(aleatorio() * lista.length)], quantidade: p.quantidade };
  });
  return { raridade: escolhida.raridade, pacote, shiny: pacote.map((p) => p.tipo === 'pokemon' && aleatorio() < p.chanceShiny) };
}

/** Sorteia qual ticket cai numa batalha (null = nenhum). */
export function sortearTicketDaBatalha(aleatorio = Math.random): Ticket | null {
  if (!TICKETS.length || aleatorio() >= CHANCE_TICKET_POR_BATALHA) return null;
  return TICKETS[Math.floor(aleatorio() * TICKETS.length)];
}
