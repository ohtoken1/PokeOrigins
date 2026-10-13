// Evoluções que nos jogos oficiais dependem de coisas que o PokeOrigins não tem (campo magnético, andar mil passos,
// três golpes críticos…). Regras do dono. Sem imports: só ids do Showdown e números.

/**
 * Evoluem por NÍVEL aqui (pedido do dono: nível 40). Chave = id do Showdown da forma evoluída.
 * Runerigus, Wyrdeer, Basculegion, Overqwil, Annihilape e Kingambit NÃO entram: esses evoluem com a Temporal Stone
 * (`EVOLUCOES_NOSSAS` em formasPorItem.ts).
 */
export const NIVEL_DA_EVOLUCAO_ESPECIAL: Record<string, number> = {
  mantine: 40, // Mantyke (nos jogos: com um Remoraid no time)
  probopass: 40, // Nosepass (campo magnético)
  sirfetchd: 40, // Galarian Farfetch'd (3 críticos numa batalha)
  pawmot: 40, // Pawmo (andar mil passos)
  brambleghast: 40, // Bramblin (andar mil passos)
  rabsca: 40, // Rellor (andar mil passos)
  melmetal: 50, // Meltan (400 doces no Pokémon GO); nível 50 a pedido do dono
};

/** Evoluções que o Showdown não liga (lá o Melmetal não aparece como evolução do Meltan). Id de quem evolui → nome da evolução. */
export const EVOLUCAO_SEM_LIGACAO: Record<string, string[]> = { meltan: ['Melmetal'] };

/** Condições dos jogos que aqui não valem: a evolução acontece só pelo nível oficial (Pangoro 32, Malamar 30, Goodra 50). */
export const CONDICOES_IGNORADAS = [
  'with a Dark-type in the party',
  'with the console turned upside-down',
  'during rain',
];

/** Tyrogue (nível 20): a evolução depende de Attack e Defense, como nos jogos. Condição do Showdown → comparação. */
export const CONDICOES_DE_ATRIBUTO: Record<string, (atk: number, def: number) => boolean> = {
  'with an Atk stat > its Def stat': (atk, def) => atk > def,
  'with an Atk stat < its Def stat': (atk, def) => atk < def,
  'with an Atk stat equal to its Def stat': (atk, def) => atk === def,
};

/** Sylveon: sobe de nível com amizade alta sabendo um golpe Fairy. */
export const CONDICAO_SYLVEON = 'with a Fairy-type move and two levels of Affection';
