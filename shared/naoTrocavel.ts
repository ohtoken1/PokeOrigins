// Itens NT (inegociáveis): não entram em trocas entre jogadores. Vale para as versões "(NT)" dos ovos (o id termina
// em -nt; o Pokémon que nasce também é NT) e para o que só existe como prêmio de conquista.
// Sem imports: o servidor usa este arquivo para recusar a troca.

export const SUFIXO_NT = '-nt';
/** Itens que são sempre NT (prêmios de conquistas). */
const SEMPRE_NT = new Set(['skin-galante', 'skin-chaveiro', 'skin-indianajones', 'kit-iniciante', 'skin-ash', 'skin-gary', 'skin-may', 'skin-misty']);

/**
 * Id do item normal de uma versão NT ("pokeball-nt" → "pokeball"). As versões NT de Pokébolas, remédios e charms
 * (as do Kit iniciante) funcionam igual às normais; só não entram em troca nem no mercado.
 */
export const semNt = (id: string): string => (id.endsWith(SUFIXO_NT) ? id.slice(0, -SUFIXO_NT.length) : id);

// selos sazonais (selo-<evento>) são de coleção: ficam no perfil de quem ganhou
export const itemInegociavel = (id: string): boolean => id.endsWith(SUFIXO_NT) || SEMPRE_NT.has(id) || id.startsWith('selo-');
