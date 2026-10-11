// Itens NT (inegociáveis): não entram em trocas entre jogadores. Vale para as versões "(NT)" dos ovos (o id termina
// em -nt; o Pokémon que nasce também é NT) e para o que só existe como prêmio de conquista.
// Sem imports: o servidor usa este arquivo para recusar a troca.

export const SUFIXO_NT = '-nt';
/** Itens que são sempre NT (prêmios de conquistas). */
const SEMPRE_NT = new Set(['skin-galante', 'skin-chaveiro', 'skin-indianajones', 'kit-iniciante']);

export const itemInegociavel = (id: string): boolean => id.endsWith(SUFIXO_NT) || SEMPRE_NT.has(id);
