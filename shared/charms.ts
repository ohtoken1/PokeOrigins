// Charms (pedido do dono; entraram no lugar do Shiny Charm): um por tipo. O charm é USADO pela bolsa, como uma
// poção, e por 30 minutos de relógio os Pokémon selvagens DAQUELE tipo (em qualquer uma das duas tipagens) têm
// 20% a mais de chance de ser shiny. Charms de tipos diferentes podem ficar ativos juntos; o mesmo tipo não
// acumula nem estende (o item fica travado até acabar). Sem imports.

export const TIPOS_DOS_CHARMS = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;
export type TipoCharm = (typeof TIPOS_DOS_CHARMS)[number];

/** Multiplicador da chance de shiny dos Pokémon do tipo (1,2 = +20%). */
export const MULT_CHARM = 1.2;
/** Quanto dura o bônus (30 minutos). */
export const DURACAO_CHARM_MS = 30 * 60 * 1000;

export const idCharm = (tipo: TipoCharm) => `charm-${tipo}`;
/** "Fire Charm" (nomes de itens e de tipos ficam em inglês). */
export const nomeCharm = (tipo: TipoCharm) => `${tipo[0].toUpperCase()}${tipo.slice(1)} Charm`;
/** O tipo do charm, ou null se o item não é um charm. */
export function tipoDoCharm(idItem: string): TipoCharm | null {
  const tipo = idItem.startsWith('charm-') ? idItem.slice(6) : '';
  return (TIPOS_DOS_CHARMS as readonly string[]).includes(tipo) ? (tipo as TipoCharm) : null;
}

/** O que o save guarda dos charms. */
export interface ComCharms {
  itens: Record<string, number>;
  /** tipo → quando o bônus acaba (ms) */
  charms?: Record<string, number> | null;
  /** tipos de charm já usados alguma vez (conquista "Galante") */
  charmsUsados?: string[];
}

export const charmAte = (save: Pick<ComCharms, 'charms'>, tipo: string) => save.charms?.[tipo] ?? 0;
export const charmAtivo = (save: Pick<ComCharms, 'charms'>, tipo: string, agora = Date.now()) => charmAte(save, tipo) > agora;
/** Os tipos com charm ativo agora. */
export const charmsAtivos = (save: Pick<ComCharms, 'charms'>, agora = Date.now()): TipoCharm[] => TIPOS_DOS_CHARMS.filter((t) => charmAtivo(save, t, agora));

/** Usa um charm da bolsa. Devolve '' se usou, ou o motivo de não usar. */
export function usarCharm(save: ComCharms, tipo: TipoCharm, agora = Date.now()): string {
  const id = idCharm(tipo);
  if (charmAtivo(save, tipo, agora)) return `O ${nomeCharm(tipo)} já está ativo. Espere acabar para usar outro.`;
  if ((save.itens[id] ?? 0) < 1) return `Você não tem ${nomeCharm(tipo)}.`;
  save.itens[id] -= 1;
  if (save.itens[id] <= 0) delete save.itens[id];
  // os que já acabaram saem da lista
  const ativos: Record<string, number> = {};
  for (const t of charmsAtivos(save, agora)) ativos[t] = charmAte(save, t);
  ativos[tipo] = agora + DURACAO_CHARM_MS;
  save.charms = ativos;
  if (!(save.charmsUsados ??= []).includes(tipo)) save.charmsUsados.push(tipo);
  return '';
}

/** Multiplicador de shiny por tipo, para o sorteio dos encontros (só os tipos com charm ativo). */
export function multShinyDosCharms(save: Pick<ComCharms, 'charms'>, agora = Date.now()): Record<string, number> {
  const mult: Record<string, number> = {};
  for (const t of charmsAtivos(save, agora)) mult[t] = MULT_CHARM;
  return mult;
}
